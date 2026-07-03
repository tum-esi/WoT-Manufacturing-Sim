--- this script is attached to the ColorSensorBaseManager object in the scene,
--- and is responsible for randomizing ColorSensorBase positions on simulation init.
--- Randomization is gated on the 'randomDestination' signal (value '1'),
--- which is written by virtual_devices_server.ts before startSimulation().

--- copy-paste this code into the sim for it to take effect

function sysCall_init()
    if sim.getStringSignal('randomDestination') == '1' then
        randomizePositions()
    end
end

function randomizePositions()
    math.randomseed(os.time())
    local handles = {
        sim.getObject("/ColorSensorBaseRed"),
        sim.getObject("/ColorSensorBaseBlue"),
        sim.getObject("/ColorSensorBaseYellow"),
    }
    local positions = {}
    for i, h in ipairs(handles) do
        positions[i] = sim.getObjectPosition(h, -1)
    end
    for i = 3, 2, -1 do
        local j = math.random(1, i)
        positions[i], positions[j] = positions[j], positions[i]
    end
    for i, h in ipairs(handles) do
        sim.setObjectPosition(h, -1, positions[i])
    end
end

function sysCall_actuation() end
function sysCall_cleanup() end