// Auto-generated Thing Models
export const thingModels = {
  "virtual_cameraTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualCamera",
    "id": "urn:dev:ops:32473-virtual-camera",
    "description": "Virtual Camera to detect cubes in the scene",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-camera#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "coordinateFrame": {
        "title": "Coordinate Frame",
        "description": "Indicates the coordinate frame used by this device. 'local' = relative to camera base position; 'world' = absolute world coordinates.",
        "type": "string",
        "enum": [
          "local",
          "world"
        ],
        "readOnly": true,
        "observable": false
      }
    },
    "actions": {
      "getCubesInRange": {
        "title": "Get Cubes In Range",
        "description": "Get positions of all cubes within the predefined range",
        "synchronous": false,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "urn:dev:ops:32473-virtual-camera#base"
        },
        "output": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "x": {
                "type": "number",
                "unit": "meter"
              },
              "y": {
                "type": "number",
                "unit": "meter"
              },
              "z": {
                "type": "number",
                "unit": "meter"
              }
            },
            "required": [
              "x",
              "y",
              "z"
            ]
          }
        }
      }
    }
  },
  "virtual_color_sensorTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualColorSensor",
    "id": "urn:dev:ops:32473-virtual-color-sensor",
    "description": "Color Sensor (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-color-sensor#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      },
      "color": {
        "title": "color sensor value",
        "description": "get the color value from the sensor",
        "type": "array",
        "items": {
          "type": "number",
          "maximum": 255,
          "minimum": 0
        },
        "readOnly": true,
        "observable": true,
        "maxItems": 3,
        "minItems": 3
      }
    }
  },
  "virtual_conveyor_oneTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualConveyorBelt1",
    "id": "urn:dev:ops:32473-virtual-conveyor-one",
    "description": "Conveyor Belt on the Left (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-conveyor-one#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      }
    },
    "actions": {
      "startBeltBackward": {
        "title": "Start conveyor belt with fixed speed",
        "description": "This action starts moving the conveyor belt backward"
      },
      "startBeltForward": {
        "title": "Start conveyor belt",
        "description": "This action starts moving the conveyor belt forward"
      },
      "stopBelt": {
        "title": "Stop conveyor belt",
        "description": "This action stops moving the conveyor belt"
      },
      "moveCubeToEnd": {
        "title": "Move cube to end",
        "description": "Move the cube from the start of the conveyor belt to the end"
      }
    }
  },
  "virtual_conveyor_twoTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualConveyorBelt2",
    "id": "urn:dev:ops:32473-virtual-conveyor-two",
    "description": "virtual conveyor belt right in coppeliasim",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-conveyor-two#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      }
    },
    "actions": {
      "startBeltBackward": {
        "title": "Start conveyor belt with fixed speed",
        "description": "This action starts moving the conveyor belt backward"
      },
      "startBeltForward": {
        "title": "Start conveyor belt",
        "description": "This action starts moving the conveyor belt forward"
      },
      "stopBelt": {
        "title": "Stop conveyor belt",
        "description": "This action stops moving the conveyor belt"
      }
    }
  },
  "virtual_infrared_sensor1TM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensor1",
    "id": "urn:dev:ops:32473-virtual-sensor-1",
    "description": "Infrared sensor for the detection of objects (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-1#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object. Polling to update observe happens every 100ms",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      },
      "objectDistance": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "number",
        "readOnly": true,
        "observable": false,
        "unit": "millimeter"
      }
    }
  },
  "virtual_infrared_sensor2TM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensor2",
    "id": "urn:dev:ops:32473-virtual-sensor-2",
    "description": "virtual sensor 2 in coppeliasim",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-2#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "Get the sensor state to check object presence",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      }
    }
  },
  "virtual_infrared_sensor3TM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensor3",
    "id": "urn:dev:ops:32473-virtual-sensor-3",
    "description": "Infrared sensor for the detection of objects (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-3#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object. Polling to update observe happens every 100ms",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      },
      "objectDistance": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "number",
        "readOnly": true,
        "observable": false,
        "unit": "millimeter"
      }
    }
  },
  "virtual_infrared_sensor4TM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensor4",
    "id": "urn:dev:ops:32473-virtual-sensor-4",
    "description": "Infrared sensor for the detection of objects (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-4#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      }
    }
  },
  "virtual_infrared_sensor_blueTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensorBlue",
    "id": "urn:dev:ops:32473-virtual-sensor-blue",
    "description": "Infrared sensor for the detection of blue objects (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-blue#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      }
    }
  },
  "virtual_infrared_sensor_redTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualInfraredSensorRed",
    "id": "urn:dev:ops:32473-virtual-sensor-red",
    "description": "Infrared sensor for the detection of red objects (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-sensor-red#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "objectPresence": {
        "title": "Read infrared sensor",
        "description": "get the sensor state if there is object",
        "type": "boolean",
        "readOnly": true,
        "observable": true
      }
    }
  },
  "virtual_light_blueTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "virtualLightBlue",
    "id": "urn:dev:ops:32473-virtualLight-blue",
    "description": "virtual light left in coppeliasim",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtualLight-blue#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "lightState": {
        "title": "virtual light state",
        "description": "get/set virtual light state",
        "type": "boolean",
        "observable": true,
        "readOnly": false,
        "writeOnly": false
      },
      "lightColor": {
        "title": "virtual light color",
        "description": "get/set light color",
        "type": "array",
        "items": {
          "type": "number",
          "minimum": 0,
          "maximum": 255
        },
        "maxItems": 3,
        "minItems": 3,
        "observable": true,
        "readOnly": false,
        "writeOnly": false
      }
    }
  },
  "virtual_light_redTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "virtualLightRed",
    "id": "urn:dev:ops:32473-virtualLight-red",
    "description": "virtual light right in coppeliasim",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtualLight-red#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "lightState": {
        "title": "virtual light state",
        "description": "get/set virtual light state",
        "type": "boolean",
        "observable": true,
        "readOnly": false,
        "writeOnly": false
      },
      "lightColor": {
        "title": "virtual light color",
        "description": "get/set light color",
        "type": "array",
        "items": {
          "type": "number",
          "minimum": 0,
          "maximum": 255
        },
        "maxItems": 3,
        "minItems": 3,
        "observable": true,
        "readOnly": false,
        "writeOnly": false
      }
    }
  },
  "virtual_omni_platformTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en"
      }
    ],
    "@type": "Thing",
    "title": "VirtualOmniPlatform",
    "id": "urn:dev:ops:32473-virtual-omni-platform",
    "description": "Virtual four-wheel omnidirectional mobile platform. Each of the four omni wheels (link[0..3]/regularRotation) can spin forward, spin backward, or stop, all at a fixed speed; combining the four wheel directions produces forward/backward, sideways (strafe) and rotational motion.",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "wheelStates": {
        "title": "Current wheel states",
        "description": "The current direction of each of the four omni wheels, in order wheel1..wheel4 (mapping to link[0..3]/regularRotation).",
        "type": "object",
        "readOnly": true,
        "properties": {
          "wheel1": {
            "type": "string",
            "enum": [
              "forward",
              "backward",
              "stop"
            ]
          },
          "wheel2": {
            "type": "string",
            "enum": [
              "forward",
              "backward",
              "stop"
            ]
          },
          "wheel3": {
            "type": "string",
            "enum": [
              "forward",
              "backward",
              "stop"
            ]
          },
          "wheel4": {
            "type": "string",
            "enum": [
              "forward",
              "backward",
              "stop"
            ]
          }
        }
      }
    },
    "actions": {
      "setWheels": {
        "title": "Set wheel directions",
        "description": "Set the spin direction of each of the four omni wheels. Each wheel may be 'forward', 'backward' or 'stop'; the spin speed is fixed. The platform keeps driving in this configuration until it is changed or 'stop' is called.",
        "synchronous": true,
        "input": {
          "type": "object",
          "properties": {
            "wheel1": {
              "type": "string",
              "enum": [
                "forward",
                "backward",
                "stop"
              ],
              "description": "Direction of wheel 1 (link[0]/regularRotation)"
            },
            "wheel2": {
              "type": "string",
              "enum": [
                "forward",
                "backward",
                "stop"
              ],
              "description": "Direction of wheel 2 (link[1]/regularRotation)"
            },
            "wheel3": {
              "type": "string",
              "enum": [
                "forward",
                "backward",
                "stop"
              ],
              "description": "Direction of wheel 3 (link[2]/regularRotation)"
            },
            "wheel4": {
              "type": "string",
              "enum": [
                "forward",
                "backward",
                "stop"
              ],
              "description": "Direction of wheel 4 (link[3]/regularRotation)"
            }
          },
          "required": [
            "wheel1",
            "wheel2",
            "wheel3",
            "wheel4"
          ]
        }
      },
      "stop": {
        "title": "Stop platform",
        "description": "Stop the platform by setting all four wheels to 'stop' (zero velocity).",
        "synchronous": true,
        "idempotent": true
      }
    }
  },
  "virtual_uarmTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualUarm",
    "id": "urn:dev:ops:32473-virtual-uarm-two",
    "description": "Uarm (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-uarm-two#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "coordinateFrame": {
        "title": "Coordinate Frame",
        "description": "Indicates the coordinate frame used by this device. 'local' = relative to robot base position; 'world' = absolute world coordinates.",
        "type": "string",
        "enum": [
          "local",
          "world"
        ],
        "readOnly": true,
        "observable": false
      },
      "currentPosition": {
        "title": "Current Gripper Position",
        "description": "Reads the current absolute position (x, y, z) of the Uarm gripper/end-effector in world coordinates.",
        "type": "object",
        "readOnly": true,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "urn:dev:ops:32473-virtual-uarm-two#base"
        },
        "properties": {
          "x": {
            "type": "number",
            "unit": "meter"
          },
          "y": {
            "type": "number",
            "unit": "meter"
          },
          "z": {
            "type": "number",
            "unit": "meter"
          }
        }
      }
    },
    "actions": {
      "goTo": {
        "title": "Go to position",
        "description": "Move to Position x,y,z given by the user with fixed speed",
        "synchronous": false,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "cell:coppeliaSimWorld"
        },
        "input": {
          "properties": {
            "x": {
              "type": "number",
              "unit": "meter"
            },
            "y": {
              "type": "number",
              "unit": "meter"
            },
            "z": {
              "type": "number",
              "unit": "meter"
            }
          },
          "required": [
            "x",
            "y",
            "z"
          ],
          "type": "object"
        }
      },
      "gripClose": {
        "title": "Close gripper",
        "description": "Close Uarm gripper",
        "synchronous": false
      },
      "gripOpen": {
        "title": "Open gripper",
        "description": "Open Uarm gripper",
        "synchronous": false
      }
    }
  },
  "virtual_uarm_oneTM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualUarm",
    "id": "urn:dev:ops:32473-virtual-uarm-one",
    "description": "Uarm (Virtual)",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-uarm-one#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "currentPosition": {
        "title": "Current Gripper Position",
        "description": "Reads the current absolute position (x, y, z) of the Uarm gripper/end-effector in world coordinates.",
        "type": "object",
        "readOnly": true,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "urn:dev:ops:32473-virtual-uarm-one#base"
        },
        "properties": {
          "x": {
            "type": "number",
            "unit": "meter"
          },
          "y": {
            "type": "number",
            "unit": "meter"
          },
          "z": {
            "type": "number",
            "unit": "meter"
          }
        }
      }
    },
    "actions": {
      "moveCube": {
        "title": "Move cube to conveyor 1",
        "description": "Pick up a cube from the spawning position and drop it at the starting position of conveyer 1",
        "synchronous": false
      },
      "reset": {
        "title": "Reset Uarm",
        "description": "Reset Uarm to home position and open gripper",
        "synchronous": false
      }
    }
  },
  "virtual_ur3TM": {
    "@context": [
      "https://www.w3.org/2019/wot/td/v1",
      {
        "@language": "en",
        "cell": "http://localhost:8070/cellOntology"
      }
    ],
    "@type": "Thing",
    "title": "VirtualUR5",
    "id": "urn:dev:ops:32473-virtual-ur5",
    "description": "Virtual UR5 Collaborative Robotic Arm.",
    "security": "nosec_sc",
    "securityDefinitions": {
      "nosec_sc": {
        "scheme": "nosec"
      }
    },
    "robotBaseFrame": {
      "@type": "cell:Frame",
      "@id": "urn:dev:ops:32473-virtual-ur5#base",
      "cell:hasPose": {
        "@type": "cell:Pose",
        "cell:referenceFrame": "cell:coppeliaSimWorld",
        "cell:position": {
          "@type": "cell:Position",
          "cell:x": 0,
          "cell:y": 0,
          "cell:z": 0
        },
        "cell:orientation": {
          "@type": "cell:Quaternion",
          "cell:qx": 0,
          "cell:qy": 0,
          "cell:qz": 0,
          "cell:qw": 1
        }
      }
    },
    "properties": {
      "status": {
        "title": "Device status",
        "description": "Operational health of the device. Possible status: operational, broken, error.",
        "type": "string",
        "enum": [
          "operational",
          "broken",
          "error"
        ],
        "readOnly": true,
        "observable": true
      },
      "coordinateFrame": {
        "title": "Coordinate Frame",
        "description": "Indicates the coordinate frame used by this device. 'local' = relative to robot base position; 'world' = absolute world coordinates.",
        "type": "string",
        "enum": [
          "local",
          "world"
        ],
        "readOnly": true,
        "observable": false
      },
      "currentPose": {
        "title": "Read UR5 Current Position",
        "description": "get the current Cartesian position of the robot end-effector.",
        "type": "object",
        "readOnly": true,
        "minItems": 6,
        "maxItems": 6,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "urn:dev:ops:32473-virtual-ur5#base"
        },
        "properties": {
          "x": {
            "type": "number",
            "unit": "meter",
            "description": "X"
          },
          "y": {
            "type": "number",
            "unit": "meter",
            "description": "Y"
          },
          "z": {
            "type": "number",
            "unit": "meter",
            "description": "Z"
          },
          "rx": {
            "type": "number",
            "unit": "degree",
            "description": "Rotation around X"
          },
          "ry": {
            "type": "number",
            "unit": "degree",
            "description": "Rotation around Y"
          },
          "rz": {
            "type": "number",
            "unit": "degree",
            "description": "Rotation around Z"
          }
        }
      }
    },
    "actions": {
      "goToPosition": {
        "title": "Go to Position",
        "description": "Moves the robot end-effector to a specified absolute Cartesian position.",
        "synchronous": true,
        "cell:hasPose": {
          "@type": "cell:Pose",
          "cell:referenceFrame": "cell:coppeliaSimWorld"
        },
        "input": {
          "type": "object",
          "minItems": 6,
          "maxItems": 6,
          "properties": {
            "x": {
              "type": "number",
              "unit": "meter",
              "description": "X"
            },
            "y": {
              "type": "number",
              "unit": "meter",
              "description": "Y"
            },
            "z": {
              "type": "number",
              "unit": "meter",
              "description": "Z"
            },
            "rx": {
              "type": "number",
              "unit": "degree",
              "description": "Rotation around X"
            },
            "ry": {
              "type": "number",
              "unit": "degree",
              "description": "Rotation around Y"
            },
            "rz": {
              "type": "number",
              "unit": "degree",
              "description": "Rotation around Z"
            }
          }
        }
      },
      "closeGripper": {
        "title": "Close Gripper",
        "description": "Closes the RG2 gripper by setting the integer signal to 1.",
        "safe": false,
        "idempotent": true,
        "synchronous": true
      },
      "openGripper": {
        "title": "Open Gripper",
        "description": "Opens the RG2 gripper by setting the integer signal to 0.",
        "safe": false,
        "idempotent": true,
        "synchronous": true
      }
    }
  }
};

// Individual exports for convenience
export const virtual_cameraTM: any = thingModels.virtual_cameraTM;
export const virtual_color_sensorTM: any = thingModels.virtual_color_sensorTM;
export const virtual_conveyor_oneTM: any = thingModels.virtual_conveyor_oneTM;
export const virtual_conveyor_twoTM: any = thingModels.virtual_conveyor_twoTM;
export const virtual_infrared_sensor1TM: any = thingModels.virtual_infrared_sensor1TM;
export const virtual_infrared_sensor2TM: any = thingModels.virtual_infrared_sensor2TM;
export const virtual_infrared_sensor3TM: any = thingModels.virtual_infrared_sensor3TM;
export const virtual_infrared_sensor4TM: any = thingModels.virtual_infrared_sensor4TM;
export const virtual_infrared_sensor_blueTM: any = thingModels.virtual_infrared_sensor_blueTM;
export const virtual_infrared_sensor_redTM: any = thingModels.virtual_infrared_sensor_redTM;
export const virtual_light_blueTM: any = thingModels.virtual_light_blueTM;
export const virtual_light_redTM: any = thingModels.virtual_light_redTM;
export const virtual_omni_platformTM: any = thingModels.virtual_omni_platformTM;
export const virtual_uarmTM: any = thingModels.virtual_uarmTM;
export const virtual_uarm_oneTM: any = thingModels.virtual_uarm_oneTM;
export const virtual_ur3TM: any = thingModels.virtual_ur3TM;
