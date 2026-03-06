import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Doubt from "../models/Doubt.js";
import Message from "../models/Message.js";
import Channel from "../models/Channel.js";

export const getMe = async (uid) => {
  return User.findOne({ firebaseUid: uid });
};

export const pushNotification = async (user, notification) => {
  user.notifications = [notification, ...(user.notifications || [])];
  user.markModified("notifications");
  return user.save();
};

export const getUserById = async (id) => User.findById(id);

export const getClassroomById = async (id) => Classroom.findById(id);

export const getAssignmentById = async (id) => Assignment.findById(id);

export const getSubmission = async (query) => Submission.findOne(query);

export const createAssignment = async (data) => Assignment.create(data);

export const createMessage = async (data) => Message.create(data);

export const updateChannelLastMessage = async (channelId, text, senderId, sentAt) => {
  return Channel.findByIdAndUpdate(channelId, {
    lastMessage: { text, sender: senderId, sentAt },
  });
};

export const getStudentsInClassroom = async (studentIds) => {
  return User.find({ _id: { $in: studentIds }, role: "student" }).select("_id notifications profile email regno");
};

export const findAssignments = async (query, populateConf, sortConf) => {
  let req = Assignment.find(query);
  if (sortConf) req = req.sort(sortConf);
  if (populateConf) req = req.populate(populateConf[0], populateConf[1]);
  return req.lean();
};

export const findSubmissions = async (query) => Submission.find(query).lean();
export const createSubmission = async (data) => Submission.create(data);

export const createDoubt = async (data) => Doubt.create(data);
export const findDoubts = async (query, sortConf, populateConf) => {
  let req = Doubt.find(query);
  if (sortConf) req = req.sort(sortConf);
  if (populateConf) req = req.populate(populateConf[0], populateConf[1]);
  return req.lean();
};

export const findDoubtById = async (query) => Doubt.findOne(query);

export const deleteAssignmentCascade = async (assignmentId) => {
  await Assignment.findByIdAndDelete(assignmentId);
  await Submission.deleteMany({ assignmentId });
  await Doubt.deleteMany({ assignmentId });
  await Message.deleteMany({ assignmentId });
};
