import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import { verifyAdminRole } from "../controllers/admin.controller.js";
import {
  getRecentUniversityAnnouncements,
  postUniversityAnnouncement,
} from "../controllers/university.controller.js";

const router = express.Router();

router.get("/announcements/recent", verifyFirebaseToken, getRecentUniversityAnnouncements);
router.post("/announcements", verifyFirebaseToken, verifyAdminRole, postUniversityAnnouncement);

export default router;
