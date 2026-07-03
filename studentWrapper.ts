/* wraps the simulationServer into a module to start by students with level parameters */

import { setupServer, ServerConfig } from "./simulationServer";

const ANSI_GREEN = "\x1b[32m";
const ANSI_YELLOW = "\x1b[33m";
const ANSI_RESET = "\x1b[0m";




const level0serverConfig: ServerConfig = {
    dynamicEndpoints: false,
    randomUnits: false,
    localPoses: false,
    randomDestination: false,
    randomConveyer: false,
    brokenConveyer: false,
    debug: false,
    allDevices: false
};

const level1serverConfig: ServerConfig = {
    dynamicEndpoints: true,
    randomUnits: false,
    localPoses: false,
    randomDestination: false,
    randomConveyer: false,
    brokenConveyer: false,
    debug: false,
    allDevices: true
};

const level2serverConfig: ServerConfig = {
    dynamicEndpoints: true,
    randomUnits: true,
    localPoses: true,
    randomDestination: false,
    randomConveyer: false,
    brokenConveyer: false,
    debug: false,
    allDevices: true
};

const level3serverConfig: ServerConfig = {
    dynamicEndpoints: true,
    randomUnits: true,
    localPoses: true,
    randomDestination: true,
    randomConveyer: true,
    brokenConveyer: false,
    debug: false,
    allDevices: true
};

const level4serverConfig: ServerConfig = {
    dynamicEndpoints: true,
    randomUnits: true,
    localPoses: true,
    randomDestination: true,
    randomConveyer: true,
    brokenConveyer: true,
    debug: false,
    allDevices: true
};

let LEVEL_DESCRIPTION: "level0" | "level1" | "level2"| "level3" | "level4" = "level3";

async function main() {
    // // Leseargument aus der Kommandozeile (Index 2, da 0=node, 1=script path)
    const levelSelectionArg = process.argv[2]; 
    let serverConfig: ServerConfig;
    if (!levelSelectionArg || !["level0", "level1", "level2", "level3", "level4"].includes(levelSelectionArg)) {
        console.warn(`${ANSI_YELLOW}[WARN] No level argument provided. Defaulting to ${LEVEL_DESCRIPTION}.${ANSI_RESET}`);
    } else {
        LEVEL_DESCRIPTION = levelSelectionArg as "level0" | "level1" | "level2" | "level3" | "level4";
    }
    if (LEVEL_DESCRIPTION === "level0") {
        // fix meter unit, global poses, fix endpoints
        console.log(`${ANSI_YELLOW}[INFO] Level 0 selected.${ANSI_RESET}`);
        serverConfig = level0serverConfig;
    } else if (LEVEL_DESCRIPTION === "level1") {
        // still fixed meter unit, but randomize endpoints and cube needs to reach target pose
        console.log(`${ANSI_YELLOW}[INFO] Level 1 selected.${ANSI_RESET}`);
        serverConfig = level1serverConfig;
    } else if (LEVEL_DESCRIPTION === "level2") {
        // randomize units, local pose
        console.log(`${ANSI_YELLOW}[INFO] Level 2 selected.${ANSI_RESET}`);
        serverConfig = level2serverConfig;
    } else if (LEVEL_DESCRIPTION === "level3") {
        // randomize all aspects
        console.log(`${ANSI_YELLOW}[INFO] Level 3 selected.${ANSI_RESET}`);
        serverConfig = level3serverConfig;
    } else if (LEVEL_DESCRIPTION === "level4") {
        // randomize all aspects and introduce broken conveyers
        console.log(`${ANSI_YELLOW}[INFO] Level 4 selected.${ANSI_RESET}`);
        serverConfig = level4serverConfig;
    } else {
        // this should not happen, but just in case
        console.warn(`${ANSI_YELLOW}[WARN] Invalid level argument. .${ANSI_RESET}`);
        return;
    }
    setupServer(serverConfig).catch((error) => {
        console.error(`${ANSI_YELLOW}[ERROR] Server initialization failed:${ANSI_RESET}`, error);
        if (error instanceof Error) {
            console.error(`${ANSI_YELLOW}  Message: ${error.message}${ANSI_RESET}`);
            console.error(`${ANSI_YELLOW}  Stack: ${error.stack}${ANSI_RESET}`);
        }
        process.exit(1);
    });
}

if (require.main === module) {
    main();
}
