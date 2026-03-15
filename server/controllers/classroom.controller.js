import {
  getMeService,
  getTeacherClassrooms,
  getStudentClassrooms,
  getClassroomById,
  getAnnouncementsByChannel,
  getAnnouncementsPageByChannel,
  getCommentsByAnnouncement,
  createCommentService,
  createAnnouncementService,
  getCommentById,
  getDetailedClassroomById,
  updateClassroomDescription
} from "../services/classroom.service.js";
import { createLogFromRequest } from "../services/logs.service.js";

export const getTeacherStudyMaterials = async (req, res) => {
  try {
    const me = await getMeService(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!["teacher", "admin"].includes(me.role)) {
      return res.status(403).json({ error: "Only teachers/admin can access this endpoint" });
    }

    const query = me.role === "admin" ? {} : { "subjects.teacherIds": me._id };
    const classrooms = await getTeacherClassrooms(query);

    const payload = classrooms.map((cls) => ({
      _id: String(cls._id),
      name: cls.name,
      metadata: cls.metadata || {},
      subjects: (cls.subjects || [])
        .filter((sub) => me.role === "admin" || (sub.teacherIds || []).some((t) => String(t) === String(me._id)))
        .map((sub) => ({
          _id: String(sub._id),
          code: sub.code,
          name: sub.name,
          uploads: (sub.uploads || []).map((u) => ({
            _id: String(u._id),
            name: u.name,
            type: u.type,
            mimeType: u.mimeType || u.type,
            cloudinary: u.cloudinary || null,
            previewUrl: u.previewUrl || null,
            previewDownloadUrl: u.previewDownloadUrl || null,
            previewPath: u.previewPath || null,
            previewType: u.previewType || null,
            previewStatus: u.previewStatus || null,
            previewError: u.previewError || null,
            size: Number(u.size || 0),
            uploadedBy: u.uploadedBy ? String(u.uploadedBy) : null,
            uploadedAt: u.uploadedAt,
          })),
        })),
    }));

    res.json(payload);
  } catch (error) {
    console.error("GET /api/classroom/study-materials/teacher failed:", error);
    res.status(500).json({ error: "Failed to fetch teacher study materials" });
  }
};

export const getStudentStudyMaterials = async (req, res) => {
  try {
    const me = await getMeService(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") {
      return res.status(403).json({ error: "Only students can access this endpoint" });
    }

    const classroomIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    const classrooms = await getStudentClassrooms(classroomIds);

    const payload = classrooms.map((cls) => ({
      _id: String(cls._id),
      name: cls.name,
      metadata: cls.metadata || {},
      subjects: (cls.subjects || []).map((sub) => ({
        _id: String(sub._id),
        code: sub.code,
        name: sub.name,
        uploads: (sub.uploads || []).map((u) => ({
          _id: String(u._id),
          name: u.name,
          type: u.type,
          mimeType: u.mimeType || u.type,
          cloudinary: u.cloudinary || null,
          previewUrl: u.previewUrl || null,
          previewDownloadUrl: u.previewDownloadUrl || null,
          previewPath: u.previewPath || null,
          previewType: u.previewType || null,
          previewStatus: u.previewStatus || null,
          previewError: u.previewError || null,
          size: Number(u.size || 0),
          uploadedBy: u.uploadedBy ? String(u.uploadedBy) : null,
          uploadedAt: u.uploadedAt,
        })),
      })),
    }));

    res.json(payload);
  } catch (error) {
    console.error("GET /api/classroom/study-materials/student failed:", error);
    res.status(500).json({ error: "Failed to fetch student study materials" });
  }
};

export const uploadStudyMaterial = async (req, res) => {
  try {
    const me = await getMeService(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!["teacher", "admin"].includes(me.role)) {
      return res.status(403).json({ error: "Only teachers/admin can upload study materials" });
    }

    const { classroomId, subjectId } = req.params;
    const {
      name,
      type,
      mimeType,
      cloudinary,
      previewUrl,
      previewDownloadUrl,
      previewPath,
      previewType,
      previewStatus,
      previewError,
      size,
    } = req.body;
    const resolvedMimeType = mimeType || type;
    if (!name || !resolvedMimeType || !cloudinary?.secureUrl || !cloudinary?.publicId) {
      return res.status(400).json({ error: "name, mimeType and cloudinary metadata are required" });
    }

    const classroom = await getClassroomById(classroomId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const subject = classroom.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ error: "Subject not found" });

    if (me.role === "teacher") {
      const isAssigned = (subject.teacherIds || []).some((tid) => String(tid) === String(me._id));
      if (!isAssigned) {
        return res.status(403).json({ error: "You are not assigned to this subject" });
      }
    }

    subject.uploads = subject.uploads || [];
    subject.uploads.push({
      name: String(name).trim(),
      type: "file",
      mimeType: String(resolvedMimeType).trim(),
      cloudinary: {
        publicId: String(cloudinary.publicId || "").trim(),
        version: Number(cloudinary.version || 0) || null,
        resourceType: String(cloudinary.resourceType || "").trim(),
        format: String(cloudinary.format || "").trim(),
        secureUrl: String(cloudinary.secureUrl || "").trim(),
      },
      previewUrl: previewUrl ? String(previewUrl).trim() : undefined,
      previewDownloadUrl: previewDownloadUrl ? String(previewDownloadUrl).trim() : undefined,
      previewPath: previewPath ? String(previewPath).trim() : undefined,
      previewType: previewType ? String(previewType).trim() : undefined,
      previewStatus: previewStatus ? String(previewStatus).trim() : undefined,
      previewError: previewError ? String(previewError).trim() : undefined,
      size: Number(size || 0),
      uploadedBy: me._id,
      uploadedAt: new Date(),
    });

    await classroom.save();

    const uploaded = subject.uploads[subject.uploads.length - 1];
    await createLogFromRequest(req, {
      eventType: "STUDY_MATERIAL_UPLOAD",
      category: "media",
      action: "upload_study_material",
      status: "success",
      message: "Study material uploaded to classroom subject",
      metadata: {
        classroomId: String(classroomId),
        subjectId: String(subjectId),
        uploadId: String(uploaded._id),
        fileName: uploaded.name,
        fileType: uploaded.mimeType || uploaded.type,
        size: Number(uploaded.size || 0),
        publicId: uploaded.cloudinary?.publicId || "",
      },
      target: { type: "classroom", id: String(classroomId) },
    });

    res.status(201).json({
      message: "Study material uploaded",
      upload: {
        _id: String(uploaded._id),
        name: uploaded.name,
        type: uploaded.type,
        mimeType: uploaded.mimeType || uploaded.type,
        cloudinary: uploaded.cloudinary || null,
        previewUrl: uploaded.previewUrl || null,
        previewDownloadUrl: uploaded.previewDownloadUrl || null,
        previewPath: uploaded.previewPath || null,
        previewType: uploaded.previewType || null,
        previewStatus: uploaded.previewStatus || null,
        previewError: uploaded.previewError || null,
        size: Number(uploaded.size || 0),
        uploadedBy: uploaded.uploadedBy ? String(uploaded.uploadedBy) : null,
        uploadedAt: uploaded.uploadedAt,
      },
    });
  } catch (error) {
    await createLogFromRequest(req, {
      eventType: "STUDY_MATERIAL_UPLOAD",
      category: "media",
      action: "upload_study_material",
      status: "failure",
      message: "Study material upload failed",
      metadata: {
        classroomId: req.params?.classroomId || "",
        subjectId: req.params?.subjectId || "",
      },
    });
    console.error("POST /api/classroom/study-materials/:classroomId/subjects/:subjectId/uploads failed:", error);
    res.status(500).json({ error: "Failed to upload study material" });
  }
};

export const renameStudyMaterial = async (req, res) => {
    try {
      const me = await getMeService(req.user.uid);
      if (!me) return res.status(404).json({ error: "User not found" });
      if (!["teacher", "admin"].includes(me.role)) {
        return res.status(403).json({ error: "Only teachers/admin can update study materials" });
      }

      const { classroomId, subjectId, uploadId } = req.params;
      const { name } = req.body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "name is required" });
      }

      const classroom = await getClassroomById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      const subject = classroom.subjects.id(subjectId);
      if (!subject) return res.status(404).json({ error: "Subject not found" });

      if (me.role === "teacher") {
        const isAssigned = (subject.teacherIds || []).some((tid) => String(tid) === String(me._id));
        if (!isAssigned) {
          return res.status(403).json({ error: "You are not assigned to this subject" });
        }
      }

      const upload = (subject.uploads || []).id(uploadId);
      if (!upload) return res.status(404).json({ error: "Upload not found" });

      upload.name = String(name).trim();
      await classroom.save();

      res.json({
        message: "Study material renamed",
        upload: {
          _id: String(upload._id),
          name: upload.name,
          type: upload.type,
          mimeType: upload.mimeType || upload.type,
          cloudinary: upload.cloudinary || null,
          previewUrl: upload.previewUrl || null,
          previewDownloadUrl: upload.previewDownloadUrl || null,
          previewPath: upload.previewPath || null,
          previewType: upload.previewType || null,
          previewStatus: upload.previewStatus || null,
          previewError: upload.previewError || null,
          size: Number(upload.size || 0),
          uploadedBy: upload.uploadedBy ? String(upload.uploadedBy) : null,
          uploadedAt: upload.uploadedAt,
        },
      });
    } catch (error) {
      console.error("PATCH /api/classroom/study-materials/:classroomId/subjects/:subjectId/uploads/:uploadId failed:", error);
      res.status(500).json({ error: "Failed to rename study material" });
    }
};

export const deleteStudyMaterial = async (req, res) => {
    try {
      const me = await getMeService(req.user.uid);
      if (!me) return res.status(404).json({ error: "User not found" });
      if (!["teacher", "admin"].includes(me.role)) {
        return res.status(403).json({ error: "Only teachers/admin can delete study materials" });
      }

      const { classroomId, subjectId, uploadId } = req.params;
      const classroom = await getClassroomById(classroomId);
      if (!classroom) return res.status(404).json({ error: "Classroom not found" });

      const subject = classroom.subjects.id(subjectId);
      if (!subject) return res.status(404).json({ error: "Subject not found" });

      if (me.role === "teacher") {
        const isAssigned = (subject.teacherIds || []).some((tid) => String(tid) === String(me._id));
        if (!isAssigned) {
          return res.status(403).json({ error: "You are not assigned to this subject" });
        }
      }

      const upload = (subject.uploads || []).id(uploadId);
      if (!upload) return res.status(404).json({ error: "Upload not found" });

      upload.deleteOne();
      await classroom.save();

      res.json({ message: "Study material deleted", uploadId: String(uploadId) });
    } catch (error) {
      console.error("DELETE /api/classroom/study-materials/:classroomId/subjects/:subjectId/uploads/:uploadId failed:", error);
      res.status(500).json({ error: "Failed to delete study material" });
    }
};

export const getAnnouncements = async (req, res) => {
    try {
      const { channelId } = req.params;
      const { before = null, limit = null } = req.query;

      if (limit !== null && limit !== undefined) {
        const page = await getAnnouncementsPageByChannel(channelId, limit, before);
        return res.json(page);
      }

      const posts = await getAnnouncementsByChannel(channelId);
      res.json(posts);
    } catch (error) {
      res.status(500).json(error);
    }
};

export const getComments = async (req, res) => {
    try {
      const comments = await getCommentsByAnnouncement(req.params.announcementId);
      res.json(comments);
    } catch (error) {
      res.status(500).json(error);
    }
};

export const postComment = async (req, res) => {
  try {
    const { announcementId, content, replyTo } = req.body;
    const user = await getMeService(req.user.uid);

    const newComment = await createCommentService({
      parentId: announcementId,
      replyTo: replyTo || null,
      userId: user._id,
      userName: user.profile.name,
      userAvatar: user.profile.avatar,
      content,
    });

    res.json(newComment);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const postAnnouncement = async (req, res) => {
  try {
    const { channelId, content, type, noteData } = req.body;
    const user = await getMeService(req.user.uid);
    if (!user || !["teacher", "admin"].includes(user.role)) {
      return res.status(403).json({ message: "Only teacher/admin can post official announcements" });
    }

    const newPost = await createAnnouncementService({
      classroomId: channelId,
      teacherId: user._id,
      senderName: user.profile.name,
      content,
      type: type || "text",
      noteData: noteData || null,
    });

    const populatedPost = await newPost.populate(
        "teacherId",
        "profile.name profile.avatar"
    );

    const io = req.app.get("io");
    if (io) {
        io.to(channelId).emit("new_announcement", populatedPost);
    }

    res.json(populatedPost);
  } catch (error) {
    res.status(500).json(error);
  }
};

export const resolveComment = async (req, res) => {
    try {
      const { commentId } = req.params;
      const comment = await getCommentById(commentId);

      if (!comment)
        return res.status(404).json({ message: "Comment not found" });

      comment.isResolved = !comment.isResolved;
      await comment.save();

      res.json(comment);
    } catch (error) {
      res.status(500).json(error);
    }
};

export const getClassroomDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await getDetailedClassroomById(id);

    if (!classroom) {
        return res.status(404).json({ error: "Classroom not found" });
    }

    res.json(classroom);
  } catch (error) {
    console.error("Error fetching classroom details:", error);
    res.status(500).json(error);
  }
};

export const updateDescription = async (req, res) => {
  try {
    const { classroomId, description } = req.body;
    const updated = await updateClassroomDescription(classroomId, description);
    res.json(updated);
  } catch (error) {
    res.status(500).json(error);
  }
};
