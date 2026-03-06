import Channel from "../models/Channel.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import mongoose from "mongoose";

export const getUserByUid = async (uid) => {
  return await User.findOne({ firebaseUid: uid });
};

export const getUserById = async (id) => {
  return await User.findById(id);
};

export const getUserByRegno = async (regno) => {
  return await User.findOne({ 
      "profile.regno": { $regex: new RegExp(`^${regno}$`, "i") }
  });
};

export const getUsersInRegnos = async (regnos) => {
  return await User.find({ "profile.regno": { $in: regnos } });
};

export const getTeacherUsers = async (teacherIds) => {
  return await User.find({
    _id: { $in: teacherIds },
    role: "teacher",
  }).select("_id firebaseUid role profile.name profile.avatar profile.regno");
};

export const getChannelsByParticipant = async (userId) => {
  return await Channel.find({ participants: userId })
    .populate("participants", "profile.name profile.avatar profile.regno firebaseUid role")
    .sort({ "lastMessage.sentAt": -1 });
};

export const getChannelById = async (channelId) => {
  return await Channel.findById(channelId);
};

export const getUnreadMessageCount = async (channelId, lastReadAt, userId) => {
  return await Message.countDocuments({
      channelId: channelId,
      createdAt: { $gt: lastReadAt },
      sender: { $ne: userId },
      deletedFor: { $ne: userId }
  });
};

export const getVisibleMessages = async (channelId, userId) => {
  return await Message.find({
      channelId: channelId,
      deletedFor: { $ne: userId }
  }).sort({ createdAt: -1 }).limit(1);
};

export const getUnreadAssignmentMessageCount = async (channelId, lastReadAt, userId, teacherId = null) => {
  const query = {
    channelId: channelId,
    createdAt: { $gt: lastReadAt },
    sender: { $ne: userId },
    deletedFor: { $ne: userId },
    type: "assignment",
  };

  if (teacherId) {
    query.sender = teacherId;
  }

  return await Message.countDocuments(query);
};

export const getLatestVisibleAssignmentMessage = async (channelId, userId, teacherId = null) => {
  const query = {
    channelId: channelId,
    deletedFor: { $ne: userId },
    type: "assignment",
  };

  if (teacherId) {
    query.sender = teacherId;
  }

  return await Message.findOne(query).sort({ createdAt: -1 });
};

export const getClassroomsForStudent = async (studentId) => {
  return await Classroom.find({ studentIds: studentId })
    .select("_id name officialChannelId subjects")
    .lean();
};

export const getMessagesByChannel = async (channelId) => {
  return await Message.find({ channelId: channelId })
    .populate("sender", "profile.name profile.avatar firebaseUid")
    .populate("assignmentId", "title type")
    .sort({ createdAt: 1 });
};

export const getMessagesPageByChannel = async (channelId, limit = 30, before = null) => {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 30, 100));
  const query = { channelId };

  if (before && mongoose.Types.ObjectId.isValid(before)) {
    query._id = { $lt: new mongoose.Types.ObjectId(before) };
  }

  const docs = await Message.find(query)
    .populate("sender", "profile.name profile.avatar firebaseUid")
    .populate("assignmentId", "title type")
    .sort({ _id: -1 })
    .limit(safeLimit + 1);

  const hasMore = docs.length > safeLimit;
  const slice = hasMore ? docs.slice(0, safeLimit) : docs;
  const messages = slice.reverse();
  const nextBefore = messages.length > 0 ? String(messages[0]._id) : null;

  return {
    messages,
    pageInfo: {
      hasMore,
      nextBefore,
      limit: safeLimit,
    },
  };
};

export const getClassmatesForGroups = async (course, semester, currentUserId) => {
  return await User.find({
    $or: [
      {
        role: "student",
        "profile.course": course,
        "profile.semester": semester,
        _id: { $ne: currentUserId }
      },
      { role: "teacher" } // Teachers included only for groups
    ]
  }).select("profile.name profile.regno profile.avatar role");
};

export const getClassmatesForDMs = async (course, semester, currentUserId) => {
  return await User.find({
    role: "student",
    "profile.course": course,
    "profile.semester": semester,
    _id: { $ne: currentUserId }
  }).select("profile.name profile.regno profile.avatar role");
};

export const getClassmatesForTeacher = async (department, course, currentUserId) => {
  return await User.find({
    $or: [
      { role: "teacher", "profile.department": department, _id: { $ne: currentUserId } },
      { role: "student", "profile.course": course }
    ]
  }).select("profile.name profile.regno profile.avatar role");
};

export const getGroupDetailsWithPopulate = async (groupId) => {
  return await Channel.findById(groupId)
    .populate("participants", "profile.name profile.avatar profile.regno role")
    .populate("admin", "profile.name profile.avatar");
};

export const updateChannelLastMessageAndSave = async (channelId, description, deadline, adminId, userId) => {
  const channel = await Channel.findById(channelId);
  if (!channel) return null;

  channel.description = description;
  if (deadline !== undefined) {
    if (channel.admin.toString() !== userId.toString()) {
      throw new Error("Only admin can extend deadlines.");
    }
    channel.deadline = deadline;
  }
  await channel.save();
  return channel;
};

export const getDmChannelByParticipants = async (user1Id, user2Id) => {
  return await Channel.findOne({
    type: "dm",
    participants: { $all: [user1Id, user2Id] },
  });
};

export const createDmChannel = async (user1Id, user2Id) => {
  return await Channel.create({
    type: "dm",
    participants: [user1Id, user2Id],
    lastMessage: {
      text: "Chat started",
      sender: user1Id,
      sentAt: new Date(),
    },
  });
};

export const getPopulatedChannel = async (channelId) => {
  return await Channel.findById(channelId).populate(
    "participants",
    "profile.name profile.avatar profile.regno role firebaseUid"
  );
};

export const createProjectGroupChannel = async (name, goal, deadline, adminId, participants) => {
  return await Channel.create({
    name,
    type: "project_group",
    goal,
    deadline,
    admin: adminId,
    participants,
    lastMessage: {
      text: `Group "${name}" created`,
      sender: adminId,
      sentAt: new Date(),
    },
  });
};

export const syncClassroomsForUser = async (user, classroomsToSync) => {
  for (const room of classroomsToSync) {
    await Channel.findOneAndUpdate(
      {
        type: "classroom",
        classroomMode: room.classroomMode,
        course: user.profile.course,
        semester: user.profile.semester,
      },
      {
        $setOnInsert: {
          name: room.name,
          admin: user._id,
          lastMessage: {
            text: "Classroom ready",
            sentAt: new Date(),
            sender: user._id,
          },
        },
        $addToSet: { participants: { $each: room.allParticipantIds } },
      },
      { upsert: true, new: true }
    );
  }
};

export const createNewMessage = async (channelId, senderId, text) => {
  return await Message.create({
    channelId,
    sender: senderId,
    text,
  });
};

export const updateChannelLastMessage = async (channelId, text, senderId) => {
  return await Channel.findByIdAndUpdate(channelId, {
    lastMessage: {
      text,
      sender: senderId,
      sentAt: new Date(),
    },
  });
};

export const getPopulatedMessage = async (messageId) => {
  return await Message.findById(messageId).populate(
    "sender",
    "profile.name profile.avatar firebaseUid role"
  );
};

export const getMessageById = async (messageId) => {
  return await Message.findById(messageId);
};

export const getLatestMessageForChannel = async (channelId) => {
  return await Message.find({ channelId: channelId })
    .sort({ createdAt: -1 })
    .limit(1);
};

export const updateChannelLastMessageDeleted = async (channelId) => {
  return await Channel.findByIdAndUpdate(channelId, {
    "lastMessage.text": "🚫 This message was deleted",
    "lastMessage.isDeleted": true
  });
};

export const removeParticipantFromChannel = async (groupId, userId) => {
  const group = await Channel.findById(groupId);
  if (!group) return null;
  group.participants = group.participants.filter(
    (id) => id.toString() !== userId
  );
  if (group.participants.length === 0) {
    await Channel.findByIdAndDelete(groupId);
    return { deleted: true };
  }
  await group.save();
  return group;
};

export const deleteChannelById = async (groupId) => {
  return await Channel.findByIdAndDelete(groupId);
};
