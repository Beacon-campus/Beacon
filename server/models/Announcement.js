import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema({
  classroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" }, // Linking to the Channel ID for simplicity
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  senderName: String,
  content: String,
  type: { type: String, enum: ["text", "image", "file", "note"], default: "text" },
  noteData: { type: Object, default: null },
  priority: { type: String, default: "normal" }, // "normal", "high"
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Announcement", announcementSchema);
