import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import { getWeeklyTimetable } from "../controllers/timetable.controller.js";

const router = express.Router();

router.get("/weekly", verifyFirebaseToken, getWeeklyTimetable);

export default router;