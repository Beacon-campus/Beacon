import { getWeeklyTimetableService } from "../services/timetable.service.js";

const parseShift = (rawShift) => {
  if (!rawShift) return null;
  const normalized = String(rawShift).trim().toLowerCase();
  if (normalized === "1" || normalized === "morning") return 1;
  if (normalized === "2" || normalized === "afternoon") return 2;
  const numeric = Number(normalized);
  if (!Number.isNaN(numeric)) return numeric;
  return null;
};

export const getWeeklyTimetable = async (req, res) => {
  try {
    const { course, semester, shift, department } = req.query;

    const shiftNum = parseShift(shift);
    if (!shiftNum) {
      return res.status(400).json({ error: "Missing or invalid shift" });
    }

    let query = null;

    if (department && !course && !semester) {
      query = {
        department: String(department),
        shift: shiftNum,
      };
    } else if (course && semester) {
      const semesterNum = parseInt(semester, 10);
      if (Number.isNaN(semesterNum)) {
        return res.status(400).json({ error: "Invalid semester" });
      }
      query = {
        course: String(course),
        semester: semesterNum,
        shift: shiftNum,
      };
    } else {
      return res.status(400).json({ error: "Missing parameters" });
    }

    const timetable = await getWeeklyTimetableService(query);

    if (!timetable) {
      return res.status(200).json({ exists: false, schedule: [] });
    }

    res.json({ exists: true, schedule: timetable.schedule || [] });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
