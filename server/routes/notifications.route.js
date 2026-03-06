import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  getNotifications,
  markNotificationsRead,
  deleteAllNotifications,
  deleteNotification
} from "../controllers/notifications.controller.js";

const router = express.Router();

router.get("/", verifyFirebaseToken, getNotifications);
router.put("/read", verifyFirebaseToken, markNotificationsRead);
router.delete("/all", verifyFirebaseToken, deleteAllNotifications);
router.delete("/:id", verifyFirebaseToken, deleteNotification);

export default router;
