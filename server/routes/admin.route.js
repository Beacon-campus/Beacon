import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  verifyAdminRole,
  getAllUsersAction,
  createUserAction,
  toggleUserStatusAction,
  updateUserAction,
  deleteUserAction,
  getClassroomsAction,
  createClassroomAction,
  bulkCreateClassroomsAction,
  addSubjectToClassroomAction,
  assignTeachersToSubjectAction,
  deleteClassroomAction,
  deleteCourseClassroomsAction,
  getDashboardOverviewAction,
  getDashboardTimelineAction,
  getServerLogsAction,
} from "../controllers/admin.controller.js";

const router = express.Router();

router.use(verifyFirebaseToken);
router.use(verifyAdminRole);

router.get("/users", getAllUsersAction);
router.get("/dashboard/overview", getDashboardOverviewAction);
router.get("/dashboard/timeline", getDashboardTimelineAction);
router.get("/logs", getServerLogsAction);
router.post("/users", createUserAction);
router.put("/users/:id/status", toggleUserStatusAction);
router.put("/users/:id", updateUserAction);
router.delete("/users/:id", deleteUserAction);

router.get("/classrooms", getClassroomsAction);
router.post("/classrooms", createClassroomAction);
router.post("/classrooms/bulk", bulkCreateClassroomsAction);
router.post("/classrooms/:id/subjects", addSubjectToClassroomAction);
router.put("/classrooms/:id/subjects/:subjectId/teachers", assignTeachersToSubjectAction);
router.delete("/classrooms/:id", deleteClassroomAction);
router.delete("/classrooms/course/:courseName", deleteCourseClassroomsAction);

export default router;
