import express from "express";
import verifyFirebaseToken from "../middleware/auth.js"; 
import {
  getCurrentCalendar,
  getCalendarImage,
  updateImagePaths
} from "../controllers/calendar.controller.js";

const router = express.Router();

router.get("/current", verifyFirebaseToken, getCurrentCalendar);
router.get("/image/:semester", getCalendarImage);
router.put("/image-paths", verifyFirebaseToken, updateImagePaths);

export default router;
