import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  getMyClassrooms,
  getStudentAssignments,
  createNewAssignment,
  getClassAssignments,
  getMySubmissions,
  getAssignmentSubmissions,
  gradeSubmission,
  postDoubt,
  getDoubtsForTeacher,
  getDoubtsForStudent,
  replyToDoubt,
  getAllDoubts,
  getAssignmentInfo,
  submitAssignment,
  startQuiz,
  submitQuiz,
  flagCheat,
  deleteAssignment
} from "../controllers/assignment.controller.js";

const router = express.Router();

router.use(verifyFirebaseToken);

router.get("/my-classrooms", getMyClassrooms);
router.get("/student", getStudentAssignments);
router.post("/", createNewAssignment);
router.get("/class/:classroomId", getClassAssignments);
router.get("/my-submissions", getMySubmissions);
router.get("/:id/submissions", getAssignmentSubmissions);
router.patch("/:id/submissions/:studentId", gradeSubmission);
router.post("/:id/doubts", postDoubt);
router.get("/:id/doubts/teacher", getDoubtsForTeacher);
router.get("/:id/doubts/student", getDoubtsForStudent);
router.post("/:id/doubts/:doubtId/reply", replyToDoubt);
router.get("/:id/doubts", getAllDoubts);
router.get("/:id", getAssignmentInfo);
router.post("/:id/submit", submitAssignment);
router.post("/:id/start", startQuiz);
router.post("/:id/submit-quiz", submitQuiz);
router.post("/:id/flag-cheat", flagCheat);
router.delete("/:id", deleteAssignment);

export default router;
