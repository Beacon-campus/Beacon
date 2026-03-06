import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String },
    gifUrl: { type: String }, // Store GIPHY URL

    type: {
      type: String,
      enum: ["text", "image", "file", "note", "assignment"],
      default: "text",
    },
    noteData: { type: Object }, // Store note details if type is 'note'
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment" },

    // --- YOU MUST ADD THESE TWO FIELDS ---
    isDeleted: { type: Boolean, default: false },
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // -------------------------------------
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who have read the message
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
