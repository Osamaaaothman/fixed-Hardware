import express from "express";

const cncRouter = express.Router();

cncRouter.get("/", (req, res) => {
  return res.json({ message: "Example controller is working!" });
});


export default cncRouter;
