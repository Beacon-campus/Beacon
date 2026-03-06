import mongoose from "mongoose";

const doubtSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    isResolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    replies: [
        {
            teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            text: { type: String },
            mode: { type: String, enum: ["private", "broadcast"], default: "private" },
            createdAt: { type: Date, default: Date.now }
        }
    ],
    reply: {
        text: { type: String },
        repliedAt: { type: Date },
        visibility: { type: String, enum: ["private", "broadcast"], default: "private" }
    }
}, { timestamps: true });

export default mongoose.model("Doubt", doubtSchema);
