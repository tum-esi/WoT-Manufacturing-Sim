const tddirectoryUrl = "http://localhost:9091/things";


// add delay function
function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Robot base poses in world coordinates: [x, y, z (meters), qx, qy, qz, qw] ──
// Orientation defaults to the identity quaternion; both position and orientation
// are overwritten at startup by applyLivePoseFrames() reading the live scene.
export const ROBOT_BASE_POSITIONS: Record<string, [number, number, number, number, number, number, number]> = {
    uarm1: [-0.1476, +1.5487, +1.0121, 0, 0, 0, 1],   // /uarm
    uarm2: [+1.1994, +1.2737, +1.0121, 0, 0, 0, 1],   // /uarm2
    ur5: [+1.1400, +0.2400, +1.0600, 0, 0, 0, 1],   // /UR5
    camera: [+1.5670, +1.5440, +1.3475, 0, 0, 0, 1],  // /VirtualCamera
};

// ── Uarm1 waypoints in world coordinates (meters) ──────────────────
export const UARM1_WAYPOINTS = {
    cubeSpawnPoint: [-0.147, 1.314, 1.036] as [number, number, number],
    cubeSpawnPointAbove: [-0.147, 1.314, 1.120] as [number, number, number],
    conveyerStartPoint: [+0.127, 1.542, 1.097] as [number, number, number],
    conveyerStartPointAbove: [+0.127, 1.542, 1.120] as [number, number, number],
};

// ── CoppeliaSim object name → robot key mapping ────────────────────
const SIM_NAME_TO_ROBOT_KEY: Record<string, string> = {
    "/uarm": "uarm1",
    "/uarm2": "uarm2",
    "/UR5": "ur5",
};


/**
 * Convert a robot-relative position to a world-absolute position (sim units, meters).
 * relativePos + basePos = absolutePos
 */
export function toAbsolutePosition(
    relativePos: [number, number, number],
    robot: keyof typeof ROBOT_BASE_POSITIONS
): [number, number, number] {
    const base = ROBOT_BASE_POSITIONS[robot];
    if (!base) throw new Error(`Unknown robot: ${String(robot)}`);
    return [
        relativePos[0] + base[0],
        relativePos[1] + base[1],
        relativePos[2] + base[2],
    ];
}

/**
 * Convert a world-absolute position to a robot-relative position (sim units, meters).
 * absolutePos - basePos = relativePos
 */
export function toRelativePosition(
    absolutePos: [number, number, number],
    robot: keyof typeof ROBOT_BASE_POSITIONS
): [number, number, number] {
    const base = ROBOT_BASE_POSITIONS[robot];
    if (!base) throw new Error(`Unknown robot: ${String(robot)}`);
    return [
        absolutePos[0] - base[0],
        absolutePos[1] - base[1],
        absolutePos[2] - base[2],
    ];
}

export enum DistanceUnits {
    METER = "meter",
    CENTIMETER = "centimeter",
    MILLIMETER = "millimeter"
    //INCH = "inch",
    //FOOT = "foot"
}

export let defaultDistanceUnit: DistanceUnits | "random" = "random"; // default unit if randomUnits is false

// Setter to change the module's defaultUnit from other modules
export function setDefaultUnit(u: DistanceUnits | "random") {
    defaultDistanceUnit = u;
}

export let defaultRotationUnit: RotationUnits | "random" = "random"; // default rotation unit if randomUnits is false
export function setDefaultRotationUnit(u: RotationUnits | "random") {
    defaultRotationUnit = u;
}

export class distanceUnitTranslator {
    // translate between semantically used unit and coppelasim unit (always millimeter)
    // variable
    public readonly targetUnit: DistanceUnits;

    constructor(unit: DistanceUnits | null = null) {
        if (unit == null) {
            this.targetUnit = this.chooseRandomUnit();
        } else {
            this.targetUnit = unit;
        }
    };

    chooseRandomUnit(): DistanceUnits {
        if (defaultDistanceUnit != "random") {
            return defaultDistanceUnit;
        }
        let units = Object.values(DistanceUnits);
        let randomIndex = Math.floor(Math.random() * units.length);
        return units[randomIndex];
    }

    translateToSimUnit(value: number): number {
        // Goal: Convert User Unit -> Meters (Sim Unit)
        switch (this.targetUnit) {
            case DistanceUnits.METER:
                return value; // Already meters
            case DistanceUnits.CENTIMETER:
                return value / 100; // 100 cm = 1 m
            case DistanceUnits.MILLIMETER:
                return value / 1000; // 1000 mm = 1 m
            /*case DistanceUnits.INCH:
                return value * 0.0254; // 1 inch = 0.0254 m
            case DistanceUnits.FOOT:
                return value * 0.3048; // 1 foot = 0.3048 m*/
            default:
                throw new Error("Unsupported unit");
        }
    }

    translateFromSimUnit(value: number): number {
        // Goal: Convert Meters (Sim Unit) -> User Unit
        switch (this.targetUnit) {
            case DistanceUnits.METER:
                return value;
            case DistanceUnits.CENTIMETER:
                return value * 100;
            case DistanceUnits.MILLIMETER:
                return value * 1000;
            /*case DistanceUnits.INCH:
                return value / 0.0254;
            case DistanceUnits.FOOT:
                return value / 0.3048;*/
            default:
                throw new Error("Unsupported unit");
        }
    }
}


export enum RotationUnits {
    DEGREE = "degree",      // Euler angles in degrees
    RADIAN = "radian",      // Euler angles in radians
}

// Type definitions for input/output arrays
export type Position = [number, number, number];
export type PoseEuler = [number, number, number, number, number, number];
export type PoseQuat = [number, number, number, number, number, number, number];
export type SupportedPose = Position | PoseEuler | PoseQuat;


export class PoseTranslator extends distanceUnitTranslator {
    public readonly rotationUnit: RotationUnits;

    constructor(distUnit: DistanceUnits | null = null, rotUnit: RotationUnits | null = null) {
        super(distUnit as unknown as DistanceUnits);
        if (rotUnit == null) {
            this.rotationUnit = this.chooseRandomRotationUnit();
        } else {
            this.rotationUnit = rotUnit;
        }
    }

    chooseRandomRotationUnit(): RotationUnits {
        if (defaultRotationUnit != "random") {
            return defaultRotationUnit;
        }
        let units = Object.values(RotationUnits);
        let randomIndex = Math.floor(Math.random() * units.length);
        return units[randomIndex];
    }

    /**
     * WRITE: Converts user input -> Sim format
     * Sim (sim.moveToPose) typically EXPECTS Quaternions [x, y, z, qx, qy, qz, qw]
     */
    toSimPose(input: SupportedPose): PoseQuat {
        const x = this.translateToSimUnit(input[0]);
        const y = this.translateToSimUnit(input[1]);
        const z = this.translateToSimUnit(input[2]);

        let qx = 0, qy = 0, qz = 0, qw = 1;

        if (input.length === 6) {
            // Input: User Euler [rx, ry, rz]
            // eulerToQuaternion handles the User Unit -> Rad conversion
            [qx, qy, qz, qw] = this.eulerToQuaternion(input[3], input[4], input[5]);

        } else if (input.length === 7) {
            // Input: Quaternion
            qx = input[3]; qy = input[4]; qz = input[5]; qw = input[6];
        }

        return [x, y, z, qx, qy, qz, qw];
    }

    /**
     * READ: Converts Sim format -> User format
     * Handles BOTH Length 6 (Euler Rads from getCurrentPose) AND Length 7 (Quats)
     */
    fromSimPose(simPose: PoseQuat): SupportedPose {
        // We know simPose is always length 7 (Quaternion) now.
        const x = this.translateFromSimUnit(simPose[0]);
        const y = this.translateFromSimUnit(simPose[1]);
        const z = this.translateFromSimUnit(simPose[2]);

        const qx = simPose[3];
        const qy = simPose[4];
        const qz = simPose[5];
        const qw = simPose[6];


        // Convert Quat -> Euler
        const [roll, pitch, yaw] = this.quaternionToEuler(qx, qy, qz, qw);

        if (this.rotationUnit === RotationUnits.DEGREE) {
            return [
                x, y, z,
                roll * (180 / Math.PI),
                pitch * (180 / Math.PI),
                yaw * (180 / Math.PI)
            ];
        } else {
            return [x, y, z, roll, pitch, yaw];
        }

    }

    // --- Helpers ---

    /**
     * Helper: Converts RAW RADIANS to Quaternion.
     * Use this when input is definitely Radians (e.g. from Sim), ignoring 'this.rotationUnit'.
     */
    private radiansToQuaternion(roll: number, pitch: number, yaw: number): [number, number, number, number] {
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);

        const qw = cr * cp * cy + sr * sp * sy;
        const qx = sr * cp * cy - cr * sp * sy;
        const qy = cr * sp * cy + sr * cp * sy;
        const qz = cr * cp * sy - sr * sp * cy;

        return [qx, qy, qz, qw];
    }

    // Converts User Units (Deg/Rad) -> Quaternion
    private eulerToQuaternion(rX: number, rY: number, rZ: number): [number, number, number, number] {
        let roll = rX, pitch = rY, yaw = rZ;

        // If user is giving DEGREES, convert to Rad first
        if (this.rotationUnit === RotationUnits.DEGREE) {
            roll = rX * (Math.PI / 180);
            pitch = rY * (Math.PI / 180);
            yaw = rZ * (Math.PI / 180);
        }

        return this.radiansToQuaternion(roll, pitch, yaw);
    }

    private quaternionToEuler(qx: number, qy: number, qz: number, qw: number): [number, number, number] {
        // roll (x-axis rotation)
        const sinr_cosp = 2 * (qw * qx + qy * qz);
        const cosr_cosp = 1 - 2 * (qx * qx + qy * qy);
        const roll = Math.atan2(sinr_cosp, cosr_cosp);

        // pitch (y-axis rotation)
        const sinp = 2 * (qw * qy - qz * qx);
        let pitch = 0;

        // CHECK FOR GIMBAL LOCK (Singularity at +/- 90 degrees)
        if (Math.abs(sinp) >= 1) {
            // We are at +/- 90 degrees.
            // Pitch is set to +/- PI/2
            pitch = (Math.PI / 2) * Math.sign(sinp);
        } else {
            pitch = Math.asin(sinp);
        }

        // yaw (z-axis rotation)
        const siny_cosp = 2 * (qw * qz + qx * qy);
        const cosy_cosp = 1 - 2 * (qy * qy + qz * qz);
        const yaw = Math.atan2(siny_cosp, cosy_cosp);

        return [roll, pitch, yaw];
    }
}



interface tdJSON {
    id: string;
    title: string;
    [key: string]: any;
}

export class virtualSemanticThing {
    distUnit: DistanceUnits | null;
    rotUnit: RotationUnits | null;
    distanceUnitTranslator: distanceUnitTranslator;
    poseTranslator: PoseTranslator;

    td: object;
    woT: typeof globalThis.WoT;
    thing: WoT.ExposedThing | null = null;
    tddirectoryUrl: string | null = null;
    status: string = "operational";

    constructor(
        woT: typeof globalThis.WoT,
        td: tdJSON = { id: "", title: "" },
        distUnit: DistanceUnits | null = null,
        rotUnit: RotationUnits | null = null
    ) {
        this.tddirectoryUrl = tddirectoryUrl;
        // Initialize translators
        // We map supportedUnits (general) to DistanceUnits (specific) for compatibility
        this.distanceUnitTranslator = new distanceUnitTranslator(distUnit);
        this.distUnit = this.distanceUnitTranslator.targetUnit;
        // make sure that the pose translator uses the same distance unit
        this.poseTranslator = new PoseTranslator(this.distUnit, rotUnit);
        this.rotUnit = this.poseTranslator.rotationUnit;
        this.woT = woT;

        // update TD with unit information
        if (this.distUnit != null || this.rotUnit != null) {
            this.td = this.#updateTDWithUnits(td);
        } else {
            this.td = td;
        }
    }

    async produce() {
        this.thing = await this.woT.produce(this.td);
        this.setCustomIAHandlers();
        this.thing?.setPropertyReadHandler("status", async () => this.status);
        await this.expose();
        await this.#registerAtTDDirectory();
        return
    }

    async expose() {
        // expose and log
        await this.thing?.expose();
    }

    async #registerAtTDDirectory() {
        if (!this.thing) {
            console.error("Cannot register TD: thing not produced yet");
            return;
        }
        if (!this.tddirectoryUrl) {
            console.warn("TD Directory URL not set; skipping registration");
            return;
        }

        // console.info(this.thing.getThingDescription().title + " ready");

        const td = this.thing.getThingDescription();
        const thingTitle = td.title;

        // construct registration URL from provided directory base
        const thingId = encodeURIComponent(td.id ?? td.title);
        const registrationURL = `${this.tddirectoryUrl}/${thingId}`;

        // console.info(`[WOT] Thing '${thingTitle}' erfolgreich exponiert.`);

        try {
            const response = await fetch(registrationURL, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(td)
            });

            if (response.ok || response.status === 201) {
                // console.info(`[TD_REG] Thing erfolgreich im Directory registriert.`);
            } else {
                console.error(`[TD_REG] Fehler bei Registrierung: ${response.status} ${response.statusText}`);
                const errorBody = await response.text();
                console.error(`[TD_REG] Server-Antwort: ${errorBody.substring(0, 200)}...`);
            }
        } catch (e) {
            console.error(`[TD_REG] Kommunikationsfehler zum Directory (${registrationURL}): ${(e as Error).message}`);
        }
    }

    setCustomIAHandlers() {
        console.log("No Custom IA Handlers set");
    }

    #updateTDWithUnits(td: object): object {
        // Recursively traverse the TD object and set/overwrite unit fields
        const setUnits = (obj: any) => {
            if (obj === null || obj === undefined) return;
            if (Array.isArray(obj)) {
                for (const item of obj) setUnits(item);
                return;
            }
            if (typeof obj !== 'object') return;

            // If this object explicitly contains a 'unit' field, overwrite it
            if (Object.prototype.hasOwnProperty.call(obj, 'unit')) {
                if (Object.values(DistanceUnits).includes(obj.unit)) {
                    obj.unit = this.distUnit;
                } else if (Object.values(RotationUnits).includes(obj.unit)) {
                    obj.unit = this.rotUnit;
                }
            }

            // If this looks like a JSON Schema for a numeric property, ensure it has the unit
            if (Object.prototype.hasOwnProperty.call(obj, 'type')) {
                const t = obj.type;
                // if (t === 'number' || t === 'integer') {
                //     obj.unit = this.distUnit;
                // } else 
                if (t === 'array' && obj.items) {
                    setUnits(obj.items);
                }
            }

            // Common TD structures: properties, data (events/actions), items
            if (Object.prototype.hasOwnProperty.call(obj, 'properties') && typeof obj.properties === 'object') {
                for (const key of Object.keys(obj.properties)) {
                    setUnits(obj.properties[key]);
                }
            }

            if (Object.prototype.hasOwnProperty.call(obj, 'data')) {
                setUnits(obj.data);
            }

            if (Object.prototype.hasOwnProperty.call(obj, 'items')) {
                setUnits(obj.items);
            }

            // Recurse into other child objects to catch nested schemas
            for (const key of Object.keys(obj)) {
                if (key === 'properties' || key === 'data' || key === 'items' || key === 'unit' || key === 'type') continue;
                setUnits(obj[key]);
            }
        };

        // Work on a shallow clone to avoid unexpected external mutations
        try {
            const cloned = JSON.parse(JSON.stringify(td));
            setUnits(cloned);
            return cloned;
        } catch (e) {
            // If cloning fails just attempt to modify in-place
            setUnits(td as any);
            return td;
        }
    }

}

//sensor
export class virtualSemanticSensor extends virtualSemanticThing {
    // variable
    name: String;
    sim: any;
    sensorHandle: Number;
    detectionRate: number = 100; // in ms
    sensorType: "infrared" | "proximity" | "color";
    constructor(woT: typeof globalThis.WoT, s: any, objectName: String, td: tdJSON, sensorType: "infrared" | "proximity" | "color", unit: DistanceUnits | null = null) {
        super(woT, td, unit);
        this.name = objectName;
        this.sim = s;
        this.sensorHandle = 0;
        this.sensorType = sensorType;
    }

    async pollSensorState(): Promise<void> {
        let lastState: boolean = await this.objectDetect();
        setInterval(async () => {
            let currentState = await this.objectDetect();
            if (currentState != lastState) {
                this.thing?.emitPropertyChange("objectPresence");
                lastState = currentState;
            }
        }, this.detectionRate);
    }


    // WoT functions
    async setCustomIAHandlers() {

        //if sensor is not a color sensor, set read handler for object presence
        this.thing?.setPropertyReadHandler("objectPresence", async () => await (this.objectDetect()))
        this.pollSensorState().catch((error) => {
            console.error(`Error in pollSensorState [sensor: ${this.name}]:`, error);
        });

        // if sensor is a color sensor, set read handler for color
        if (this.sensorType == "color") {
            this.thing?.setPropertyReadHandler("color", async () => await (this.getObjectcolor()))
        }

        if (this.sensorType == "proximity") {
            this.thing?.setPropertyReadHandler("objectDistance", async () => {

                // 1. Die reine Distanzmessung durchführen
                const distanceValue = await this.objectDistance();

                // 2. Die statische Einheit dynamisch aus der TD holen (Metadaten-Zugriff)
                const unit = this.thing?.getThingDescription()?.properties?.objectDistance?.unit;

                // Fallback für den Fall, dass die TD fehlerhaft ist
                if (!unit) {
                    console.warn("WARN: Einheit 'unit' fehlt in der TD-Definition.");
                }

                // 3. Ein Objekt zurückgeben, das das TD-Schema (Type object mit value/unit) erfüllt
                return distanceValue
            });
        }
    }


    // Helper functions
    async getSensorState() {
        this.sensorHandle = Number(await this.sim.getObject(this.name));
        return await (this.sim.handleProximitySensor(this.sensorHandle));
    }
    // detect if it exists object
    async objectDetect(): Promise<boolean> {

        this.sensorHandle = Number(await this.sim.getObject(this.name));
        let sensorInfo = await (this.sim.readProximitySensor(this.sensorHandle));

        if (sensorInfo[0] == 0) {
            return false;
        }
        else if (sensorInfo[0] == 1) {
            return true;
        }
        else {
            return false;
        }

    }

    // detect if it exists object
    async objectDistance(): Promise<number> {
        this.sensorHandle = Number(await this.sim.getObject(this.name));

        const [result, detectionState, detectedPoint, detectedObjectHandle, normalVector] =
            await this.sim.readProximitySensor(this.sensorHandle);

        let distance = Number(detectedPoint[2].toFixed(3));
        let translatedDistance = this.distanceUnitTranslator.translateFromSimUnit(distance);

        return translatedDistance;

    }

    async getObjectcolor(): Promise<number[]> {

        this.sensorHandle = Number(await this.sim.getObject(this.name));
        let sensorInfo = await (this.sim.readProximitySensor(this.sensorHandle));
        let detectObjecthandle = sensorInfo[3];
        let colorInfo;
        if (detectObjecthandle != -1) {
            colorInfo = await (this.sim.getObjectColor(detectObjecthandle, 0, await this.sim.colorcomponent_ambient_diffuse))
            let colorRGB = [colorInfo[0][0] * 255, colorInfo[0][1] * 255, colorInfo[0][2] * 255];
            return colorRGB;
        }
        else {
            return [0, 0, 0];
        }
    }
}

// uarm
export class virtualSemanticUarm extends virtualSemanticThing {
    // variable
    name: String;
    sim: any;
    uarmHandle: Number;
    scriptHandle: Number;
    previousPos: Number[];
    private localPoses: boolean;

    constructor(
        woT: typeof globalThis.WoT,
        s: any,
        objectName: string,
        td: tdJSON,
        distUnit: DistanceUnits | null = null,
        rotUnit: RotationUnits | null = null,
        localPoses: boolean = false
    ) {
        super(woT, td, distUnit, rotUnit);
        this.name = objectName;
        this.sim = s;
        this.uarmHandle = 0;
        this.scriptHandle = 0;
        this.previousPos = [0, 0, 0];
        this.localPoses = localPoses;
    }

    async setCustomIAHandlers() {
        // 1. Action: Go To Position
        // Input: User Units (e.g. [500, 0, 200, 180, 0, 0])
        // Action: Convert to Sim Units -> Call Lua -> Wait
        this.thing?.setActionHandler("goTo", async (data) => {

            let pos: any = await data.value();
            const frame = pos.coordinateFrame;
            delete pos.coordinateFrame;
            let poseAsArray = Object.values(pos) as number[];
            // Step 1: Convert user units to sim units (meters)
            let translatedPose = this.poseTranslator.toSimPose(poseAsArray as SupportedPose);
            // Step 2: add robot base offset when localPoses or explicit relative frame
            if (frame === "relative" || this.localPoses) {
                const key = SIM_NAME_TO_ROBOT_KEY[this.name as string];
                if (key) {
                    const abs = toAbsolutePosition([translatedPose[0], translatedPose[1], translatedPose[2]], key);
                    translatedPose[0] = abs[0]; translatedPose[1] = abs[1]; translatedPose[2] = abs[2];
                }
            }

            try {
                let result = await this.goToPosition(translatedPose);
                console.log("GoTo Action Result: " + result);
                return result;
            } catch (error) {
                console.error("Error in goTo action:", error);
                return "Failure";
            }
        });

        // 3. Action: Gripper Control
        this.thing?.setActionHandler("gripOpen", async () => {
            await this.setGripperstate(false);
            return "Opened";
        });

        this.thing?.setActionHandler("gripClose", async () => {
            await this.setGripperstate(true);
            return "Closed";
        });

        this.thing?.setPropertyReadHandler("currentPosition", async () => {
            const nestedArray = await this.getCurrentPosFromSim();
            const posArray: number[] = nestedArray[0];

            if (this.localPoses) {
                const key = SIM_NAME_TO_ROBOT_KEY[this.name as string];
                if (key) {
                    const rel = toRelativePosition([posArray[0], posArray[1], posArray[2]], key);
                    posArray[0] = rel[0]; posArray[1] = rel[1]; posArray[2] = rel[2];
                }
            }

            const translatedPos = posArray.map(coord => this.distanceUnitTranslator.translateFromSimUnit(coord));
            if (!translatedPos || translatedPos.length < 3) {
                throw new Error("Simulationsdaten sind nicht im erwarteten Format [[x, y, z]].");
            }
            return { x: translatedPos[0], y: translatedPos[1], z: translatedPos[2] };
        });

        this.thing?.setPropertyReadHandler("coordinateFrame", async () =>
            this.localPoses ? "local" : "world"
        );
    }

    posParse(realPos: number[]) {
        let z = realPos[2];
        let x = realPos[0];
        let y = realPos[1];

        let finalPos = [x, y, z];

        return finalPos;

    }
    // --- Helper Methods ---

    /**
     * Sends the command to CoppeliaSim. 
     * Expects simPose to be [x, y, z, qx, qy, qz, qw] in Meters.
     */
    async goToPosition(pos: Number[]): Promise<string> {
        this.uarmHandle = Number(await this.sim.getObject(this.name));
        this.scriptHandle = Number(await this.sim.getScript(1, this.uarmHandle, this.name));

        // Call Lua: moveToPosition
        let result = await this.sim.callScriptFunction("goTo", this.scriptHandle, pos);

        this.previousPos = pos;
        return result[0];
    }

    async goWithspeed(pos: number[], speed: number): Promise<string> {
        this.uarmHandle = Number(await this.sim.getObject(this.name));
        this.scriptHandle = Number(await this.sim.getScript(1, this.uarmHandle, this.name));

        let finalPos = this.posParse(pos);

        let result = await this.sim.callScriptFunction("goWithspeed", this.scriptHandle, finalPos, speed); //this is non-blocking function

        this.previousPos = pos;

        return result;

    }

    async computeAnglefromPosition(pos: Number[]) {
        this.uarmHandle = Number(await this.sim.getObject(this.name));
        this.scriptHandle = Number(await this.sim.getScript(1, this.uarmHandle, this.name));

        let angles = await (this.sim.callScriptFunction("computeAnglesFromGripperPosition", this.scriptHandle, pos, -0.062, -0.01));

        return [angles[0][0], angles[0][1], angles[0][2], angles[0][3]];
    }

    // open or close gripper
    async setGripperstate(state: boolean) {
        this.uarmHandle = Number(await this.sim.getObject(this.name));
        this.scriptHandle = Number(await this.sim.getScript(1, this.uarmHandle, this.name));

        await this.sim.callScriptFunction("enableGripper", this.scriptHandle, state);
        await delay(1000);
    }

    async getCurrentPosFromSim() {
        this.uarmHandle = Number(await this.sim.getObject(this.name));
        this.scriptHandle = Number(await this.sim.getScript(1, this.uarmHandle, this.name));

        let currentPosition = await this.sim.callScriptFunction("getCurpos", this.scriptHandle);
        return currentPosition;
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// simple uarm
export class virtualSemanticUarmOne extends virtualSemanticUarm {
    private homePosition: number[] | null = null;
    private cubeSpawnPoint: number[];
    private cubeSpawnPointAbove: number[];
    private conveyerStartPoint: number[];
    private conveyerStartPointAbove: number[];

    constructor(
        woT: typeof globalThis.WoT,
        s: any,
        objectName: string,
        td: tdJSON,
        cubeSpawnPoint: number[],
        cubeSpawnPointAbove: number[],
        conveyerStartPoint: number[],
        conveyerStartPointAbove: number[],
        distUnit: DistanceUnits | null = null,
        rotUnit: RotationUnits | null = null
    ) {
        super(woT, s, objectName, td, distUnit, rotUnit);
        this.cubeSpawnPoint = cubeSpawnPoint;
        this.cubeSpawnPointAbove = cubeSpawnPointAbove;
        this.conveyerStartPoint = conveyerStartPoint;
        this.conveyerStartPointAbove = conveyerStartPointAbove;
    }

    async setCustomIAHandlers() {
        // Capture initial position as home position
        try {
            const nestedArray = await this.getCurrentPosFromSim();
            this.homePosition = nestedArray[0];
        } catch (error) {
            console.error("Could not capture home position for simple uarm:", error);
        }

        this.thing?.setPropertyReadHandler("currentPosition", async () => {
            const nestedArray = await this.getCurrentPosFromSim();
            const posArray: number[] = nestedArray[0];
            const translatedPos = posArray.map(coord => this.distanceUnitTranslator.translateFromSimUnit(coord));
            return {
                x: translatedPos[0],
                y: translatedPos[1],
                z: translatedPos[2]
            };
        });

        // 1. Action: moveCube
        this.thing?.setActionHandler("moveCube", async () => {
            try {
                console.log(`${this.thing?.getThingDescription().title || "uarm"}: Starting moveCube sequence...`);

                // Convert from meters to the instance's dynamic unit
                const cubeSpawn = this.cubeSpawnPoint.map(v => this.distanceUnitTranslator.translateFromSimUnit(v));
                const cubeSpawnAbove = this.cubeSpawnPointAbove.map(v => this.distanceUnitTranslator.translateFromSimUnit(v));
                const conveyerStart = this.conveyerStartPoint.map(v => this.distanceUnitTranslator.translateFromSimUnit(v));
                const conveyerStartAbove = this.conveyerStartPointAbove.map(v => this.distanceUnitTranslator.translateFromSimUnit(v));

                // Helper to translate coordinates
                const toSimPose = (pt: number[]) => this.poseTranslator.toSimPose(pt as any);

                console.log("Opening gripper");
                await this.setGripperstate(false); // gripOpen
                await delay(2000);

                console.log("Moving to cubeSpawnPoint");
                await this.goToPosition(toSimPose(cubeSpawn));
                await delay(4000);

                console.log("Picking up cube");
                await this.setGripperstate(true); // gripClose
                await delay(1000);

                console.log("Moving to cubeSpawnPointAbove");
                await this.goToPosition(toSimPose(cubeSpawnAbove));
                await delay(3000);

                console.log("Moving to conveyerStartPointAbove");
                await this.goToPosition(toSimPose(conveyerStartAbove));
                await delay(8000);

                console.log("Moving to conveyerStartPoint");
                await this.goToPosition(toSimPose(conveyerStart));
                await delay(2000);

                console.log("Dropping cube");
                await this.setGripperstate(false); // gripOpen
                await delay(1000);

                console.log("Moving to conveyerStartPointAbove");
                await this.goToPosition(toSimPose(conveyerStartAbove));
                await delay(2000);

                console.log("Moving to cubeSpawnPointAbove");
                await this.goToPosition(toSimPose(cubeSpawnAbove));
                await delay(8000);

                console.log("Sequence finished successfully.");
                return "Success";
            } catch (error) {
                console.error("moveCube Error:", error);
                return "Failure";
            }
        });

        // 2. Action: reset
        this.thing?.setActionHandler("reset", async () => {
            try {
                await this.setGripperstate(false);
                if (this.homePosition) {
                    await this.goToPosition(this.homePosition);
                } else {
                    const simHome = this.cubeSpawnPointAbove.map(v => this.distanceUnitTranslator.translateFromSimUnit(v));
                    await this.goToPosition(this.poseTranslator.toSimPose(simHome as any));
                }
                return "Success";
            } catch (error) {
                console.error("Error in reset action:", error);
                return "Failure";
            }
        });
    }
}

// ur3
export class virtualSemanticUR3 extends virtualSemanticThing {
    name: string;
    sim: any;
    ur3Handle: number;
    scriptHandle: number;
    previousPos: number[]; // Store as number[], not Number[]
    readonly openingSignalName: string = `signal.RG2_open`;  // must match the name in the lua script, 0 for close, 1 for open
    private localPoses: boolean;

    constructor(
        woT: typeof globalThis.WoT,
        s: any,
        objectName: string,
        td: tdJSON,
        distUnit: DistanceUnits | null = null,
        rotUnit: RotationUnits | null = null,
        localPoses: boolean = false
    ) {
        super(woT, td, distUnit, rotUnit);
        this.name = objectName;
        this.sim = s;
        this.ur3Handle = 0;
        this.scriptHandle = 0;
        this.previousPos = [0, 0, 0];
        this.localPoses = localPoses;
    }

    async setCustomIAHandlers() {
        // 1. Action: Go To Position
        // Input: User Units (e.g. [500, 0, 200, 180, 0, 0])
        // Action: Convert to Sim Units -> Call Lua -> Wait
        this.thing?.setActionHandler("goToPosition", async (data) => {

            let pos: any = await data.value();
            const frame = pos.coordinateFrame;
            delete pos.coordinateFrame;
            let poseAsArray = Object.values(pos) as number[];
            // Step 1: Convert user units to sim units (meters)
            let translatedPose = this.poseTranslator.toSimPose(poseAsArray as SupportedPose);
            // Step 2: add robot base offset when localPoses or explicit relative frame
            if (frame === "relative" || this.localPoses) {
                const key = SIM_NAME_TO_ROBOT_KEY[this.name as string];
                if (key) {
                    const abs = toAbsolutePosition([translatedPose[0], translatedPose[1], translatedPose[2]], key);
                    translatedPose[0] = abs[0]; translatedPose[1] = abs[1]; translatedPose[2] = abs[2];
                }
            }
            // Execute
            await this.goToPosition(translatedPose);
            return undefined;
        });

        // 2. Property: Current Pose
        this.thing?.setPropertyReadHandler("currentPose", async () => {
            const rawSimPose = await this.getCurrentPoseFromSim();

            if (this.localPoses) {
                const key = SIM_NAME_TO_ROBOT_KEY[this.name as string];
                if (key) {
                    const rel = toRelativePosition([rawSimPose[0], rawSimPose[1], rawSimPose[2]], key);
                    rawSimPose[0] = rel[0]; rawSimPose[1] = rel[1]; rawSimPose[2] = rel[2];
                }
            }

            let converted = this.poseTranslator.fromSimPose(rawSimPose);
            return {
                x: converted[0], y: converted[1], z: converted[2],
                rx: converted[3], ry: converted[4], rz: converted[5]
            };
        });

        this.thing?.setPropertyReadHandler("coordinateFrame", async () =>
            this.localPoses ? "local" : "world"
        );

        // 3. Action: Gripper Control
        this.thing?.setActionHandler("openGripper", async () => {
            await this.openGripper();
            return undefined;
        });

        this.thing?.setActionHandler("closeGripper", async () => {
            await this.closeGripper();
            return undefined;
        });
    }

    // --- Helper Methods ---

    /**
     * Sends the command to CoppeliaSim. 
     * Expects simPose to be [x, y, z, qx, qy, qz, qw] in Meters.
     */
    async goToPosition(simPose: PoseQuat): Promise<string> {
        const scriptObjPath = `${this.name}/script`;
        const scriptObjHandle = Number(await this.sim.getObject(scriptObjPath));
        this.scriptHandle = Number(await this.sim.getScript(1, scriptObjHandle));

        await this.sim.callScriptFunction("moveToPosition", this.scriptHandle, simPose);

        await this.delay(100);
        let isMoving = true;
        while (isMoving) {
            const result = await this.sim.callScriptFunction("isRobotMoving", this.scriptHandle);
            if (Array.isArray(result)) isMoving = Boolean(result[0]);
            else isMoving = Boolean(result);
            if (isMoving) await this.delay(100);
        }
        return "success";
    }

    async getCurrentPoseFromSim(): Promise<PoseQuat> {
        console.log("Getting current pose from sim...");

        // The script is a standalone object at /UR5_2/script — get IT, not the robot root
        const scriptObjPath = `${this.name}/script`;
        const scriptObjHandle = Number(await this.sim.getObject(scriptObjPath));
        this.scriptHandle = Number(await this.sim.getScript(1, scriptObjHandle));

        console.log(`Script object handle: ${scriptObjHandle}, script handle: ${this.scriptHandle}`);

        const result = await this.sim.callScriptFunction("getCurrentPose", this.scriptHandle);

        // Unwrap result if necessary
        const poseData = (Array.isArray(result[0])) ? result[0] : result;
        return poseData as PoseQuat;
    }

    async closeGripper(): Promise<void> {
        // const sig = this.gripperSignalName();
        // await this.sim.setInt32Signal(sig, 1);  // this works for version <= 4.7
        await this.sim.setIntProperty(this.sim.handle_scene, this.openingSignalName, 0);  // for version >= 4.9
    }

    async openGripper(): Promise<void> {
        // const sig = this.gripperSignalName();
        // await this.sim.setInt32Signal(sig, 0); // this works for version <= 4.7
        await this.sim.setIntProperty(this.sim.handle_scene, this.openingSignalName, 1); // for version >= 4.9
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export class virtualLight extends virtualSemanticThing {
    // variable
    lightHandle: Number;
    lightAddress: String;
    lightState: Number;
    specularPart: Number[];
    diffusePart: Number[];
    sim: any;
    // constructor
    constructor(woT: typeof globalThis.WoT, s: any, address: String, td: tdJSON) {
        super(woT, td, null);
        this.sim = s;
        this.lightHandle = 0;
        this.lightAddress = address;
        this.lightState = 1;
        this.specularPart = [0, 0, 0];
        this.diffusePart = [0, 0, 1];
    }

    async setCustomIAHandlers() {
        // property lightState
        this.thing?.setPropertyReadHandler("lightState", async () => await this.getLightstate());
        this.thing?.setPropertyWriteHandler("lightState", async (intOutput) => {
            try {
                let state = await intOutput.value();
                await this.setLightstate(Boolean(state));
                //return ;   
            }
            catch {
                console.log("failed");
                //return ;         
            }
        });
        // property lightColor
        this.thing?.setPropertyReadHandler("lightColor", async () => (await (this.getLightinfo()))[2]);
        this.thing?.setPropertyWriteHandler("lightColor", async (intOutput) => {
            try {
                let color: any = await intOutput.value();
                await this.setLightcolor(color);
                //return ;   
            }
            catch {
                console.log("failed");
                //return ;         
            }
        });
    }

    async getLightinfo() {
        // get light handle
        this.lightHandle = Number(await this.sim.getObject(this.lightAddress));

        let info = await this.sim.getLightParameters(this.lightHandle);

        return info;
    }
    async getLightstate(): Promise<any> {
        // get light handle
        this.lightHandle = Number(await this.sim.getObject(this.lightAddress));

        let info = await this.sim.getLightParameters(this.lightHandle);
        let lightState = info[0];

        if (lightState == 0) {
            return false;
        }
        else {
            return true;
        }

    }
    // set light open or close
    async setLightstate(state: boolean) {
        // get light handle
        this.lightHandle = Number(await this.sim.getObject(this.lightAddress));

        if (state == true) {
            this.lightState = 1;
        }
        else {
            this.lightState = 0;
        }
        await this.sim.setLightParameters(this.lightHandle, this.lightState, [0, 0, 0], this.diffusePart, this.specularPart);
    }
    // set light color based on rgb (value must in 0-255)
    async setLightcolor(color: number[]) {
        // get light handle
        this.lightHandle = Number(await this.sim.getObject(this.lightAddress));

        this.diffusePart = color;
        await this.sim.setLightParameters(this.lightHandle, this.lightState, [0, 0, 0], this.diffusePart, this.specularPart);

    }

}

export class virtualConveyor extends virtualSemanticThing {
    name: String;
    sim: any;
    conveyorHandle: Number;
    private forwardSpeed: number;
    private backwardSpeed: number;
    private broken: boolean;

    constructor(woT: typeof globalThis.WoT, s: any, objectName: String, td: tdJSON, randomDirection: boolean = false, broken: boolean = false) {
        super(woT, td, null);
        this.name = objectName;
        this.sim = s;
        this.conveyorHandle = 0;
        // randomDirection carries the already-decided flip from the caller; a true
        // value reverses the belt's forward/backward speeds.
        const flip = randomDirection;
        this.forwardSpeed  = flip ? 0.1  : -0.1;
        this.backwardSpeed = flip ? -0.1 : 0.1;
        this.broken = broken;
        this.status = broken ? "broken" : "operational";
    }

    // Broken belt: drive actions are refused
    private async refuseBroken(action: string): Promise<string> {
        console.log(`Conveyor ${this.name}: ${action} ignored — belt is broken.`);
        try { await this.setConveyorSpeed(0); } catch { /* ignore */ }
        return "broken";
    }

    async setCustomIAHandlers() {
        await this.setConveyorSpeed(0);

        this.thing?.setActionHandler("startBeltBackward", async () => {
            if (this.broken) return this.refuseBroken("startBeltBackward");
            try {
                await this.setConveyorSpeed(this.backwardSpeed);
                return "";
            }
            catch {
                console.log("failed");
                return "";
            }
        });
        // set startBeltForward action handlers
        this.thing?.setActionHandler("startBeltForward", async () => {
            if (this.broken) return this.refuseBroken("startBeltForward");
            try {
                await this.setConveyorSpeed(this.forwardSpeed);
                return "";
            }
            catch {
                console.log("failed");
                return "";
            }
        });

        this.thing?.setActionHandler("stopBelt", async () => {
            try {
                await this.setConveyorSpeed(0);
                return "";
            }
            catch {
                console.log("failed");
                return "";
            }
        });

        if (this.name.includes("ConveyorBelt1")) {
            this.thing?.setActionHandler("moveCubeToEnd", async () => {
                try {
                    console.log(`Conveyor ${this.name}: Starting moveCubeToEnd sequence...`);

                    const sensorName = `${this.name}/InfraredSensor1`;
                    const sensorHandle = Number(await this.sim.getObject(sensorName));

                    // Start belt forward
                    await this.setConveyorSpeed(-0.05);

                    // Poll sensor
                    while (true) {
                        const sensorInfo = await this.sim.readProximitySensor(sensorHandle);
                        if (sensorInfo && sensorInfo[0] === 1) {
                            console.log(`Conveyor ${this.name}: Cube detected at the end of the belt.`);
                            break;
                        }
                        await delay(50);
                    }

                    // Stop belt
                    await this.setConveyorSpeed(0);
                    console.log(`Conveyor ${this.name}: Belt stopped.`);
                    return "Success";
                }
                catch (error) {
                    console.error("moveCubeToEnd failed:", error);
                    await this.setConveyorSpeed(0); // Ensure belt is stopped on failure
                    return "Failure";
                }
            });
        }
    }

    // Coppelia Methods
    // get conveyorbelt info
    async getConveyorState() {
        this.conveyorHandle = Number(await this.sim.getObject(this.name));
        return await (this.sim.readCustomTableData(this.conveyorHandle, '__state__'));
    }
    //speed should be -1 to 1
    async setConveyorSpeed(speed: Number) {
        this.conveyorHandle = Number(await this.sim.getObject(this.name));
        await this.sim.writeCustomTableData(this.conveyorHandle, '__ctrl__', { 'vel': speed });
    }
}


type WheelDir = "forward" | "backward" | "stop";

export class virtualOmniPlatform extends virtualSemanticThing {
    name: String;
    sim: any;
    // Fixed wheel spin speed (rad/s). Matches the example OmniPlatform script:
    // v = 80 * 2.398795 * pi/180  (the 2.398795 factor yields the correct pad velocity).
    private readonly speed: number = 80 * 2.398795 * Math.PI / 180;
    // Current direction of each wheel; index 0..3 maps to link[0..3]/regularRotation.
    private wheelStates: WheelDir[] = ["stop", "stop", "stop", "stop"];

    constructor(woT: typeof globalThis.WoT, s: any, objectName: String, td: tdJSON) {
        super(woT, td, null);
        this.name = objectName;
        this.sim = s;
    }

    async setCustomIAHandlers() {
        // Leave the platform stopped on start-up.
        await this.applyWheelStates(["stop", "stop", "stop", "stop"]);

        this.thing?.setActionHandler("setWheels", async (data) => {
            try {
                const input: any = await data.value();
                await this.applyWheelStates([input.wheel1, input.wheel2, input.wheel3, input.wheel4]);
                return "";
            } catch (error) {
                console.error("setWheels failed:", error);
                return "Failure";
            }
        });

        this.thing?.setActionHandler("stop", async () => {
            try {
                await this.applyWheelStates(["stop", "stop", "stop", "stop"]);
                return "";
            } catch (error) {
                console.error("stop failed:", error);
                return "Failure";
            }
        });

        this.thing?.setPropertyReadHandler("wheelStates", async () => ({
            wheel1: this.wheelStates[0],
            wheel2: this.wheelStates[1],
            wheel3: this.wheelStates[2],
            wheel4: this.wheelStates[3],
        }));
    }

    // Coppelia Methods
    // Map each direction to a signed fixed velocity and drive the four wheels.
    private async applyWheelStates(states: (string | undefined)[]) {
        for (let i = 0; i < 4; i++) {
            const dir: WheelDir = states[i] === "forward" || states[i] === "backward"
                ? states[i] as WheelDir
                : "stop";
            const vel = dir === "forward" ? this.speed : dir === "backward" ? -this.speed : 0;
            const jointHandle = Number(await this.sim.getObject(`${this.name}/link[${i}]/regularRotation`));
            await this.sim.setJointTargetVelocity(jointHandle, vel);
            this.wheelStates[i] = dir;
        }
    }
}


export class virtualCamera extends virtualSemanticThing {
    name: String;
    sim: any;
    private localPoses: boolean;

    constructor(
        woT: typeof globalThis.WoT,
        s: any,
        objectName: string,
        td: tdJSON,
        distUnit: DistanceUnits | null = null,
        rotUnit: RotationUnits | null = null,
        localPoses: boolean = false
    ) {
        super(woT, td, distUnit, rotUnit);
        this.name = objectName;
        this.sim = s;
        this.localPoses = localPoses;
    }

    async setCustomIAHandlers() {
        this.thing?.setActionHandler("getCubesInRange", async () => {
            try {
                const shapeType = this.sim.object_shape_type;
                const sceneHandle = this.sim.handle_scene;
                const handles = (await this.sim.getObjectsInTree(sceneHandle, shapeType, 0))[0];

                const cameraBase = ROBOT_BASE_POSITIONS.camera;
                const result = [];
                for (const rawHandle of handles) {
                    const handle = Number(rawHandle);
                    const alias = (await this.sim.getObjectAlias(handle, 0))[0];
                    if (/^dice_(red|green|blue)_\d+$/.test(alias)) {
                        const pos = (await this.sim.getObjectPosition(handle, -1))[0];

                        const simX = pos[0];
                        const simY = pos[1];

                        // Predefined bounding box: x in [0.95, 1.50], y in [1.4, 1.6]
                        if (simX >= 0.95 && simX <= 1.50 && simY >= 1.4 && simY <= 1.6) {
                            const ox = this.localPoses ? pos[0] - cameraBase[0] : pos[0];
                            const oy = this.localPoses ? pos[1] - cameraBase[1] : pos[1];
                            const oz = this.localPoses ? pos[2] - cameraBase[2] : pos[2];
                            result.push({
                                x: this.distanceUnitTranslator.translateFromSimUnit(ox),
                                y: this.distanceUnitTranslator.translateFromSimUnit(oy),
                                z: this.distanceUnitTranslator.translateFromSimUnit(oz),
                            });
                        }
                    }
                }
                return result;
            } catch (error) {
                console.error("getCubesInRange failed:", error);
                return [];
            }
        });

        this.thing?.setPropertyReadHandler("coordinateFrame", async () =>
            this.localPoses ? "local" : "world"
        );
    }
}


export class debugThing {
    name: String;
    sim: any;

    constructor(s: any, objectName: String) {
        this.name = objectName;
        this.sim = s;
    }

    async spawnCubesOnBases() {
        let Handle = Number(await this.sim.getObject("/CubeSpawner"));
        let scriptHandle = Number(await this.sim.getScript(1, Handle, "/CubeSpawner"));

        // Call Lua: getCurrentPose (Must return Quaternions!)
        const result = await this.sim.callScriptFunction("spawnAboveColorBases", scriptHandle);
    }
}