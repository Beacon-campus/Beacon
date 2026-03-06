import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  getMyChannels,
  getMessages,
  getClassmates,
  getGroupDetails,
  updateGroupSettings,
  createChatById,
  createChatByRegno,
  createGroup,
  syncClassroomsForStudents,
  sendMessage,
  deleteMessage,
  addParticipant,
  removeParticipant,
  setAdmin,
  deleteGroup,
  markMessagesRead
} from "../controllers/chat.controller.js";

const router = express.Router();

// ---------------------------------------------------------
// 1. GET ROUTES (Fetch Data)
// ---------------------------------------------------------

router.get("/my-channels", verifyFirebaseToken, getMyChannels);
router.get("/messages/:channelId", verifyFirebaseToken, getMessages);
router.get("/classmates", verifyFirebaseToken, getClassmates);
router.get("/group/details/:groupId", verifyFirebaseToken, getGroupDetails);

// ---------------------------------------------------------
// 2. CREATE / SYNC / UPDATE ROUTES
// ---------------------------------------------------------

router.put("/group/settings", verifyFirebaseToken, updateGroupSettings);
router.post("/create-by-id", verifyFirebaseToken, createChatById);
router.post("/create-by-regno", verifyFirebaseToken, createChatByRegno);
router.post("/create-group", verifyFirebaseToken, createGroup);
router.post("/sync-classrooms", verifyFirebaseToken, syncClassroomsForStudents);

// ---------------------------------------------------------
// 3. MESSAGING ROUTES
// ---------------------------------------------------------

router.post("/message", verifyFirebaseToken, sendMessage);

// ---------------------------------------------------------
// 4. DELETE MESSAGE ROUTE
// ---------------------------------------------------------

router.put("/message/delete", verifyFirebaseToken, deleteMessage);

// ---------------------------------------------------------
// 5. GROUP MANAGEMENT ROUTES
// ---------------------------------------------------------

router.put("/group/add", verifyFirebaseToken, addParticipant);
router.put("/group/remove", verifyFirebaseToken, removeParticipant);
router.put("/group/admin", verifyFirebaseToken, setAdmin);
router.delete("/group/:groupId", verifyFirebaseToken, deleteGroup);

// ---------------------------------------------------------
// 6. READ STATUS ROUTES
// ---------------------------------------------------------

router.post("/mark-read", verifyFirebaseToken, markMessagesRead);

export default router;
