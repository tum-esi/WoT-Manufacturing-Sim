/*!
 * ====================================================================
 * Semantic Robotics Simulation | Version 1.0
 * * Copyright (c) 2025 Roman Binkert, Embedded Systems and Internet of Things, Technical University of Munich. All Rights Reserved.
 * * NOTICE: This software is intended solely for educational use by students
 * and contains proprietary information. Unauthorized use, reproduction, 
 * or reverse engineering is strictly prohibited.
 * ====================================================================
 */

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
    const msg = args[0];
    if (typeof msg === "string" && msg.includes("iri-reference")) return;
    originalWarn.apply(console, args);
};

import { Servient } from '@node-wot/core';
import { HttpServer } from '@node-wot/binding-http'
import { CoapServer } from '@node-wot/binding-coap'
import { Helpers } from '@node-wot/core';

import { TdDirectory } from './tdDirectory';
import { hostOntology, patchOntologyAnnotations } from './ontologyServer';

// for reading local TD file
import * as fs from 'fs';
import * as path from 'path';

// load remote api for coppeliasim
const { RemoteAPIClient } = require("./CoppeliasimRemoteApi/RemoteAPIClient.js");

// load virtual sensor class
import { virtualSemanticSensor, virtualConveyor, virtualLight, virtualSemanticUR3, virtualSemanticUarm, virtualSemanticUarmOne, debugThing, virtualCamera, virtualOmniPlatform } from "./virtualDevices";
// import unit stuff
import { DistanceUnits, setDefaultUnit, setDefaultRotationUnit, RotationUnits, UARM1_WAYPOINTS, ROBOT_BASE_POSITIONS } from './virtualDevices';

// add delay function
let realTimeFactor = 0.4; // default value, will be overwritten by config file
function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms / realTimeFactor) );
}

// helper to read TD files relative to this file's directory
function readTdFile(fileName: string) {
    const fullPath = path.resolve(__dirname, 'TaskAssets', 'TDs', fileName);
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

/**
 * Wählt eine zufällige Distanzeinheit aus den verfügbaren.
 * @returns {DistanceUnits} Eine zufällige Einheit.
 */
function getRandomDistanceUnit(): DistanceUnits {
    const units = [DistanceUnits.MILLIMETER, DistanceUnits.CENTIMETER, DistanceUnits.METER];
    const randomIndex = Math.floor(Math.random() * units.length);
    return units[randomIndex];
}

/**
 * Writes the robot's actual base coordinates into the TD's ontology pose
 * annotations and sets the reference frame of every property/action pose.
 * @param td TD object to mutate in place.
 * @param basePos World coordinates [x, y, z] of the robot base.
 * @param baseQuat World orientation quaternion [qx, qy, qz, qw] of the robot base.
 * @param localPoses If true, poses reference the robot's own base frame;
 *                   otherwise they reference the global CoppeliaSim world frame.
 */
function applyPoseFrames(
    td: any,
    basePos: [number, number, number],
    baseQuat: [number, number, number, number],
    localPoses: boolean
): void {
    const posNode = td.robotBaseFrame?.["cell:hasPose"]?.["cell:position"];
    if (posNode) {
        posNode["cell:x"] = basePos[0];
        posNode["cell:y"] = basePos[1];
        posNode["cell:z"] = basePos[2];
    }

    const oriNode = td.robotBaseFrame?.["cell:hasPose"]?.["cell:orientation"];
    if (oriNode) {
        oriNode["cell:qx"] = baseQuat[0];
        oriNode["cell:qy"] = baseQuat[1];
        oriNode["cell:qz"] = baseQuat[2];
        oriNode["cell:qw"] = baseQuat[3];
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

/**
 * Reads a base object's live world position from CoppeliaSim and writes it into
 * the TD's robotBaseFrame. 
 * Sim starts with randomDestination == 1 -> in-sim script moves destination bases -> 
 * read position of the base object and write it into the TD's robotBaseFrame ->
 * produce the TD with the correct base position.
 * @param td TD object to mutate in place.
 * @param sim CoppeliaSim Remote API object.
 * @param baseObjectName Scene path of the sensor base (e.g. "/ColorSensorBaseRed").
 * @param localPoses If true, poses reference the device's own base frame.
 * @returns The live world pose [x, y, z, qx, qy, qz, qw], so callers can mirror it
 *          back into the shared ROBOT_BASE_POSITIONS store used by conversions.
 */
async function applyLivePoseFrames(
    td: any,
    sim: any,
    baseObjectName: string,
    localPoses: boolean
) {
    const handle = Number(await sim.getObject(baseObjectName));
    // getObjectPose returns [x, y, z, qx, qy, qz, qw] relative to the world (-1)
    const pose = (await sim.getObjectPose(handle, -1))[0] as [number, number, number, number, number, number, number];
    applyPoseFrames(td, [pose[0], pose[1], pose[2]], [pose[3], pose[4], pose[5], pose[6]], localPoses);
    return pose;
}

// Conveyor base orientations with a 180° rotation about Z baked in (each
// conveyor's real orientation rotated 180° about Z, precomputed — not derived
// at runtime). Applied only when a belt's direction was actually reversed.
//   ConveyorBelt1: real ~180°/Z -> +180° = 0°   -> [0, 0, 0, 1]
//   ConveyorBelt2: real  ~90°/Z -> +180° = 270° -> [0, 0, 0.7071, -0.7071]
const CONVEYOR_FLIPPED_ORIENTATION: Record<string, [number, number, number, number]> = {
    one: [0, 0, 0, 1],
    two: [0, 0, 0.7071067811865476, -0.7071067811865476],
};

/**
 * Force-overrides a conveyor TD's exposed base orientation with the precomputed
 * 180°/Z-flipped quaternion, regardless of the orientation read from the scene.
 * Called only when the belt's direction was actually reversed, so clients can
 * read the belt's direction off the exposed pose.
 * @param td TD object to mutate in place.
 * @param conveyor Which conveyor ("one" or "two") to look up the baked value for.
 */
function overrideConveyorOrientation(td: any, conveyor: "one" | "two"): void {
    const o = td.robotBaseFrame?.["cell:hasPose"]?.["cell:orientation"];
    if (!o) return;
    const q = CONVEYOR_FLIPPED_ORIENTATION[conveyor];
    o["cell:qx"] = q[0];
    o["cell:qy"] = q[1];
    o["cell:qz"] = q[2];
    o["cell:qw"] = q[3];
}

import { styleText } from "node:util";
// ANSI Codes für Gelb und Reset
const ANSI_GREEN = "\x1b[32m";
const ANSI_YELLOW = "\x1b[33m";
const ANSI_RESET = "\x1b[0m";

// import the generated TMs from ts file
// can be created from the TMs as json with the buildTDs.ts script, which reads all TMs from the src/TMs folder and creates a single ts file with all TMs as export. This is necessary to not need to copy the TMs to the student repo.
import { thingModels } from './generatedTMs';

// set virtual scene address
// When connecting to remote CoppeliaSim, override with COPPELIA_SCENE_PATH env var (must exist on the remote machine)
let virtualSceneadress = process.env.COPPELIA_SCENE_PATH || (__dirname + "/TaskAssets/IoT_Remote_Lab.ttt");

// Korrekte interne Adresse des TD Directory Containers (Endet auf /things)
const TD_DIRECTORY_BASE_URL = "http://localhost:9091/things";

// let LEVEL_DESCRIPTION: "level0" | "level1" | "level2" = "level2";

export interface ServerConfig {
    dynamicEndpoints: boolean;
    randomUnits: boolean;
    localPoses: boolean;
    randomDestination: boolean;
    randomConveyer: boolean;
    brokenConveyer: boolean;
    debug: boolean;
    allDevices: boolean;
}

function parseArgs(): ServerConfig {
    const args = process.argv.slice(2);
    const config: ServerConfig = {
        dynamicEndpoints: false,
        randomUnits: false,
        localPoses: false,
        randomDestination: false,
        randomConveyer: false,
        brokenConveyer: false,
        debug: false,
        allDevices: true
    };

    const parseFlagValue = (value: string | undefined) => value === undefined || value === '1';

    for (let i = 0; i < args.length; i++) {
        const flag = args[i];
        const val = args[i + 1];
        switch (flag) {
            case '--dynamic-endpoints':   config.dynamicEndpoints  = parseFlagValue(val); if (val !== undefined) i++; break;
            case '--random-units':        config.randomUnits       = parseFlagValue(val); if (val !== undefined) i++; break;
            case '--local-poses':         config.localPoses        = parseFlagValue(val); if (val !== undefined) i++; break;
            case '--random-destination':  config.randomDestination = parseFlagValue(val); if (val !== undefined) i++; break;
            case '--random-conveyer':     config.randomConveyer    = parseFlagValue(val); if (val !== undefined) i++; break;
            case '--broken-conveyer':     config.brokenConveyer    = parseFlagValue(val); if (val !== undefined) i++; break;
            case '-d': config.debug = true; break;
        }
    }
    return config;
}

async function initCoppliaSim(address: String, realTimeModifier: number, serverConfig: ServerConfig) {
    // ponytail: hardcoded host/port; change via COPPELIA_REMOTE_HOST and COPPELIA_REMOTE_PORT
    const host = process.env.COPPELIA_REMOTE_HOST || 'localhost';
    const port = parseInt(process.env.COPPELIA_REMOTE_PORT || '23050', 10);
    console.log(`[INFO] Connecting to CoppeliaSim at ${host}:${port}`);
    let client = new RemoteAPIClient(host, port, 'json');;
    try {
        // builds websocket connection to simulator
        await client.websocket.open();
        console.log(`[INFO] Successfully connected to CoppeliaSim`);
    }
    catch (error) {
        console.error(`[ERROR] Connection failed:`, error);
        throw new Error(`Could not connect to CoppeliaSim Remote API Server at ${host}:${port}. Make sure CoppeliaSim is running and the Remote API Server is enabled. Details: ${error}`);
    }


    let sim;
    try {
        console.log(`[INFO] Getting sim object from CoppeliaSim...`);
        sim = await client.getObject('sim');
        console.log(`[INFO] Got sim object`);
    } catch (error) {
        console.error(`[ERROR] Failed to get sim object:`, error);
        throw error;
    }

    try {
        console.log(`[INFO] Stopping simulation...`);
        await sim.stopSimulation();
        console.log(`[INFO] Simulation stopped`);
    } catch (error) {
        console.error(`[ERROR] Failed to stop simulation:`, error);
        throw error;
    }

    await delay(1000);

    // load the CoppeliaSim scene
    try {
        console.log(`[INFO] Loading scene from: ${address}`);
        await sim.loadScene(address);
        console.log(`[INFO] Scene loaded`);
    } catch (error) {
        console.error(`[ERROR] Failed to load scene:`, error);
        throw error;
    }

    // set real-time mode and real-time factor to ensure reliable timing.
    sim.setBoolParam(sim.boolparam_realtime_simulation, true);
    if (typeof sim.setFloatProperty === 'function') {
        await sim.setFloatProperty(sim.handle_scene, "realtimeModifier", realTimeModifier);
    } else {
        console.warn("[WARN] sim.setFloatProperty is not a function on this version of CoppeliaSim. Skipping realtimeModifier configuration.");
    }

    // CoppeliaSim performs a reset shortly after the first
    // startSimulation(), which clears string signals and restores object positions.
    // To ensure the server starts with the correct configuration, we start and stop the simulation once before setting initial conditions.
    await sim.startSimulation();
    await delay(2000);
    await sim.stopSimulation();
    await delay(500);

    await sim.setStringSignal('randomDestination', serverConfig.randomDestination ? '1' : '0');
    await sim.setStringSignal('brokenConveyer', serverConfig.brokenConveyer ? '1' : '0');
    await sim.startSimulation();

    await delay(1000);

    return sim;
}

async function setupTDDirectory(port: number = 9091) {
    const tdDirectory = new TdDirectory(port);
    await tdDirectory.startTDD();
}

async function produceTDs(woT: typeof globalThis.WoT, virtualIoTlabserver: Servient, sim: any, serverConfig: ServerConfig) {
    const configPath = path.resolve(__dirname, 'TaskAssets', 'simulationConfig.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as {
        realTimeFactor: number;
    };
    realTimeFactor = config.realTimeFactor;

    // set a random suffix to each WoT Thing that is different across server instances
    // except for uarm1, conveyor1, and infraredSensor1 (variability level0)

    const randNum = Math.floor(1000 + Math.random() * 9000).toString();
    const suffix = `_${randNum}`;

    const applySuffixToTitle = (td: any) => {
        if (!serverConfig.dynamicEndpoints) return td;
        if (td.title && !td.title.endsWith(suffix)) td.title = `${td.title}${suffix}`;
        return td;
    };

    // Level 0 devices (no title suffix --> fixed enpoint)
    // proximity sensor1 conveyor belt 1
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor1TM, sim, "/ConveyorBelt1/Proximity_sensor", serverConfig.localPoses);
    let infraredSensor1 = new virtualSemanticSensor(woT, sim, "/ConveyorBelt1/Proximity_sensor", thingModels.virtual_infrared_sensor1TM, "proximity");
    await infraredSensor1.produce();

    //Uarm 1
    let uarm1TD = thingModels.virtual_uarm_oneTM;
    uarm1TD.id = "urn:dev:ops:32473-virtual-uarm-one";
    uarm1TD.title = "VirtualUarm1";
    ROBOT_BASE_POSITIONS.uarm1 = await applyLivePoseFrames(uarm1TD, sim, "/uarm", serverConfig.localPoses);
    let uarm1 = new virtualSemanticUarmOne(
        woT,
        sim,
        "/uarm",
        uarm1TD,
        UARM1_WAYPOINTS.cubeSpawnPoint,
        UARM1_WAYPOINTS.cubeSpawnPointAbove,
        UARM1_WAYPOINTS.conveyerStartPoint,
        UARM1_WAYPOINTS.conveyerStartPointAbove
    );
    await uarm1.produce();

     // Conveyor 1
    await applyLivePoseFrames(thingModels.virtual_conveyor_oneTM, sim, "/ConveyorBelt1", serverConfig.localPoses);
    // when --random-conveyer is set, a 50% chance to actually reverse this belt;
    // only then is the exposed orientation flipped 180° so clients can read it off the pose
    const conveyor1DirectionFlipped = serverConfig.randomConveyer && Math.random() < 0.5;
    if (conveyor1DirectionFlipped) overrideConveyorOrientation(thingModels.virtual_conveyor_oneTM, "one");
    let conveyor1 = new virtualConveyor(woT, sim, "/ConveyorBelt1", thingModels.virtual_conveyor_oneTM, conveyor1DirectionFlipped);
    await conveyor1.produce();

    if (serverConfig.allDevices === false) {
        return;
    }

    // infrared sensor2 conveyor belt 1
    applySuffixToTitle(thingModels.virtual_infrared_sensor2TM);
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor2TM, sim, "/ConveyorBelt1/InfraredSensor1", serverConfig.localPoses);
    let infraredSensor2 = new virtualSemanticSensor(woT, sim, "/ConveyorBelt1/InfraredSensor1", thingModels.virtual_infrared_sensor2TM, "infrared");
    await infraredSensor2.produce();

    // infrared sensor3 & sensor4 are on ConveyorBelt2 (kept even when the belt is
    // broken — the unit is still present, only its belt reports status "broken")
    // infrared sensor3 conveyor belt 2
    applySuffixToTitle(thingModels.virtual_infrared_sensor3TM);
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor3TM, sim, "/ConveyorBelt2/Proximity_sensor", serverConfig.localPoses);
    let infraredSensor3 = new virtualSemanticSensor(woT, sim, "/ConveyorBelt2/Proximity_sensor", thingModels.virtual_infrared_sensor3TM, "proximity");
    await infraredSensor3.produce();

    // infrared sensor4 conveyor belt 2
    applySuffixToTitle(thingModels.virtual_infrared_sensor4TM);
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor4TM, sim, "/ConveyorBelt2/InfraredSensor1", serverConfig.localPoses);
    let infraredSensor4 = new virtualSemanticSensor(woT, sim, "/ConveyorBelt2/InfraredSensor1", thingModels.virtual_infrared_sensor4TM, "infrared");
    await infraredSensor4.produce();

    // infrared sensor blue
    applySuffixToTitle(thingModels.virtual_infrared_sensor_blueTM);
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor_blueTM, sim, "/ColorSensorBaseBlue", serverConfig.localPoses);
    let infraredSensorBlue = new virtualSemanticSensor(woT, sim, "/ColorSensorBaseBlue/InfraredSensorBlue", thingModels.virtual_infrared_sensor_blueTM, "infrared");
    await infraredSensorBlue.produce();

    // infrared sensor red
    applySuffixToTitle(thingModels.virtual_infrared_sensor_redTM);
    await applyLivePoseFrames(thingModels.virtual_infrared_sensor_redTM, sim, "/ColorSensorBaseRed", serverConfig.localPoses);
    let infraredSensorRed = new virtualSemanticSensor(woT, sim, "/ColorSensorBaseRed/InfraredSensorRed", thingModels.virtual_infrared_sensor_redTM, "infrared");
    await infraredSensorRed.produce();

    // color sensor
    applySuffixToTitle(thingModels.virtual_color_sensorTM);
    await applyLivePoseFrames(thingModels.virtual_color_sensorTM, sim, "/ColorSensorBaseYellow", serverConfig.localPoses);
    let colorSensor = new virtualSemanticSensor(woT, sim, "/ColorSensorBaseYellow/InfraredSensorYellow", thingModels.virtual_color_sensorTM, "color");
    await colorSensor.produce();

    // use uarmTM as template and add custom id and title

    // UR5
    let ur5TD = thingModels.virtual_ur3TM;
    ur5TD.id = "urn:dev:ops:32473-virtual-ur5";
    ur5TD.title = serverConfig.dynamicEndpoints ? `VirtualUR5${suffix}` : 'VirtualUR5';
    ROBOT_BASE_POSITIONS.ur5 = await applyLivePoseFrames(ur5TD, sim, "/UR5", serverConfig.localPoses);
    let ur5 = new virtualSemanticUR3(woT, sim, "/UR5", ur5TD as any, null, null, serverConfig.localPoses);
    await ur5.produce();

    //Uarm 2
    let uarm2TD = thingModels.virtual_uarmTM;
    uarm2TD.id = "urn:dev:ops:32473-virtual-uarm-two";
    uarm2TD.title = serverConfig.dynamicEndpoints ? `VirtualUarm2${suffix}` : 'VirtualUarm2';
    ROBOT_BASE_POSITIONS.uarm2 = await applyLivePoseFrames(uarm2TD, sim, "/uarm2", serverConfig.localPoses);
    let uarm2 = new virtualSemanticUarm(woT, sim, "/uarm2", uarm2TD, null, null, serverConfig.localPoses);
    await uarm2.produce();

    // Conveyor Belts

    // Conveyor 2 — still produced when --broken-conveyer is set, but reports
    // status "broken" so clients can detect the fault and fall back (e.g. mobile robot)
    applySuffixToTitle(thingModels.virtual_conveyor_twoTM);
    await applyLivePoseFrames(thingModels.virtual_conveyor_twoTM, sim, "/ConveyorBelt2", serverConfig.localPoses);
    const conveyor2DirectionFlipped = serverConfig.randomConveyer && Math.random() < 0.5;
    if (conveyor2DirectionFlipped) overrideConveyorOrientation(thingModels.virtual_conveyor_twoTM, "two");
    let conveyor2 = new virtualConveyor(woT, sim, "/ConveyorBelt2", thingModels.virtual_conveyor_twoTM, conveyor2DirectionFlipped, serverConfig.brokenConveyer);
    await conveyor2.produce();

    // Omni mobile platform — only exposed when flag --broken-conveyer is set
    if (serverConfig.brokenConveyer) {
        applySuffixToTitle(thingModels.virtual_omni_platformTM);
        let omniPlatform = new virtualOmniPlatform(woT, sim, "/OmniPlatform", thingModels.virtual_omni_platformTM);
        await omniPlatform.produce();
    }


    // Lights
    applySuffixToTitle(thingModels.virtual_light_blueTM);
    await applyLivePoseFrames(thingModels.virtual_light_blueTM, sim, "/SpotlightBlue", serverConfig.localPoses);
    let lightBlue = new virtualLight(woT, sim, "/SpotlightBlue", thingModels.virtual_light_blueTM);
    await lightBlue.produce();

    applySuffixToTitle(thingModels.virtual_light_redTM);
    await applyLivePoseFrames(thingModels.virtual_light_redTM, sim, "/SpotlightRed", serverConfig.localPoses);
    let lightRed = new virtualLight(woT, sim, "/SpotlightRed", thingModels.virtual_light_redTM);
    await lightRed.produce();

    // Virtual Camera
    applySuffixToTitle(thingModels.virtual_cameraTM);
    ROBOT_BASE_POSITIONS.camera = await applyLivePoseFrames(thingModels.virtual_cameraTM, sim, "/FakeCamera1", serverConfig.localPoses);
    let camera = new virtualCamera(woT, sim, "/VirtualCamera", thingModels.virtual_cameraTM, null, null, serverConfig.localPoses);
    await camera.produce();
}

async function setUnits(unitSelectionArg: string, specifiedUnit: string | undefined) {
    let defaultUnit: DistanceUnits;
    let unitDescription: string;

    if (unitSelectionArg === '0') {
        let unitDescription: string;
        if (specifiedUnit) {
            // Wenn '0' und eine spezifische Einheit übergeben wird, nimm diese
            if (Object.values(DistanceUnits).includes(specifiedUnit as DistanceUnits)) {
                defaultUnit = specifiedUnit as DistanceUnits;
                setDefaultUnit(defaultUnit); // set global default unit to millimeter
                unitDescription = `${defaultUnit}`;
            } else {
                console.warn(`${ANSI_YELLOW}[WARN] Ungültige Einheit: '${specifiedUnit}'.`);
                setDefaultUnit(DistanceUnits.METER); // set global default unit to millimeter
                unitDescription = "Meter (METER)";
            }
        } else {
            // Wenn '0' übergeben wird, nimm Meter
            setDefaultUnit(DistanceUnits.METER); // set global default unit to millimeter
            unitDescription = "Meter (METER)";
        }
        setDefaultRotationUnit(RotationUnits.DEGREE);

        // console.log(`${ANSI_YELLOW}[INFO] Setze Standard-Einheit auf ${unitDescription}${ANSI_RESET}.`);
    } else if (unitSelectionArg === '1') {
        // Wenn '1' übergeben wird, nimm eine zufällige Einheit
        defaultUnit = getRandomDistanceUnit();
        setDefaultUnit(defaultUnit); // set global default unit to millimeter
        setDefaultRotationUnit(RotationUnits.DEGREE);
        unitDescription = `zufällige Einheit: ${defaultUnit}`;
        // console.log(`${ANSI_YELLOW}[INFO] Setze Standard-Einheit auf ${unitDescription}${ANSI_RESET}.`);
    } else {
        // Standardmäßig Millimeter, wenn kein Argument oder ein ungültiges übergeben wird
        setDefaultRotationUnit(RotationUnits.DEGREE)
    }
}

export async function setupServer(serverConfig: ServerConfig) {
    console.log(styleText("green", "Starting Semantic Robotics Simulation Server. Please wait until all devices are produced and exposed..."));

    // Validate remote mode configuration
    const isRemoteMode = process.env.COPPELIA_MODE === 'remote';
    if (isRemoteMode && !process.env.COPPELIA_SCENE_PATH) {
        throw new Error("COPPELIA_MODE=remote requires COPPELIA_SCENE_PATH to be set. Provide an absolute path to the scene file on the local machine.");
    }

    let sceneAddress: String = virtualSceneadress;

    // load config from TaskAssets/simulationConfig.json
    const configFileName = 'simulationConfig.json';
    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'TaskAssets', configFileName), 'utf8'));
    const realTimeModifier = config.realTimeFactor || undefined;
    if (realTimeModifier === undefined) {
        throw new Error("No realTimeFactor specified. Please set it in the " + configFileName + " file.");
    } else {
        console.log(`[INFO] Setting realTimeModifier to ${realTimeModifier} based on configuration file.`);
    }

    if (serverConfig.randomUnits) {
        await setUnits('1', undefined);
    } else {
        await setUnits('0', DistanceUnits.METER); // default to meter if not random
    }

    console.log('Setting up CoppeliaSim connection and initializing scene...');
    var sim = await initCoppliaSim(sceneAddress, realTimeModifier, serverConfig);
    console.log('CoppeliaSim initialized and scene loaded.');

    await setupTDDirectory();

    hostOntology(8070, '/cellOntology').then(({ url, stopServer }) => {
        console.log(`Ontology server is running at ${url}${ANSI_RESET}`);
    }).catch((error) => {
        console.error(`${ANSI_YELLOW}[ERROR] Failed to start ontology server: ${(error as Error).message}${ANSI_RESET}`);
    });

    if (serverConfig.debug) {
        console.log("Debug mode active: Spawning cubes on color sensor bases.");
        let debug = new debugThing(sim, "/CubeSpawner");
        await debug.spawnCubesOnBases();
    }

    // the virtual iot lab total server, now we consider to move every device into one server and the same port
    let virtualIoTlabserver = new Servient();
    virtualIoTlabserver.addServer(
        new HttpServer({
            port: 9001, // set port 9000 as request
        })
    );
    virtualIoTlabserver.addServer(
        new CoapServer({
            port: 10001, // default CoAP port
        })
    );

    Helpers.setStaticAddress("localhost");

    console.log("Preparing Devices...");
    let woT: typeof globalThis.WoT = await virtualIoTlabserver.start();
    await produceTDs(woT, virtualIoTlabserver, sim, serverConfig);
    console.log(styleText("green", `All devices prepared and exposed. Ready to accept requests.`));
}


// if (require.main === module) {
//     const serverConfig = parseArgs();
//     console.log(`${ANSI_YELLOW}[INFO] Server configuration: ${JSON.stringify(serverConfig)}${ANSI_RESET}`);
//     setupServer(serverConfig).catch((error) => {
//         console.error(`${ANSI_YELLOW}[ERROR] Server initialization failed: ${(error as Error).message}${ANSI_RESET}`);
//         process.exit(1);
//     });
// }
