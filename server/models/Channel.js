import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      // Added "classroom" to support your Official/Unofficial chats
      enum: ["dm", "project_group", "community", "classroom"],
      default: "dm",
    },

    name: String,

    // --- NEW FIELDS FOR PROJECT GROUPS ---
    goal: { type: String }, // Matches your UI "Goal"
    deadline: { type: String }, // Matches your UI "End Date"

    // Who created the group? (You need this to know who can delete/edit it)
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // --- NEW FIELDS FOR CLASSROOMS (Auto-Add) ---
    // 'official' = Teachers post, 'unofficial' = Students chat
    classroomMode: {
      type: String,
      enum: ["official", "unofficial", null],
      default: null,
    },
    course: { type: String }, // e.g. "BCA" to match students
    semester: { type: Number }, // e.g. 6 to match students

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    lastMessage: {
      text: String,
      // Updated to ObjectId so we can show the sender's name/avatar
      sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      sentAt: { type: Date, default: Date.now },
    },

    // --- READ STATUS TRACKING ---
    readStatus: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        lastReadAt: { type: Date, default: Date.now }
    }],
  },
  { timestamps: true }
); // Automatically adds createdAt and updatedAt

export default mongoose.model("Channel", channelSchema);
