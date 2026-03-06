import { 
  findUserForLoginLookup, 
  getMeDetails, 
  updateProfileDetails, 
  syncEmailWithFirebase 
} from "../services/auth.service.js";
import {
  createLogFromRequest,
  hasRecentLog,
  resolveActorByFirebaseUid,
} from "../services/logs.service.js";

export const loginLookup = async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });

    const result = await findUserForLoginLookup(username);
    if (!result) return res.status(404).json({ error: "User not found" });

    res.json(result);
  } catch (err) {
    console.error("Login lookup error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    const uid = req.user.uid;
    const email = req.user.email;

    const details = await getMeDetails(uid, email);
    if (!details) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const actor = await resolveActorByFirebaseUid(uid, email);
    const alreadyLogged = await hasRecentLog({
      eventType: "AUTH_LOGIN",
      actorUserId: actor.userId,
      actorFirebaseUid: actor.firebaseUid,
      withinMinutes: 30,
    });
    if (!alreadyLogged) {
      await createLogFromRequest(req, {
        eventType: "AUTH_LOGIN",
        category: "auth",
        action: "login",
        status: "success",
        actor,
        message: "User session established",
      });
    }

    res.json(details);
  } catch (err) {
    console.error("API /me error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const logoutSession = async (req, res) => {
  try {
    await createLogFromRequest(req, {
      eventType: "AUTH_LOGOUT",
      category: "auth",
      action: "logout",
      status: "success",
      message: "User logged out",
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("Logout log error:", err);
    return res.status(500).json({ error: "Failed to register logout event" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const uid = req.user.uid;
    const updates = req.body;

    const result = await updateProfileDetails(uid, updates);
    if (!result) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ success: false, message: "Server error updating profile" });
  }
};

export const syncEmail = async (req, res) => {
  try {
    const uid = req.user.uid;
    const newEmail = await syncEmailWithFirebase(uid);
    console.log(`✅ Synced email for ${uid} to ${newEmail}`);
    res.json({ success: true, email: newEmail });
  } catch (err) {
    console.error("Sync email error:", err);
    if (err.message === "No email found on Firebase user" || err.message === "User not found in MongoDB") {
      res.status(400).json({ error: err.message });
    } else {
      res.status(500).json({ error: "Failed to sync email" });
    }
  }
};
