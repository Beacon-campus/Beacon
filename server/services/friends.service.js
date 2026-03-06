import User from "../models/User.js";
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

export const getUsersByIds = async (userIds) => {
  return await User.find({
      _id: { $in: userIds }
  });
};

export const getUserByIdentifier = async (id) => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const user = await User.findById(id).select("-password -friends -friendRequests -notifications");
    if(user) return user;
  }
  return await User.findOne({ firebaseUid: id }).select("-password -friends -friendRequests -notifications");
};

export const saveUser = async (user) => {
  return await user.save();
};

export const saveUsers = async (user1, user2) => {
  await user1.save();
  await user2.save();
};

export const getMyFriendStatus = async (uid) => {
  return await User.findOne({ firebaseUid: uid }).select("friends friendRequests");
};
