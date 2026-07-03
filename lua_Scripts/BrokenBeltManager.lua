--- this script is attached to the BrokenBeltManager object in the scene.
--- Gated on the 'brokenConveyer' signal (value '1'), which is written by the
--- simulation server before startSimulation(): when set, it moves the
--- OmniPlatform mobile robot into its working position so it can be used as the
--- fallback transport while ConveyorBelt2 is broken.

--- copy-paste this code into the sim for it to take effect

function sysCall_init()
    if sim.getStringSignal('brokenConveyer') == '1' then
        local omniPlatform = sim.getObject('/OmniPlatform')
        sim.setObjectPosition(omniPlatform, -1, {0.800, 0.800, 1.075})
    end
end

function sysCall_actuation() end
function sysCall_cleanup() end
