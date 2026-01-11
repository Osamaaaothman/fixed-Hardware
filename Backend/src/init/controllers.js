import exampleController from "../controllers/cncController.js";
import imageController from "../controllers/imageController.js";
import serialController from "../controllers/serialController.js";
import queueController from "../controllers/queueController.js";
import fontController from "../controllers/fontController.js";
import textController from "../controllers/textController.js";
import drawController from "../controllers/drawController.js";
import systemController from "../controllers/systemController.js";

export default function initControllers(app) {
  // System controller (lock/unlock) - must be first
  systemController(app);
  
  app.use("/api/cnc", exampleController);
  app.use("/api/image", imageController);
  app.use("/api/serial", serialController);
  app.use("/api/queue", queueController);
  app.use("/api/fonts", fontController);
  app.use("/api/text", textController);
  app.use("/api/draw", drawController);
}
