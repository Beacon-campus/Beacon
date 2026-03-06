import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      default: "",
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "default", // default, red, orange, yellow, green, teal, blue, darkBlue, purple, pink, brown, gray
    },
    userId: {
      type: String, // Firebase UID
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["student", "teacher"],
      default: "student",
    },
    category: {
      type: String,
      default: "",
    },
    watermark: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Note", noteSchema);
