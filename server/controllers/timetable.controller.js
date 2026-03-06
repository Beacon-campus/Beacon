import { getWeeklyTimetableService } from "../services/timetable.service.js";

export const getWeeklyTimetable = async (req, res) => {
  try {
    const { course, semester, shift } = req.query;

    if (!course || !semester || !shift) {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const semesterNum = parseInt(semester);
    let shiftNum = 1;
    if (shift && shift.toLowerCase() === "afternoon") shiftNum = 2;

    const timetable = await getWeeklyTimetableService(course, semesterNum, shiftNum);

    if (!timetable) {
      return res.status(404).json({ error: "Timetable not found" });
    }

    res.json(timetable.schedule);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
