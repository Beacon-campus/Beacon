import Timetable from "../models/TimeTable.js";

export const getWeeklyTimetableService = async (course, semesterNum, shiftNum) => {
  return await Timetable.findOne({
    course: course,
    semester: semesterNum,
    shift: shiftNum,
  });
};
