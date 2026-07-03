import * as http from 'http';

declare const require: any;
declare const module: any;
declare const Buffer: any;

interface EventSubscriber {
    res: http.ServerResponse;
    type?: string; // 'create' | 'update' | 'delete' | undefined for all
}

/**
 * W3C WoT Exploration Directory API implementation
 * Based on https://raw.githubusercontent.com/tinyiot/thing-directory/master/apidoc/openapi-spec.yml
 * And https://w3c.github.io/wot-discovery/#exploration-directory-api-things
 *
 * Standalone implementation with REST API and SSE events
 */
export class TdDirectory {
    private store: Map<string, object> = new Map();
    private eventId = 0;
    private subscribers: EventSubscriber[] = [];
    private port: number;


    constructor(port: number = 9091) {
        this.port = port;
    }

    async startTDD(): Promise<void> {
        const server = http.createServer((req, res) => {
            if (this.handle(req, res)) {
                return;
            }

            res.writeHead(404, { 'Content-Type': 'application/problem+json' });
            res.end(JSON.stringify({
                type: 'about:blank',
                title: 'Not Found',
                status: 404,
                detail: 'Endpoint not found'
            }));
        });

        await server.listen(this.port);
        console.log(`TD Directory running at http://localhost:${this.port}/things`);
    }

    handle(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const path = url.pathname;
        const method = req.method || 'GET';

        // Enable CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }

        // Routes
        if (path === '/things' && method === 'GET') {
            return this.handleListThings(req, res, url);
        }
        if (path === '/things' && method === 'POST') {
            return this.handleCreateThing(req, res);
        }
        if (path.match(/^\/things\/[^/?]+$/) && method === 'GET') {
            return this.handleGetThing(req, res, path);
        }
        if (path.match(/^\/things\/[^/?]+$/) && method === 'HEAD') {
            return this.handleHeadThing(req, res, path);
        }
        if (path.match(/^\/things\/[^/?]+$/) && method === 'PUT') {
            return this.handleUpdateThing(req, res, path);
        }
        if (path.match(/^\/things\/[^/?]+$/) && method === 'PATCH') {
            return this.handlePatchThing(req, res, path);
        }
        if (path.match(/^\/things\/[^/?]+$/) && method === 'DELETE') {
            return this.handleDeleteThing(req, res, path);
        }
        if (path === '/events' && method === 'GET') {
            return this.handleEventsStream(req, res, url);
        }
        if (path === '/search/jsonpath' && method === 'GET') {
            return this.handleJsonPathSearch(req, res, url);
        }

        return false;
    }

    private extractId(path: string): string {
        const match = path.match(/^\/things\/(.+)$/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    private handleListThings(req: http.IncomingMessage, res: http.ServerResponse, url: URL): boolean {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 1000);
        const offset = parseInt(url.searchParams.get('offset') || '0');

        const allThings = Array.from(this.store.values());
        const total = allThings.length;
        const items = allThings.slice(offset, offset + limit);

        const body = JSON.stringify(items);
        const headers: http.OutgoingHttpHeaders = {
            'Content-Type': 'application/ld+json',
            'Content-Length': Buffer.byteLength(body)
        };

        // Pagination Link headers
        if (offset > 0) {
            const prevOffset = Math.max(0, offset - limit);
            headers['Link'] = `<${url.pathname}?limit=${limit}&offset=${prevOffset}>; rel="prev"`;
        }
        if (offset + limit < total) {
            const nextOffset = offset + limit;
            const prevLink = headers['Link'] ? headers['Link'] + ', ' : '';
            headers['Link'] = `${prevLink}<${url.pathname}?limit=${limit}&offset=${nextOffset}>; rel="next"`;
        }

        res.writeHead(200, headers);
        res.end(body);
        return true;
    }

    private handleGetThing(req: http.IncomingMessage, res: http.ServerResponse, path: string): boolean {
        const id = this.extractId(path);
        const td = this.store.get(id);

        if (!td) {
            this.sendError(res, 404, 'Not Found', `Thing not found: ${id}`);
            return true;
        }

        const body = JSON.stringify(td);
        res.writeHead(200, {
            'Content-Type': 'application/td+json',
            'Content-Length': Buffer.byteLength(body)
        });
        res.end(body);
        return true;
    }

    private handleHeadThing(req: http.IncomingMessage, res: http.ServerResponse, path: string): boolean {
        const id = this.extractId(path);
        const td = this.store.get(id);

        if (!td) {
            res.writeHead(404);
            res.end();
            return true;
        }

        const body = JSON.stringify(td);
        res.writeHead(200, {
            'Content-Type': 'application/td+json',
            'Content-Length': Buffer.byteLength(body)
        });
        res.end();
        return true;
    }

    private handleCreateThing(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        this.readBody(req, (body) => {
            try {
                const td = JSON.parse(body) as any;

                if (!td || typeof td !== 'object') {
                    this.sendError(res, 400, 'Bad Request', 'Invalid Thing Description');
                    return;
                }

                let id = td.id;
                if (!id) {
                    id = `urn:uuid:${this.generateUUID()}`;
                    td.id = id;
                }

                this.store.set(id, td);
                this.emitEvent('create', id, td);

                const responseBody = JSON.stringify(td);
                res.writeHead(201, {
                    'Content-Type': 'application/td+json',
                    'Location': `/things/${encodeURIComponent(id)}`,
                    'Content-Length': Buffer.byteLength(responseBody)
                });
                res.end(responseBody);
            } catch (error) {
                this.sendError(res, 400, 'Bad Request', error instanceof Error ? error.message : 'Invalid JSON');
            }
        });
        return true;
    }

    private handleUpdateThing(req: http.IncomingMessage, res: http.ServerResponse, path: string): boolean {
        const id = this.extractId(path);

        this.readBody(req, (body) => {
            try {
                const td = JSON.parse(body) as any;

                if (!td || typeof td !== 'object') {
                    this.sendError(res, 400, 'Bad Request', 'Invalid Thing Description');
                    return;
                }

                // Ensure ID matches
                td.id = id;
                const isNew = !this.store.has(id);
                this.store.set(id, td);

                this.emitEvent(isNew ? 'create' : 'update', id, td);

                if (isNew) {
                    const responseBody = JSON.stringify(td);
                    res.writeHead(201, {
                        'Content-Type': 'application/td+json',
                        'Location': `/things/${encodeURIComponent(id)}`,
                        'Content-Length': Buffer.byteLength(responseBody)
                    });
                    res.end(responseBody);
                } else {
                    res.writeHead(204);
                    res.end();
                }
            } catch (error) {
                this.sendError(res, 400, 'Bad Request', error instanceof Error ? error.message : 'Invalid JSON');
            }
        });
        return true;
    }

    private handlePatchThing(req: http.IncomingMessage, res: http.ServerResponse, path: string): boolean {
        const id = this.extractId(path);

        this.readBody(req, (body) => {
            try {
                const patch = JSON.parse(body) as any;
                const existing = this.store.get(id);

                if (!existing) {
                    this.sendError(res, 404, 'Not Found', `Thing not found: ${id}`);
                    return;
                }

                const merged = this.mergePatch(existing as any, patch);
                merged.id = id;
                this.store.set(id, merged);

                this.emitEvent('update', id, merged);

                res.writeHead(204);
                res.end();
            } catch (error) {
                this.sendError(res, 400, 'Bad Request', error instanceof Error ? error.message : 'Invalid JSON');
            }
        });
        return true;
    }

    private handleDeleteThing(req: http.IncomingMessage, res: http.ServerResponse, path: string): boolean {
        const id = this.extractId(path);

        if (!this.store.has(id)) {
            this.sendError(res, 404, 'Not Found', `Thing not found: ${id}`);
            return true;
        }

        this.store.delete(id);
        this.emitEvent('delete', id, { id });

        res.writeHead(204);
        res.end();
        return true;
    }

    private handleEventsStream(req: http.IncomingMessage, res: http.ServerResponse, url: URL): boolean {
        const eventType = url.searchParams.get('type');

        // SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Send initial comment to keep connection alive
        res.write(': connected\n\n');

        const subscriber: EventSubscriber = {
            res,
            type: eventType || undefined
        };

        this.subscribers.push(subscriber);

        req.on('close', () => {
            const idx = this.subscribers.indexOf(subscriber);
            if (idx > -1) {
                this.subscribers.splice(idx, 1);
            }
        });

        return true;
    }

    private handleJsonPathSearch(req: http.IncomingMessage, res: http.ServerResponse, url: URL): boolean {
        const expr = url.searchParams.get('expr');

        if (!expr) {
            this.sendError(res, 400, 'Bad Request', 'JSONPath expression required (expr parameter)');
            return true;
        }

        try {
            const results = this.searchWithJsonPath(expr);
            const body = JSON.stringify(results);

            res.writeHead(200, {
                'Content-Type': 'application/ld+json',
                'Content-Length': Buffer.byteLength(body)
            });
            res.end(body);
        } catch (error) {
            this.sendError(res, 400, 'Bad Request', error instanceof Error ? error.message : 'Invalid JSONPath');
        }

        return true;
    }

    private searchWithJsonPath(expr: string): any[] {
        // Simplified JSONPath search - supports basic paths like $.properties.*.title
        const results: any[] = [];

        if (expr === '$') {
            return Array.from(this.store.values());
        }

        for (const td of this.store.values()) {
            if (this.matchesPath(td, expr)) {
                results.push(td);
            }
        }

        return results;
    }

    private matchesPath(obj: any, expr: string): boolean {
        // Very basic JSONPath matching - extend as needed
        const parts = expr.split('.');
        let current = obj;

        for (const part of parts) {
            if (part === '$') continue;
            if (part === '*') return true;

            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return false;
            }
        }

        return true;
    }

    private emitEvent(eventType: 'create' | 'update' | 'delete', id: string, td: any): void {
        this.eventId++;

        const event = {
            id: this.eventId,
            event: eventType,
            data: {
                id,
                ...td
            }
        };

        const eventStr = `id: ${event.id}\nevent: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`;

        for (const subscriber of this.subscribers) {
            if (!subscriber.type || subscriber.type === eventType) {
                subscriber.res.write(eventStr);
            }
        }
    }

    private readBody(req: http.IncomingMessage, callback: (body: string) => void): void {
        let body = '';
        req.on('data', (chunk) => {
            body += chunk.toString();
        });
        req.on('end', () => {
            callback(body);
        });
    }

    private sendError(res: http.ServerResponse, status: number, title: string, detail: string): void {
        const body = JSON.stringify({
            type: 'about:blank',
            title,
            status,
            detail
        });

        res.writeHead(status, {
            'Content-Type': 'application/problem+json',
            'Content-Length': Buffer.byteLength(body)
        });
        res.end(body);
    }

    private mergePatch(target: any, patch: any): any {
        if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
            return patch;
        }

        const result = { ...target };
        for (const key in patch) {
            if (patch[key] === null) {
                delete result[key];
            } else {
                result[key] = this.mergePatch(result[key], patch[key]);
            }
        }
        return result;
    }

    private generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    // Direct access methods
    register(id: string, td: object): void {
        this.store.set(id, td as any);
        this.emitEvent('create', id, td);
    }

    unregister(id: string): boolean {
        const existed = this.store.delete(id);
        if (existed) {
            this.emitEvent('delete', id, { id });
        }
        return existed;
    }

    getAll(): Map<string, object> {
        return new Map(this.store);
    }

    get(id: string): object | undefined {
        return this.store.get(id);
    }
}
