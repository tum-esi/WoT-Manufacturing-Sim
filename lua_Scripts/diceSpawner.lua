-- manage the creation of new dices in the pickup area when its empty and manage the sensing for the wot.

previousDetectionState = nil      -- watcher state
previousDetectionStateSensor = nil -- sensor imitation state

spawnPosition = {-0.147, 1.320, 1.031}
diceSize = {0.022, 0.022, 0.022}
diceMass = 0.1

-- color management: enforce that R, G, B appear once per 3 dice, in random order
local colorNamesBase = {"red", "blue", "green"}
local colorCycle = {}   -- current shuffled cycle
local colorIndex = 1

local function shuffleColors(t)
    -- Fisher-Yates shuffle[web:82][web:86]
    for i = #t, 2, -1 do
        local j = math.random(i)
        t[i], t[j] = t[j], t[i]
    end
end

local function getNextColorName()
    if colorIndex > #colorCycle then
        -- new cycle: copy base list and shuffle
        colorCycle = {unpack(colorNamesBase)}
        shuffleColors(colorCycle)
        colorIndex = 1
    end
    local name = colorCycle[colorIndex]
    colorIndex = colorIndex + 1
    return name
end

function sysCall_init()
    sim = require('sim')
    math.randomseed(sim.getSystemTimeInMs(-1))  -- better seed in CoppeliaSim[web:95]

    createUniqueDice(spawnPosition[1], spawnPosition[2], spawnPosition[3])
end

function sysCall_thread()
    -- unused
end

-- minimal flags: dynamic + respondable
local function configureDiceFlags(h)
    -- make it dynamic, with the desired mass
    sim.setShapeMass(h, diceMass)  -- 4.10 API[web:31]

    -- ensure it is not static
    sim.setObjectInt32Param(h, sim.shapeintparam_static, 0) -- dynamic shape[web:24]

    -- Respondable / collision mask
    sim.setObjectInt32Param(h, sim.shapeintparam_respondable, 1)
    sim.setObjectInt32Param(h, sim.shapeintparam_respondable_mask, 0xFFFF)
end

function createDice(x, y, z)
    local diceHandle = sim.createPrimitiveShape(sim.primitiveshape_cuboid, diceSize) -- 4.10[web:87]
    sim.setObjectPosition(diceHandle, -1, {x, y, z})
    configureDiceFlags(diceHandle)
    return diceHandle
end

function createUniqueDice(x, y, z)
    -- pick next color from cycle without repetition
    local chosenColorName = getNextColorName()
    local colors = {
        red   = {1, 0, 0},
        blue  = {0, 0, 1},
        green = {0, 1, 0}
    }
    local chosenColor = colors[chosenColorName]

    local baseName = "dice_" .. chosenColorName .. "_"
    local uniqueSuffix = sim.getSystemTimeInMs(-1)
    local diceName = baseName .. uniqueSuffix

    local diceHandle = sim.createPrimitiveShape(sim.primitiveshape_cuboid, diceSize)
    sim.setObjectPosition(diceHandle, -1, {x, y, z})
    sim.setObjectAlias(diceHandle, diceName)  -- 4.6+ alias API[web:5][web:88]
    sim.setShapeColor(diceHandle, nil, sim.colorcomponent_ambient_diffuse, chosenColor)
    configureDiceFlags(diceHandle)

    previousDetectionState = "dice removal detected"
    return diceHandle
end

function sysCall_sensing()
    local areaCenter = spawnPosition
    local areaSize = {0.3, 0.3, 0.3}

    local currentDetectionState, diceColor = isDiceInArea(areaCenter, areaSize)

    if currentDetectionState ~= previousDetectionState then
        if currentDetectionState then
            print("Dice detected within the area.")
            previousDetectionStateSensor = "dice detected"
        else
            print("No dice detected within the area.")
            createUniqueDice(spawnPosition[1], spawnPosition[2], spawnPosition[3])
            previousDetectionStateSensor = "dice removal detected"
        end
        previousDetectionState = currentDetectionState
    end
end

function isDiceInArea(areaCenter, areaSize)
    local objects = sim.getObjectsInTree(sim.handle_scene, sim.object_shape_type, 0)
    for i = 1, #objects do
        local objName = sim.getObjectAlias(objects[i])
        if objName and string.match(objName, "^dice_") then
            local objPos = sim.getObjectPosition(objects[i], -1)
            local inX = objPos[1] >= (areaCenter[1] - areaSize[1]/2) and objPos[1] <= (areaCenter[1] + areaSize[1]/2)
            local inY = objPos[2] >= (areaCenter[2] - areaSize[2]/2) and objPos[2] <= (areaCenter[2] + areaSize[2]/2)
            local inZ = objPos[3] >= (areaCenter[3] - areaSize[3]/2) and objPos[3] <= (areaCenter[3] + areaSize[3]/2)
            if inX and inY and inZ then
                local firstUnderscorePos = string.find(objName, "_")
                local secondUnderscorePos = string.find(objName, "_", firstUnderscorePos + 1)
                if firstUnderscorePos and secondUnderscorePos then
                    local colorName = string.sub(objName, firstUnderscorePos + 1, secondUnderscorePos - 1)
                    return true, colorName
                end
            end
        end
    end
    return false
end

function SenseDicePickupArea()
    local areaCenter = spawnPosition
    local areaSize = {0.2, 0.2, 0.2}

    local currentDetectionState, diceColor = isDiceInArea(areaCenter, areaSize)
    local dice_detected = "no changes"

    if currentDetectionState ~= previousDetectionStateSensor then
        if currentDetectionState then
            print("Dice sensed at pickup with color: ", diceColor)
            dice_detected = "dice detected"
        else
            print("No dice detected within the area by sensor")
            dice_detected = "dice removal detected"
        end
        previousDetectionStateSensor = currentDetectionState
    end
    return dice_detected, diceColor
end
