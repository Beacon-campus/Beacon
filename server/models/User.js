import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    }, 

    profile: {
      regno: { type: String },
      name: { type: String },
      displayName: { type: String },
      avatar: { type: Number, default: 11 },
      department: { type: String },
      course: { type: String },
      semester: { type: Number },
      shift: { type: String },
      about: { type: String, maxlength: 300 },
      bannerColor: { type: String },
    },

    // FRIEND SYSTEM (Student Only)
    friends: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    friendRequests: {
      sent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      received: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },
    notifications: {
      type: Array,
      default: [],
    },

    // --- ADD THIS SECTION ---
    enrolledClassroomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Classroom" }],
    // ------------------------

    disabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);