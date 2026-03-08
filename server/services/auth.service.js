import User from "../models/User.js";
import admin from "firebase-admin";

export const findUserForLoginLookup = async (username) => {
  const user = await User.findOne({ regno: username }).lean();
  if (!user) return null;
  const safeRegNo = user.regno ? user.regno.toLowerCase() : "unknown";
  const email = user.email && user.email !== "" ? user.email : `${safeRegNo}@nexus.local`;
  return { email };
};

export const getMeDetails = async (uid, email) => {
  let mongoUser = await User.findOne({
    $or: [{ firebaseUid: uid }, { email: email }],
  })
  .populate("enrolledClassroomIds")
  .lean();

  if (!mongoUser) {
    console.log(`⚠️ User ${uid} missing in Mongo. Attempting recovery...`);
    const fsSnap = await admin.firestore().collection("users").doc(uid).get();

    if (!fsSnap.exists) {
      return null;
    }

    const d = fsSnap.data();
    const recoveredName = d.realName || d.displayName || "User";

    const newUser = await User.create({
      firebaseUid: uid,
      email: d.email || email,
      role: d.role || "student",
      regno: d.regno || "",
      profile: {
        name: recoveredName,
        displayName: recoveredName,
        avatar: d.profileImageId || (d.role === "teacher" ? 1 : 11),
        department: d.department || "",
        course: d.course || "",
        semester: 0,
        shift: "Morning",
        regno: d.regno || "",
      },
      onboardingComplete: false,
    });

    mongoUser = newUser.toObject();
  }

  const userProfile = mongoUser.profile || {};
  let finalRegno = "N/A";

  if (userProfile.regno && userProfile.regno.trim() !== "") {
    finalRegno = userProfile.regno;
  } else if (mongoUser.regno && mongoUser.regno.trim() !== "") {
    finalRegno = mongoUser.regno;
  }

  return {
    uid,
    _id: mongoUser._id,
    email: mongoUser.email,
    role: mongoUser.role,
    regno: finalRegno,
    course: userProfile.course || "",
    department: userProfile.department || "",
    profile: {
      name: userProfile.name || "User",
      displayName: userProfile.displayName || userProfile.name || "User",
      avatar: userProfile.avatar || 11,
      course: userProfile.course || "",
      department: userProfile.department || "",
      semester: userProfile.semester,
      shift: userProfile.shift,
      regno: finalRegno,
      about: userProfile.about || "",
      bannerColor: userProfile.bannerColor || "",
    },
    enrolledClassroomIds: mongoUser.enrolledClassroomIds || [], 
    friends: mongoUser.friends || [],
    friendRequests: mongoUser.friendRequests || { sent: [], received: [] },
    notifications: mongoUser.notifications || [],
    requiresOnboarding: mongoUser.onboardingComplete !== true,
  };
};

export const validateAvatar = (role, imageId) => {
  const id = parseInt(imageId);
  if (isNaN(id)) return role === "teacher" ? 1 : 11;

  if (role === "teacher") {
    return id >= 1 && id <= 10 ? id : 1;
  } else {
    return id >= 11 && id <= 19 ? id : 11;
  }
};

export const updateProfileDetails = async (uid, updates) => {
  const user = await User.findOne({ firebaseUid: uid });
  if (!user) return null;

  if (!user.profile) {
    user.profile = {};
  }

  const { displayName, avatarId, about, bannerColor } = updates;

  if (displayName !== undefined) user.profile.displayName = displayName;
  if (avatarId !== undefined) user.profile.avatar = validateAvatar(user.role, avatarId);
  if (about !== undefined) user.profile.about = about;
  if (bannerColor !== undefined) user.profile.bannerColor = bannerColor;

  await user.save();

  return {
    displayName: user.profile.displayName,
    avatar: user.profile.avatar,
    about: user.profile.about,
    bannerColor: user.profile.bannerColor
  };
};

export const syncEmailWithFirebase = async (uid) => {
  const fbUser = await admin.auth().getUser(uid);
  const newEmail = fbUser.email;

  if (!newEmail) {
    throw new Error("No email found on Firebase user");
  }

  const updatedUser = await User.findOneAndUpdate(
    { firebaseUid: uid },
    {
      email: newEmail,
      $set: { "profile.email": newEmail }
    },
    { returnDocument: 'after' }
  );

  if (!updatedUser) {
    throw new Error("User not found in MongoDB");
  }

  return newEmail;
};
