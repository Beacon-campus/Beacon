import Timetable from "../models/TimeTable.js";

export const getWeeklyTimetableService = async (query) => {
  return Timetable.findOne(query);
};
