import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema({
    assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Assignment", required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Stored attachment metadata from uploads (or legacy string path).
    file: { type: mongoose.Schema.Types.Mixed }, // Not required for quiz

    // Quiz Specifics
    isCheated: { type: Boolean, default: false },
    answers: { type: Object }, // Flexible JSON object for answers
    score: { type: Number },
    attempts: { type: Number, default: 0 },

    submittedAt: { type: Date }, // Set ONLY when actually submitted
    grade: { type: Number }, // Optional, for later
    feedback: { type: String }
});

// Compound index to prevent multiple submissions if needed, 
// or maybe allow multiple? For now, allowing multiple is safer, but finding latest is key.
// Let's enforce 1 submission per assignment per student for simplicity?
// Or just let them resubmit and we show latest.

export default mongoose.model("Submission", submissionSchema);
