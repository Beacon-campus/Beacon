import express from "express";
import verifyFirebaseToken from "../middleware/auth.js";
import {
  getTeacherStudyMaterials,
  getStudentStudyMaterials,
  uploadStudyMaterial,
  renameStudyMaterial,
  deleteStudyMaterial,
  getAnnouncements,
  getComments,
  postComment,
  postAnnouncement,
  resolveComment,
  getClassroomDetails,
  updateDescription
} from "../controllers/classroom.controller.js";

const router = express.Router();

router.get("/study-materials/teacher", verifyFirebaseToken, getTeacherStudyMaterials);
router.get("/study-materials/student", verifyFirebaseToken, getStudentStudyMaterials);
router.post("/study-materials/:classroomId/subjects/:subjectId/uploads", verifyFirebaseToken, uploadStudyMaterial);
router.patch("/study-materials/:classroomId/subjects/:subjectId/uploads/:uploadId", verifyFirebaseToken, renameStudyMaterial);
router.delete("/study-materials/:classroomId/subjects/:subjectId/uploads/:uploadId", verifyFirebaseToken, deleteStudyMaterial);

router.get("/announcements/:channelId", verifyFirebaseToken, getAnnouncements);
router.get("/comments/:announcementId", verifyFirebaseToken, getComments);
router.post("/comment", verifyFirebaseToken, postComment);
router.post("/announcement", verifyFirebaseToken, postAnnouncement);
router.put("/comment/:commentId/resolve", verifyFirebaseToken, resolveComment);

router.get("/details/:id", verifyFirebaseToken, getClassroomDetails);
router.put("/description", verifyFirebaseToken, updateDescription);

export default router;
