import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  uploadAttachment,
  downloadFile
} from "../controllers/uploads.controller.js";

const router = express.Router();

router.post("/chat-attachment", verifyFirebaseToken, uploadAttachment);
router.get("/file/:encodedPath", downloadFile);

export default router;
