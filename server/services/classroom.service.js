import Classroom from "../models/Classroom.js";
import Announcement from "../models/Announcement.js";
import Comment from "../models/Comment.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const getMeService = async (uid) => {
  return await User.findOne({ firebaseUid: uid });
};

export const getTeacherClassrooms = async (query) => {
  return await Classroom.find(query).select("_id name metadata subjects").lean();
};

export const getStudentClassrooms = async (classroomIds) => {
  return await Classroom.find({ _id: { $in: classroomIds } })
    .select("_id name metadata subjects").lean();
};

export const getClassroomById = async (id) => {
  return await Classroom.findById(id);
};

export const getAnnouncementsByChannel = async (channelId) => {
  return await Announcement.find({ classroomId: channelId })
    .populate("teacherId", "profile.name profile.avatar")
    .sort({ createdAt: -1 });
};

export const getAnnouncementsPageByChannel = async (channelId, limit = 30, before = null) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  const query = { classroomId: channelId };

  if (before && mongoose.Types.ObjectId.isValid(before)) {
    query._id = { $lt: new mongoose.Types.ObjectId(before) };
  }

  const docs = await Announcement.find(query)
    .populate("teacherId", "profile.name profile.avatar")
    .sort({ _id: -1 })
    .limit(safeLimit + 1);

  const hasMore = docs.length > safeLimit;
  const slice = hasMore ? docs.slice(0, safeLimit) : docs;
  const posts = slice.reverse();
  const nextBefore = posts.length > 0 ? String(posts[0]._id) : null;

  return {
    posts,
    pageInfo: {
      hasMore,
      nextBefore,
      limit: safeLimit,
    },
  };
};

export const getCommentsByAnnouncement = async (announcementId) => {
  return await Comment.find({ parentId: announcementId })
    .sort({ createdAt: 1 })
    .populate("userId", "role profile.avatar profile.name");
};

export const createCommentService = async (data) => {
  return await Comment.create(data);
};

export const createAnnouncementService = async (data) => {
  return await Announcement.create(data);
};

export const getCommentById = async (id) => {
  return await Comment.findById(id);
};

export const getDetailedClassroomById = async (id) => {
  let classroom = await Classroom.findById(id)
    .populate("subjects.teacherIds", "profile.name profile.avatar role email")
    .populate("studentIds", "profile.name profile.avatar role email");

  if (!classroom) {
    classroom = await Classroom.findOne({ officialChannelId: id })
      .populate("subjects.teacherIds", "profile.name profile.avatar role email")
      .populate("studentIds", "profile.name profile.avatar role email");
  }
  return classroom;
};

export const updateClassroomDescription = async (id, description) => {
  return await mongoose.model("Classroom").findByIdAndUpdate(
    id,
    { description },
    { returnDocument: 'after' }
  );
};
