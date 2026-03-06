import express from "express";
import { loginLookup, getMe, updateProfile, syncEmail, logoutSession } from "../controllers/auth.controller.js";
import verifyFirebaseToken from "../middleware/auth.js";

const router = express.Router();

router.post("/login-lookup", loginLookup);
router.get("/me", verifyFirebaseToken, getMe);
router.post("/logout", verifyFirebaseToken, logoutSession);
router.put("/update-profile", verifyFirebaseToken, updateProfile);
router.put("/sync-email", verifyFirebaseToken, syncEmail);

export default router;
