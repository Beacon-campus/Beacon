import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  date: Date,
  dateString: String,
  day: String,
  title: String,
  description: String,
  type: String,
  isWorkingDay: Boolean,
});

const calendarSchema = new mongoose.Schema({
  academicYear: { type: String, required: true, unique: true },
  oddSemUrl: { type: String, default: "" },
  evenSemUrl: { type: String, default: "" },
  events: [eventSchema],
}, { 
  timestamps: true,
  collection: "calender" // <--- ADD THIS LINE (Must match your DB exactly)
});

export default mongoose.model("AcademicCalendar", calendarSchema);