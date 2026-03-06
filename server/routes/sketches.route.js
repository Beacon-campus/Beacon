import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import { getSketch, saveSketch } from "../controllers/sketches.controller.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.get("/", getSketch);
router.post("/", saveSketch);

export default router;