--lua
sim = require 'sim'

local motorJointPath  = './openCloseJoint'
local centerJointPath = './centerJoint'
local attachPointPath = './attachPoint'
local proxSensorPath  = './attachProxSensor'

local motorVelocity = 0.05 -- m/s
local motorForce    = 25   -- N

local cmdSignalName = nil
local motorHandle   = -1
local centerJoint   = -1
local connector     = -1
local objectSensor  = -1

-- State variables
local attachedShape = -1
local closing       = false
local gripperRoot   = -1

-- Safe release
local releasePending = false

function sysCall_init()
    gripperRoot = sim.getObjectAssociatedWithScript(sim.handle_self)
    local alias = sim.getObjectAlias(gripperRoot, 1)
    cmdSignalName = 'RG2_cmd_' .. alias

    motorHandle  = sim.getObject(motorJointPath)
    centerJoint  = sim.getObject(centerJointPath)
    connector    = sim.getObject(attachPointPath)
    objectSensor = sim.getObject(proxSensorPath)
end

local function isDescendantOf(obj, ancestor)
    if ancestor == -1 or obj == -1 then return false end
    local p = sim.getObjectParent(obj)
    while p ~= -1 do
        if p == ancestor then return true end
        p = sim.getObjectParent(p)
    end
    return false
end

local function tryAttachObject()
    if attachedShape ~= -1 then return end
    if objectSensor == -1 or connector == -1 then return end

    local index = 0
    while true do
        local shape = sim.getObjects(index, sim.object_shape_type)
        if shape == -1 then break end

        if not isDescendantOf(shape, gripperRoot) then
            local isStatic      = sim.getObjectInt32Param(shape, sim.shapeintparam_static)
            local isRespondable = sim.getObjectInt32Param(shape, sim.shapeintparam_respondable)
            
            -- Only grab dynamic objects
            if isStatic == 0 and isRespondable ~= 0 then
                local detected = sim.checkProximitySensor(objectSensor, shape)
                if detected == 1 then
                    attachedShape = shape
                    
                    -- 1. Disable collisions (Visual clipping allowed, Physics stable)
                    sim.setObjectInt32Param(attachedShape, sim.shapeintparam_respondable, 0)
                    
                    -- 2. Make Static and Parent
                    sim.setObjectInt32Param(attachedShape, sim.shapeintparam_static, 1)
                    sim.setObjectParent(attachedShape, connector, true)
                    
                    sim.addStatusbarMessage(string.format('[RG2] Gripped %s', sim.getObjectAlias(attachedShape, 1)))
                    break
                end
            end
        end
        index = index + 1
    end
end

local function detachObject()
    if attachedShape == -1 then return end
    
    -- 1. Unparent
    sim.setObjectParent(attachedShape, -1, true)
    
    -- 2. THE FIX: Teleport the object down by 1cm (0.01m) relative to the gripper
    --    This creates a guaranteed air gap so fingers don't touch it.
    local p = sim.getObjectPosition(attachedShape, -1)
    p[3] = p[3] - 0.02
    sim.setObjectPosition(attachedShape, -1, p)
    
    -- 3. Force ZERO velocity for a clean drop
    sim.setObjectFloatParam(attachedShape, sim.shapefloatparam_init_velocity_x, 0)
    sim.setObjectFloatParam(attachedShape, sim.shapefloatparam_init_velocity_y, 0)
    sim.setObjectFloatParam(attachedShape, sim.shapefloatparam_init_velocity_z, 0)

    -- 4. Re-enable Physics & Collisions
    sim.setObjectInt32Param(attachedShape, sim.shapeintparam_static, 0)
    sim.setObjectInt32Param(attachedShape, sim.shapeintparam_respondable, 1)

    -- 5. Reset Physics state
    sim.resetDynamicObject(attachedShape)

    sim.addStatusbarMessage(string.format('[RG2] Released %s', sim.getObjectAlias(attachedShape, 1)))

    attachedShape = -1
    releasePending = false
end

function sysCall_actuation()
    local cmd = cmdSignalName and sim.getInt32Signal(cmdSignalName) or nil
    if cmd ~= nil then
        local newClosing = (cmd ~= 0)
        
        -- Detect rising edge of "Open" command
        if closing and not newClosing then
            releasePending = true
        end
        
        closing = newClosing
    end

    local v = closing and -motorVelocity or motorVelocity
    sim.setJointTargetForce(motorHandle, motorForce)
    sim.setJointTargetVelocity(motorHandle, v)

    if closing then
        tryAttachObject()
        releasePending = false 
    else
        -- Logic: Open fingers FIRST, Detach SECOND
        if attachedShape ~= -1 and releasePending then
            local currentPos = sim.getJointPosition(motorHandle)
            
            -- TUNE THIS VALUE IF NEEDED (Currently -0.3)
            -- Use the "print" below to debug if it never releases
            -- print("Current Gripper Pos: "..currentPos)
            
            if currentPos > -0.3 then 
                 detachObject()
            end
        end
    end
end

function sysCall_joint(inData)
    if inData.handle == centerJoint then
        local error = (-sim.getJointPosition(motorHandle)/2) - inData.currentPos
        local ctrl  = error * 20
        local vel   = ctrl
        if vel >  inData.maxVel then vel =  inData.maxVel end
        if vel < -inData.maxVel then vel = -inData.maxVel end
        local outData = { vel = vel, force = inData.maxForce }
        return outData
    end
end