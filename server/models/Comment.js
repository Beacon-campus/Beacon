import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Announcement" }, // Which announcement is this doubt for?
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null }, // Threading
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userName: String,
  userAvatar: Number,
  content: String,
  isResolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Comment", commentSchema);
