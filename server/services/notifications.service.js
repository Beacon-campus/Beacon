import User from "../models/User.js";

export const getUserNotifications = async (firebaseUid) => {
    return await User.findOne({ firebaseUid }).select("notifications");
};

export const getUserByUid = async (firebaseUid) => {
    return await User.findOne({ firebaseUid });
};

export const saveUser = async (user) => {
    return await user.save();
};
