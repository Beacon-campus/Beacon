import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  searchUser,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  getFriendStatus,
  getUserProfile,
  getMultipleUsers
} from "../controllers/friends.controller.js";

const router = express.Router();

router.post("/search", verifyFirebaseToken, searchUser);
router.post("/request", verifyFirebaseToken, sendFriendRequest);
router.post("/accept", verifyFirebaseToken, acceptFriendRequest);
router.post("/decline", verifyFirebaseToken, declineFriendRequest);
router.post("/remove", verifyFirebaseToken, removeFriend);
router.get("/status", verifyFirebaseToken, getFriendStatus);
router.get("/profile/:id", verifyFirebaseToken, getUserProfile);
router.post("/get-users", verifyFirebaseToken, getMultipleUsers);

export default router;
