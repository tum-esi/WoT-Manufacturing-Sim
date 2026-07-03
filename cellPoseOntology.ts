export const cellPoseOntology = `
@prefix cell: <https://example.org/manufacturing-cell#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .
@prefix sosa: <http://www.w3.org/ns/sosa/> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix unit: <http://qudt.org/vocab/unit/> .
@prefix dct:  <http://purl.org/dc/terms/> .

#################################################################
# Ontology header
#################################################################

cell: a owl:Ontology ;
    dct:title "Manufacturing Cell Pose Ontology (CoppeliaSim)" ;
    dct:description """A minimal vocabulary for describing the pose of devices in a
        CoppeliaSim manufacturing-line simulation, for use inside W3C WoT Thing
        Descriptions. A pose is ALWAYS expressed relative to exactly one named
        coordinate reference frame. The root frame is the CoppeliaSim absolute
        origin (object handle -1, sim.handle_world). A pose whose referenceFrame
        is that world frame is a GLOBAL pose; any other referenceFrame makes it a
        LOCAL pose. Lengths are metres, angles are radians, frames are right-handed,
        matching CoppeliaSim conventions.""" ;
    owl:versionInfo "1.0.0" .

#################################################################
# Coordinate reference frames
#################################################################

cell:Frame a owl:Class ;
    rdfs:label "Coordinate Frame" ;
    rdfs:comment "A right-handed Cartesian reference frame. Lengths in metres, angles in radians." .

cell:WorldFrame a owl:Class ;
    rdfs:subClassOf cell:Frame ;
    rdfs:label "World Frame" ;
    rdfs:comment "A frame fixed to the environment with no parent. Here it is the CoppeliaSim absolute origin." .

cell:parentFrame a owl:ObjectProperty ;
    rdfs:label "parent frame" ;
    rdfs:domain cell:Frame ;
    rdfs:range  cell:Frame ;
    rdfs:comment "The frame in which THIS frame's own pose is defined. A WorldFrame has no parentFrame; chaining parentFrame links forms the transform tree (like a ROS tf tree)." .

#################################################################
# Pose = position + orientation, relative to one frame
#################################################################

cell:Pose a owl:Class ;
    rdfs:label "Pose" ;
    rdfs:comment "Position and orientation of a rigid body, expressed relative to exactly one referenceFrame. A pose without a referenceFrame is undefined." .

cell:hasPose a owl:ObjectProperty ;
    rdfs:label "has pose" ;
    rdfs:range  cell:Pose ;
    rdfs:comment "Relates a device (a sosa:Platform, a Frame, or any Thing) to its pose." .

cell:referenceFrame a owl:ObjectProperty ;
    rdfs:label "reference frame" ;
    rdfs:domain cell:Pose ;
    rdfs:range  cell:Frame ;
    rdfs:comment "The frame this pose is expressed in. If it is a cell:WorldFrame the pose is GLOBAL (world) pose; otherwise it is a LOCAL pose relative to the named frame. This property is the single switch between global and local." .

cell:position a owl:ObjectProperty ;
    rdfs:label "position" ;
    rdfs:domain cell:Pose ;
    rdfs:range  cell:Position .

cell:orientation a owl:ObjectProperty ;
    rdfs:label "orientation" ;
    rdfs:domain cell:Pose ;
    rdfs:range  cell:Orientation .

#################################################################
# Position (metres)
#################################################################

cell:Position a owl:Class ;
    rdfs:label "Position" ;
    rdfs:comment "A 3D translation in metres (qudt unit:M) along the axes of the reference frame." .

cell:x a owl:DatatypeProperty ; rdfs:domain cell:Position ; rdfs:range xsd:double ;
    rdfs:label "x" ; rdfs:comment "Translation along frame X, metres." .
cell:y a owl:DatatypeProperty ; rdfs:domain cell:Position ; rdfs:range xsd:double ;
    rdfs:label "y" ; rdfs:comment "Translation along frame Y, metres." .
cell:z a owl:DatatypeProperty ; rdfs:domain cell:Position ; rdfs:range xsd:double ;
    rdfs:label "z" ; rdfs:comment "Translation along frame Z, metres." .

#################################################################
# Orientation: quaternion (preferred) or Euler angles
#################################################################

cell:Orientation a owl:Class ;
    rdfs:label "Orientation" ;
    rdfs:comment "Abstract orientation. Use a subclass: cell:Quaternion (preferred) or cell:EulerAngles." .

cell:Quaternion a owl:Class ;
    rdfs:subClassOf cell:Orientation ;
    rdfs:label "Quaternion" ;
    rdfs:comment "Unit quaternion (qx, qy, qz, qw). Component order matches sim.getObjectQuaternion, which returns [x, y, z, w]. Preferred: no gimbal lock, no convention ambiguity." .

cell:qx a owl:DatatypeProperty ; rdfs:domain cell:Quaternion ; rdfs:range xsd:double ; rdfs:label "qx" .
cell:qy a owl:DatatypeProperty ; rdfs:domain cell:Quaternion ; rdfs:range xsd:double ; rdfs:label "qy" .
cell:qz a owl:DatatypeProperty ; rdfs:domain cell:Quaternion ; rdfs:range xsd:double ; rdfs:label "qz" .
cell:qw a owl:DatatypeProperty ; rdfs:domain cell:Quaternion ; rdfs:range xsd:double ; rdfs:label "qw" .

cell:EulerAngles a owl:Class ;
    rdfs:subClassOf cell:Orientation ;
    rdfs:label "Euler Angles" ;
    rdfs:comment "Three angles in radians. You MUST state cell:rotationOrder. CoppeliaSim's sim.getObjectOrientation returns alpha about X, beta about Y, gamma about Z." .

cell:roll  a owl:DatatypeProperty ; rdfs:domain cell:EulerAngles ; rdfs:range xsd:double ;
    rdfs:label "roll"  ; rdfs:comment "Rotation about X (alpha), radians." .
cell:pitch a owl:DatatypeProperty ; rdfs:domain cell:EulerAngles ; rdfs:range xsd:double ;
    rdfs:label "pitch" ; rdfs:comment "Rotation about Y (beta), radians." .
cell:yaw   a owl:DatatypeProperty ; rdfs:domain cell:EulerAngles ; rdfs:range xsd:double ;
    rdfs:label "yaw"   ; rdfs:comment "Rotation about Z (gamma), radians." .

cell:rotationOrder a owl:DatatypeProperty ;
    rdfs:domain cell:EulerAngles ; rdfs:range xsd:string ;
    rdfs:label "rotation order" ;
    rdfs:comment "Axis sequence and intrinsic/extrinsic flag, e.g. 'XYZ-intrinsic' (the CoppeliaSim default)." .

#################################################################
# Link back to the CoppeliaSim scene
#################################################################

cell:coppeliaSimAlias a owl:DatatypeProperty ;
    rdfs:range xsd:string ;
    rdfs:label "CoppeliaSim alias" ;
    rdfs:comment "The scene-object alias/path this frame or device maps to, e.g. '/RobotArm_1/base'." .

cell:coppeliaSimHandle a owl:DatatypeProperty ;
    rdfs:range xsd:integer ;
    rdfs:label "CoppeliaSim handle" ;
    rdfs:comment "Runtime integer object handle. The world origin is -1 (sim.handle_world)." .

#################################################################
# The canonical global frame (define once, reference everywhere)
#################################################################

cell:coppeliaSimWorld a cell:WorldFrame ;
    rdfs:label "CoppeliaSim World Origin" ;
    rdfs:comment "The absolute/global frame of the simulation. Equivalent to sim.handle_world (-1). All global poses reference this individual." ;
    cell:coppeliaSimHandle -1 .
`;
