import mongoose from "mongoose";

const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    instructions: { type: String }, // Can be question or description
    type: {
        type: String,
        enum: ["offline", "quiz", "qna"],
        default: "offline"
    },
    deadline: { type: Date, required: true },
    totalMarks: { type: Number, required: true },

    // Relations
    classroomId: { type: String, required: true }, // Changed to String to support mock IDs or ObjectIds
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // Dynamic Content based on type
    content: {
        // For Quiz
        quizMode: { type: String, enum: ["manual", "excel"] },
        questions: [
            {
                id: Number,
                question: String,
                options: [String],
                answer: String,
                marks: { type: Number, default: 0 }
            }
        ],
        file: String, // For excel uploads

        // For QnA/Project, we might just use instructions, or add specific fields here later
    },

    // For tracking submissions (Optional, but good for quick access)
    submissions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],

    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Assignment", assignmentSchema);
