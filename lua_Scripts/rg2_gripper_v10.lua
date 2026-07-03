sim=require'sim'

local attachedShape = -1
local closing       = false
local gripperRoot   = -1
local openingSignalName = 'signal.RG2_open'

function sysCall_init()
    motorHandle=sim.getObject('../openCloseJoint')
    centerJoint=sim.getObject('../centerJoint')
    motorVelocity=0.05 -- m/s
    motorForce=20 -- N
    connector=sim.getObject('../attachPoint')
    objectSensor=sim.getObject('../attachProxSensor')
end


local function tryAttachObject()
    index=0
    while true do
        shape=sim.getObjects(index,sim.sceneobject_shape)
        if (shape==-1) then
            break
        end
        if sim.getBoolProperty(shape, 'dynamic') and sim.getBoolProperty(shape, 'respondable') and (sim.checkProximitySensor(objectSensor,shape)==1) then
            -- Ok, we found a non-static respondable shape that was detected
            attachedShape=shape
            -- Do the connection:
            sim.setObjectParent(attachedShape,connector,true)
            break
        end
        index=index+1
    end
end 


function sysCall_actuation()
    local v=-motorVelocity
    local data=sim.getIntProperty(sim.handle_scene, openingSignalName, {noError = true}) or nil 
    if data ~= nil then
        local newClosing = (data ~= 1)
        
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
            sim.setObjectParent(attachedShape,-1,true)
        end
    end


    -- real pyhsical grasping attempt (less reliable)
    -- local v= -motorVelocity
    -- if data and data~=0 then
    --     v=motorVelocity
    -- end
    -- sim.setJointTargetForce(motorHandle,motorForce)
    -- sim.setJointTargetVelocity(motorHandle,v)
end

function sysCall_joint(inData)
    if inData.handle==centerJoint then
        local error=(-sim.getJointPosition(motorHandle)/2)-inData.currentPos 
        local ctrl=error*20 
        local velocityToApply=ctrl 
        if (velocityToApply>inData.maxVel) then 
            velocityToApply=inData.maxVel 
        end 
        if (velocityToApply<-inData.maxVel) then 
            velocityToApply=-inData.maxVel 
        end 
        local forceOrTorqueToApply=inData.maxForce 
        local outData={vel=velocityToApply,force=forceOrTorqueToApply} 
        return outData 
    end
end 

    -- You have basically 2 alternatives to grasp an object:
    --
    -- 1. You try to grasp it in a realistic way. This is quite delicate and sometimes requires
    --    to carefully adjust several parameters (e.g. motor forces/torques/velocities, friction
    --    coefficients, object masses and inertias)
    --
    -- 2. You fake the grasping by attaching the object to the gripper via a connector. This is
    --    much easier and offers very stable results.
    --
    -- Alternative 2 is explained hereafter:
    --
    --
    -- a) In the initialization phase, retrieve some handles:
    -- 
    -- connector=sim.getObject('../attachPoint')
    -- objectSensor=sim.getObject('../attachProxSensor')
    
    -- b) Before closing the gripper, check which dynamically non-static and respondable object is
    --    in-between the fingers. Then attach the object to the gripper:
    --
    -- index=0
    -- while true do
    --     shape=sim.getObjects(index,sim.sceneobject_shape)
    --     if (shape==-1) then
    --         break
    --     end
    --     if sim.getBoolProperty(shape, 'dynamic') and sim.getBoolProperty(shape, 'respondable') and (sim.checkProximitySensor(objectSensor,shape)==1) then
    --         -- Ok, we found a non-static respondable shape that was detected
    --         attachedShape=shape
    --         -- Do the connection:
    --         sim.setObjectParent(attachedShape,connector,true)
    --         break
    --     end
    --     index=index+1
    -- end
    
    -- c) And just before opening the gripper again, detach the previously attached shape:
    --
    -- sim.setObjectParent(attachedShape,-1,true)
