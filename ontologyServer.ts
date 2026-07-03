import * as http from 'http';
import { cellPoseOntology } from './cellPoseOntology';

function writeOntologyResponse(res: http.ServerResponse, body: string, headOnly: boolean): void {

    res.writeHead(200, {
        'Content-Type': 'text/turtle; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff'
    });

    if (headOnly) {
        res.end();
        return;
    }

    res.end(body);
}

function normalizeMountPath(mountPath: string): string {
    const trimmed = mountPath.trim();
    if (!trimmed) {
        return '/ontology';
    }

    const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (prefixed === '/') {
        return '/';
    }

    return prefixed.endsWith('/') ? prefixed.slice(0, -1) : prefixed;
}

export async function hostOntology(port: number, mountPath: string = '/ontology'): Promise<{
    url: string;
    stopServer: () => Promise<void>;
    server: http.Server;
}> {
    const normalizedMountPath = normalizeMountPath(mountPath);
    const ontologyUrl = `http://localhost:${port}${normalizedMountPath === '/' ? '/' : normalizedMountPath}`;

    const server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
        const method = req.method || 'GET';

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        if (method === 'GET' || method === 'HEAD') {
            const allowedPaths = new Set([
                normalizedMountPath,
                normalizedMountPath === '/' ? '/' : `${normalizedMountPath}/`
            ]);

            if (allowedPaths.has(url.pathname)) {
                writeOntologyResponse(res, cellPoseOntology, method === 'HEAD');
                return;
            }
        }

        res.writeHead(404, {
            'Content-Type': 'text/plain; charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        });
        res.end('Ontology not found');
    });

    await new Promise<void>((resolve) => {
        server.listen(port, '0.0.0.0', () => resolve());
    });

    // console.log(`Ontology hosted at ${ontologyUrl}`);

    return {
        url: ontologyUrl,
        server,
        stopServer: () => {
            return new Promise<void>((resolve, reject) => {
                server.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }
    };
}

export function patchOntologyAnnotations(
    td: any,
    basePos: [number, number, number],
    localPoses: boolean
): void {
    const posNode = td.robotBaseFrame?.["cell:hasPose"]?.["cell:position"];
    if (posNode) {
        posNode["cell:x"] = basePos[0];
        posNode["cell:y"] = basePos[1];
        posNode["cell:z"] = basePos[2];
    }

    const ref = localPoses ? `${td.id}#base` : "cell:coppeliaSimWorld";

    for (const prop of Object.values(td.properties ?? {})) {
        const hasPose = (prop as any)["cell:hasPose"];
        if (hasPose) hasPose["cell:referenceFrame"] = ref;
    }

    for (const action of Object.values(td.actions ?? {})) {
        const hasPose = (action as any)["cell:hasPose"];
        if (hasPose) hasPose["cell:referenceFrame"] = ref;
    }
}
// No `require.main === module` CLI block: esbuild bundles this module with
// studentWrapper.ts, where the guard would also be true and run hostOntology()
// with process.argv[2] === the level arg (parseInt("level0") = NaN -> listen crash).
// hostOntology() is started from simulationServer.ts with an explicit port.