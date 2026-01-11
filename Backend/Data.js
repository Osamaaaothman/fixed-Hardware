import { Queue } from "./src/utils/Queue.js";

let nexaboard = {
  status: "disconnected",
  cnc: {
    width: 200, // in mm
    height: 100, // in mm
    x: 50, // in mm
    y: 50, // in mm
    z: 0, // in mm
    speed: 3000,
    color: "blue",
  },
  authBox: {
    status: "locked", //locked,active,sleep
    currentPage: "login", //login,menue,status
    attempts: 0, //current attempts ( can reset on website )
    maxAttempts: 3, //maximum allowed attempts
    remoteBoxStatus: "locked", //locked,unlocked
    distanceFromBox: 100, //ultrasonic distance in cm ( we can make delay for good performance )
  },
  remoteControle: {
    status: "disconnected", //connected,disconnected
    currentPage: "login", //login,menue,status
  },
  queue: new Queue(),
};

let commandToArduino1 = {
  command: "",
  value: "",
};

let commandToArduino2 = {
  command: "",
  value: [],
};

export { nexaboard, commandToArduino1, commandToArduino2 };
