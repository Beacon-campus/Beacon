import mongoose from "mongoose";

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    // ✅ RENAMED from ownerId to userId
    userId: {
      type: String, // Storing Firebase UID
      required: true,
      index: true, 
    },
    role: {
      type: String,
      enum: ["student", "teacher"], 
      default: "student",
    },
  },
  {
    timestamps: true, 
  }
);

export default mongoose.model("Todo", todoSchema);