import mongoose from "mongoose";

const slotSchema = new mongoose.Schema({
  startTime: { type: String, required: true }, // Format: "HH:mm" (e.g., "09:15")
  endTime: { type: String, required: true },   // Format: "HH:mm" (e.g., "10:05")
  subject: { type: String, required: true },   // e.g., "IoT-SY"
  teacher: { type: String, default: "" },      // e.g., "Ms. Saranya"
  room: { type: String, default: "" },         // e.g., "N207/208"
  type: { type: String, enum: ["Lecture", "Lab", "Break"], default: "Lecture" }
});

const daySchema = new mongoose.Schema({
  day: { type: String, required: true }, // "Monday", "Tuesday", etc.
  slots: [slotSchema]
});

const timetableSchema = new mongoose.Schema({
  course: { type: String, required: true },   // "BCA"
  semester: { type: Number, required: true }, // 6
  shift: { type: Number, default: 1 },        // 2 (as per your request)
  schedule: [daySchema] // Array of 6 days (Mon-Sat)
}, { timestamps: true });

export default mongoose.model("Timetable", timetableSchema);