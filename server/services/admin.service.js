import admin from "firebase-admin";
import mongoose from "mongoose";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Channel from "../models/Channel.js";
import Message from "../models/Message.js";

export const getAllMongoUsers = async () => {
  return await User.find({}).select("firebaseUid email role regno profile disabled createdAt").lean();
};

export const getAllFirestoreUsers = async () => {
  const snap = await admin.firestore().collection('users').get();
  const docs = {};
  snap.forEach(doc => { docs[doc.id] = doc.data(); });
  return docs;
};

export const getMongoUserById = async (id) => {
  return await User.findById(id);
};

export const getMongoUserByFirebaseUid = async (uid) => {
  return await User.findOne({ firebaseUid: uid }).lean();
};

export const createFirestoreUser = async (uid, data) => {
  await admin.firestore().collection("users").doc(uid).set({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
};

export const deleteFirestoreUser = async (uid) => {
  await admin.firestore().collection("users").doc(uid).delete();
};

export const getAllClassrooms = async () => {
  return await Classroom.find({})
    .populate({
      path: "subjects.teacherIds",
      select: "profile.name email profile.displayName",
    })
    .lean()
    .sort({ createdAt: -1 });
};

export const findStudentsByCriteria = async (criteria, session) => {
  return await User.find(criteria).session(session);
};

export const getClassroomsByCourse = async (courseName, session) => {
  return await Classroom.find({ "metadata.course": courseName }).session(session);
};

export const deleteChannelsByIds = async (channelIds, session) => {
  await Message.deleteMany({ channelId: { $in: channelIds } }).session(session);
  await Channel.deleteMany({ _id: { $in: channelIds } }).session(session);
};

export const removeClassroomsFromUsers = async (classroomIds, session) => {
  await User.updateMany(
    { enrolledClassroomIds: { $in: classroomIds } },
    { $pull: { enrolledClassroomIds: { $in: classroomIds } } }
  ).session(session);
};

export const deleteClassroomsByIds = async (classroomIds, session) => {
  await Classroom.deleteMany({ _id: { $in: classroomIds } }).session(session);
};
