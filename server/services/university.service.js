import User from "../models/User.js";
import UniversityAnnouncement from "../models/UniversityAnnouncement.js";

export const getUserByFirebaseUid = async (uid) => {
  return User.findOne({ firebaseUid: uid }).select("_id role profile").lean();
};

export const createUniversityAnnouncement = async (payload) => {
  return UniversityAnnouncement.create(payload);
};

export const listUniversityAnnouncements = async (limit = 10) => {
  return UniversityAnnouncement.find({ kind: "announcement", isActive: true })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};
