import {
  getMe,
  pushNotification,
  getUserById,
  getClassroomById,
  getAssignmentById,
  getSubmission,
  createAssignment,
  createMessage,
  updateChannelLastMessage,
  getStudentsInClassroom,
  findAssignments,
  findSubmissions,
  createSubmission,
  createDoubt,
  findDoubts,
  findDoubtById,
  deleteAssignmentCascade
} from "../services/assignment.service.js";
import Classroom from "../models/Classroom.js";
import User from "../models/User.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Doubt from "../models/Doubt.js";

export const getMyClassrooms = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const query = me.role === "admin" ? {} : { "subjects.teacherIds": me._id };
    const classrooms = await Classroom.find(query).select("_id name metadata subjects").lean();
    res.json(classrooms);
  } catch (error) {
    console.error("GET /api/assignments/my-classrooms failed:", error);
    res.status(500).json({ error: "Failed to fetch classrooms" });
  }
};

export const getStudentAssignments = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const classroomIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    const assignments = await findAssignments({ classroomId: { $in: classroomIds } }, ["teacherId", "profile.name profile.avatar"], { createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("GET /api/assignments/student failed:", error);
    res.status(500).json({ error: "Failed to fetch student assignments" });
  }
};

export const createNewAssignment = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!["teacher", "admin"].includes(me.role)) {
      return res.status(403).json({ error: "Only teacher/admin can publish assignments" });
    }

    const { classroomId, type, title, instructions, deadline, totalMarks, content } = req.body;
    const assignmentType = type || "offline";
    const hasMarks = totalMarks !== undefined && totalMarks !== null && String(totalMarks).trim() !== "";
    if (!classroomId || !title || !deadline) {
      return res.status(400).json({ error: "classroomId, title, deadline are required" });
    }
    if (assignmentType !== "offline" && !hasMarks) {
      return res.status(400).json({ error: "totalMarks are required for this assignment type" });
    }

    const classroom = await getClassroomById(classroomId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    if (me.role === "teacher") {
      const teachesClass = (classroom.subjects || []).some((sub) =>
        (sub.teacherIds || []).some((tid) => String(tid) === String(me._id))
      );
      if (!teachesClass) {
        return res.status(403).json({ error: "You are not assigned to this classroom." });
      }
    }

    const assignment = await createAssignment({
      classroomId: String(classroom._id),
      teacherId: me._id,
      type: assignmentType,
      title,
      instructions: instructions || "",
      deadline: new Date(deadline),
      totalMarks: hasMarks ? Number(totalMarks) : null,
      content: content || {},
    });

    if (classroom.officialChannelId) {
      const msg = await createMessage({
        channelId: classroom.officialChannelId,
        sender: me._id,
        text: `New Assignment: ${title}`,
        type: "assignment",
        assignmentId: assignment._id,
      });

      await updateChannelLastMessage(classroom.officialChannelId, `New Assignment: ${title}`, me._id, msg.createdAt || new Date());

      const io = req.app.get("io");
      if (io) {
        io.to(String(classroom.officialChannelId)).emit("receive_message", {
          _id: msg._id,
          channelId: String(classroom.officialChannelId),
          text: msg.text,
          type: "assignment",
          assignmentId: {
            _id: assignment._id,
            title: assignment.title,
            type: assignment.type,
          },
          createdAt: msg.createdAt,
          sender: {
            _id: me._id,
            profile: me.profile || {},
            firebaseUid: me.firebaseUid,
          },
        });
      }
    }

    const io = req.app.get("io");
    const students = await getStudentsInClassroom(classroom.studentIds || []);
    await Promise.all(students.map(async (student) => {
      const notification = {
        id: `assignment_${assignment._id}_${student._id}_${Date.now()}`,
        type: "ASSIGNMENT_PUBLISHED",
        title: "New Assignment",
        content: `${title} was posted in your classroom.`,
        relatedId: String(assignment._id),
        classroomId: String(classroom._id),
        read: false,
        timestamp: new Date().toISOString(),
        link: "/student/community",
      };
      await pushNotification(student, notification);
      if (io) io.to(`user:${student._id.toString()}`).emit("new_notification", notification);
    }));

    res.status(201).json({ message: "Assignment published", assignment });
  } catch (error) {
    console.error("POST /api/assignments failed:", error);
    res.status(500).json({ error: "Failed to publish assignment" });
  }
};

export const getClassAssignments = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const { classroomId } = req.params;
    const classroom = await getClassroomById(classroomId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    if (me.role === "student") {
      const inClass = (classroom.studentIds || []).some((id) => String(id) === String(me._id));
      if (!inClass) return res.status(403).json({ error: "Access denied for this classroom" });
    }

    if (me.role === "teacher") {
      const teachesClass = (classroom.subjects || []).some((sub) =>
        (sub.teacherIds || []).some((tid) => String(tid) === String(me._id))
      );
      if (!teachesClass) return res.status(403).json({ error: "Access denied for this classroom" });
    }

    const assignmentQuery = { classroomId: String(classroomId) };
    if (me.role === "teacher") {
      assignmentQuery.teacherId = me._id;
    }

    const assignments = await findAssignments(
      assignmentQuery,
      ["teacherId", "profile.name profile.avatar"],
      { createdAt: -1 }
    );

    res.json(assignments);
  } catch (error) {
    console.error("GET /api/assignments/class/:classroomId failed:", error);
    res.status(500).json({ error: "Failed to fetch class assignments" });
  }
};

export const getMySubmissions = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.json([]);

    const submissions = await findSubmissions({
      studentId: me._id,
      submittedAt: { $exists: true, $ne: null },
    });

    res.json([...new Set(submissions.map((s) => String(s.assignmentId)))]);
  } catch (error) {
    console.error("GET /api/assignments/my-submissions failed:", error);
    res.status(500).json({ error: "Failed to fetch submission status" });
  }
};

export const getAssignmentSubmissions = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Only assignment owner can view submissions" });

    const classroom = await getClassroomById(assignment.classroomId);
    if (!classroom) return res.status(404).json({ error: "Classroom not found" });

    const students = await User.find({ _id: { $in: classroom.studentIds || [] } })
      .select("_id profile.name profile.avatar profile.regno email")
      .lean();

    const subs = await findSubmissions({ assignmentId: assignment._id });
    const subMap = new Map(subs.map((s) => [String(s.studentId), s]));
    const studentMap = new Map(students.map((s) => [String(s._id), s]));
    const questions = Array.isArray(assignment?.content?.questions) ? assignment.content.questions : [];

    const rows = (classroom.studentIds || []).map((studentId) => {
      const sid = String(studentId);
      const student = studentMap.get(sid);
      const sub = subMap.get(sid);

      let correctCount = null;
      let totalQuestions = null;
      if (assignment.type === "quiz" && sub?.answers && questions.length > 0) {
        totalQuestions = questions.length;
        correctCount = questions.reduce((acc, q, idx) => {
          const answerIndex = sub.answers?.[idx];
          if (answerIndex === undefined) return acc;
          const selectedText = (q.options || [])[answerIndex];
          const correctText = q.answer || q.correctAnswer;
          return selectedText === correctText ? acc + 1 : acc;
        }, 0);
      }

      return {
        studentId: sid,
        name: student?.profile?.name || student?.email || "Unknown Student",
        regno: student?.profile?.regno || "",
        email: student?.email || "",
        avatar: student?.profile?.avatar || null,
        submitted: Boolean(sub?.submittedAt),
        submittedAt: sub?.submittedAt || null,
        attempts: Number(sub?.attempts || 0),
        score: sub?.score ?? null,
        feedback: sub?.feedback || "",
        isCheated: Boolean(sub?.isCheated),
        file: sub?.file || "",
        answers: sub?.answers || null,
        correctCount,
        totalQuestions,
      };
    });

    res.json(rows);
  } catch (error) {
    console.error("GET /api/assignments/:id/submissions failed:", error);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
};

export const gradeSubmission = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Only assignment owner can grade" });

    const score = Number(req.body.score);
    if (Number.isNaN(score)) return res.status(400).json({ error: "score must be a number" });
    if (score < 0 || score > Number(assignment.totalMarks || 0)) {
      return res.status(400).json({ error: "score is outside valid marks range" });
    }

    const sub = await getSubmission({
      assignmentId: assignment._id,
      studentId: req.params.studentId,
      submittedAt: { $exists: true, $ne: null },
    });
    if (!sub) return res.status(404).json({ error: "Submission not found for student" });

    sub.score = score;
    sub.feedback = String(req.body.feedback || "");
    await sub.save();
    res.json({ message: "Grade updated" });
  } catch (error) {
    console.error("PATCH /api/assignments/:id/submissions/:studentId failed:", error);
    res.status(500).json({ error: "Failed to update grade" });
  }
};

export const postDoubt = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can post doubts" });

    const text = String(req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Doubt text is required" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    const doubt = await createDoubt({
      assignmentId: assignment._id,
      studentId: me._id,
      text,
      isResolved: false,
      replies: [],
    });

    const teacher = await getUserById(assignment.teacherId);
    const io = req.app.get("io");
    if (teacher) {
      const notification = {
        id: `assignment_doubt_${assignment._id}_${me._id}_${Date.now()}`,
        type: "ASSIGNMENT_DOUBT",
        title: "New Assignment Doubt",
        content: `${me.profile?.name || "A student"} asked a doubt on: ${assignment.title}`,
        relatedId: String(assignment._id),
        classroomId: String(assignment.classroomId),
        read: false,
        timestamp: new Date().toISOString(),
      };
      await pushNotification(teacher, notification);
      if (io) {
        io.to(`user:${teacher._id.toString()}`).emit("new_notification", notification);
        io.to(`user:${teacher._id.toString()}`).emit("new_assignment_doubt", {
          _id: doubt._id,
          assignmentId: String(assignment._id),
          studentId: String(me._id),
          studentName: me.profile?.name || me.email || "Unknown Student",
          studentAvatar: me.profile?.avatar || null,
          text: doubt.text,
          createdAt: doubt.createdAt,
          replies: []
        });
      }
    }

    res.status(201).json({ message: "Doubt posted", doubt });
  } catch (error) {
    console.error("POST /api/assignments/:id/doubts failed:", error);
    res.status(500).json({ error: "Failed to post doubt" });
  }
};

export const getDoubtsForTeacher = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Only assignment owner can view doubts" });

    const doubts = await findDoubts({ assignmentId: assignment._id }, { createdAt: -1 }, ["studentId", "profile.name profile.avatar email"]);

    const rows = doubts.map((d) => ({
      _id: d._id,
      studentId: d.studentId?._id || d.studentId,
      studentName: d.studentId?.profile?.name || d.studentId?.email || "Unknown Student",
      studentAvatar: d.studentId?.profile?.avatar || null,
      text: d.text,
      createdAt: d.createdAt,
      resolvedAt: d.resolvedAt || d.reply?.repliedAt || null,
      replies: (d.replies && d.replies.length > 0) ? d.replies : (d.reply?.text ? [{ text: d.reply.text, mode: d.reply.visibility || "private", createdAt: d.reply.repliedAt }] : []),
    }));

    res.json(rows);
  } catch (error) {
    console.error("GET /api/assignments/:id/doubts/teacher failed:", error);
    res.status(500).json({ error: "Failed to fetch doubts" });
  }
};

export const getDoubtsForStudent = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can view this doubts feed" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    const doubts = await findDoubts({ assignmentId: assignment._id }, { createdAt: -1 });

    const personalDoubts = doubts
      .filter((d) => String(d.studentId) === String(me._id))
      .map((d) => ({
        _id: d._id,
        text: d.text,
        createdAt: d.createdAt,
        resolvedAt: d.resolvedAt || d.reply?.repliedAt || null,
        replies: (d.replies && d.replies.length > 0) ? d.replies : (d.reply?.text ? [{ text: d.reply.text, mode: d.reply.visibility || "private", createdAt: d.reply.repliedAt }] : []),
      }));

    const broadcastReplies = [];
    doubts.forEach((d) => {
      const replies = (d.replies && d.replies.length > 0) ? d.replies : (d.reply?.text ? [{ text: d.reply.text, mode: d.reply.visibility || "private", createdAt: d.reply.repliedAt }] : []);
      replies.forEach((r) => {
        if (r.mode === "broadcast") {
          const originText = d.text === "GLOBAL_BROADCAST_THREAD" ? "Global Assignment Broadcast" : d.text;
          const teacherNameForBroadcast = "Teacher"; 

          broadcastReplies.push({
            _id: r._id || `${d._id}_${r.createdAt}`,
            text: r.text,
            mode: r.mode,
            createdAt: r.createdAt,
            teacherName: teacherNameForBroadcast,
            doubtId: d._id,
            assignmentId: assignment._id,
            assignmentTitle: assignment.title,
          });
        }
      });
    });

    broadcastReplies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ personalDoubts, broadcastReplies });
  } catch (error) {
    console.error("GET /api/assignments/:id/doubts/student failed:", error);
    res.status(500).json({ error: "Failed to fetch doubts" });
  }
};

export const replyToDoubt = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (!["teacher", "admin"].includes(me.role)) {
      return res.status(403).json({ error: "Only teachers can reply to doubts" });
    }

    const text = String(req.body.text || "").trim();
    const mode = req.body.mode || "private";
    if (!text) return res.status(400).json({ error: "Reply text is required" });
    if (!["private", "broadcast"].includes(mode)) {
      return res.status(400).json({ error: "mode must be private or broadcast" });
    }

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Only assignment owner can reply" });

    const replyObj = {
      teacherId: me._id,
      text,
      mode,
      createdAt: new Date(),
    };

    let doubt = null;
    if (req.params.doubtId !== "broadcast") {
      doubt = await findDoubtById({ _id: req.params.doubtId, assignmentId: assignment._id });
      if (!doubt) return res.status(404).json({ error: "Doubt not found" });
    } else {
      doubt = await findDoubtById({ assignmentId: assignment._id, studentId: me._id, text: "GLOBAL_BROADCAST_THREAD" });
      if (!doubt) {
        doubt = await createDoubt({
          assignmentId: assignment._id,
          studentId: me._id,
          text: "GLOBAL_BROADCAST_THREAD",
          isResolved: true,
          replies: []
        });
      }
    }

    if (!doubt.replies) doubt.replies = [];
    doubt.replies.push(replyObj);
    doubt.reply = { text, repliedAt: new Date(), visibility: mode };
    doubt.isResolved = true;
    doubt.resolvedAt = new Date();
    await doubt.save();

    const io = req.app.get("io");
    const targetIds = mode === "broadcast"
      ? (await getClassroomById(assignment.classroomId))?.studentIds || []
      : (req.params.doubtId !== "broadcast" && doubt ? [doubt.studentId] : []);

    const students = await getStudentsInClassroom(targetIds);

    await Promise.all(students.map(async (student) => {
      const notification = {
        id: `assignment_doubt_reply_${assignment._id}_${student._id}_${Date.now()}`,
        type: "ASSIGNMENT_DOUBT_REPLY",
        title: "Assignment Doubt Reply",
        content: mode === "broadcast"
          ? `Teacher replied to an assignment doubt (Broadcast): ${assignment.title}`
          : `Teacher replied to your doubt: ${assignment.title}`,
        relatedId: String(assignment._id),
        classroomId: String(assignment.classroomId),
        teacherId: String(me._id),
        teacherName: me.profile?.name || "Teacher",
        replyText: text,
        replyMode: mode,
        assignmentTitle: assignment.title,
        read: false,
        timestamp: new Date().toISOString(),
      };
      await pushNotification(student, notification);
      if (io) {
        io.to(`user:${student._id.toString()}`).emit("new_notification", notification);

        io.to(`user:${student._id.toString()}`).emit("assignment_doubt_reply", {
          assignmentId: String(assignment._id),
          assignmentTitle: assignment.title,
          doubtId: doubt ? String(doubt._id) : "broadcast",
          teacherId: String(me._id),
          teacherName: me.profile?.name || "Teacher",
          mode,
          text,
          createdAt: replyObj.createdAt.toISOString(),
        });
      }
    }));

    res.json({ message: "Reply sent" });
  } catch (error) {
    console.error("POST /api/assignments/:id/doubts/:doubtId/reply failed:", error);
    res.status(500).json({ error: "Failed to reply to doubt" });
  }
};

export const getAllDoubts = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    if (me.role === "student") {
      const assignment = await getAssignmentById(req.params.id);
      if (!assignment) return res.status(404).json({ error: "Assignment not found" });

      const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
      if (!enrolledIds.includes(String(assignment.classroomId))) {
        return res.status(403).json({ error: "You are not enrolled in this classroom" });
      }

      const doubts = await findDoubts({ assignmentId: assignment._id, studentId: me._id }, { createdAt: -1 });
      return res.json(doubts);
    }

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Only assignment owner can view doubts" });

    const doubts = await Doubt.find({ assignmentId: assignment._id })
      .populate("studentId", "profile.name profile.avatar")
      .sort({ createdAt: -1 });
    res.json(doubts);
  } catch (error) {
    console.error("GET /api/assignments/:id/doubts failed:", error);
    res.status(500).json({ error: "Failed to fetch doubts" });
  }
};

export const getAssignmentInfo = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const assignment = await Assignment.findById(req.params.id).populate("teacherId", "profile.name profile.avatar");
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    if (me.role === "student") {
      const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
      if (!enrolledIds.includes(String(assignment.classroomId))) {
        return res.status(403).json({ error: "Access denied for this assignment" });
      }
    }

    if (me.role === "teacher" && String(assignment.teacherId?._id || assignment.teacherId) !== String(me._id)) {
      return res.status(403).json({ error: "Only assignment owner can access this resource" });
    }

    res.json(assignment);
  } catch (error) {
    console.error("GET /api/assignments/:id failed:", error);
    res.status(500).json({ error: "Failed to fetch assignment" });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can submit" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    const file = req.body.file;
    if (!file) return res.status(400).json({ error: "No file provided" });

    const existing = await getSubmission({ assignmentId: assignment._id, studentId: me._id });
    if (existing?.submittedAt) {
      return res.status(400).json({ error: "You have already submitted this assignment." });
    }

    const submission = existing || new Submission({ assignmentId: assignment._id, studentId: me._id });
    submission.file = file;
    submission.submittedAt = new Date();
    await submission.save();

    const teacher = await getUserById(assignment.teacherId);
    const io = req.app.get("io");
    if (teacher) {
      const notification = {
        id: `assignment_submission_${assignment._id}_${me._id}_${Date.now()}`,
        type: "ASSIGNMENT_SUBMITTED",
        title: "Assignment Submitted",
        content: `${me.profile?.name || "A student"} submitted: ${assignment.title}`,
        relatedId: String(assignment._id),
        classroomId: String(assignment.classroomId),
        read: false,
        timestamp: new Date().toISOString(),
      };
      await pushNotification(teacher, notification);
      if (io) io.to(`user:${teacher._id.toString()}`).emit("new_notification", notification);
    }

    res.status(201).json({ success: true, message: "Assignment submitted successfully", submission });
  } catch (error) {
    console.error("POST /api/assignments/:id/submit failed:", error);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
};

export const startQuiz = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can start quiz" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.type !== "quiz") return res.status(400).json({ error: "This assignment is not a quiz" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    let submission = await getSubmission({ assignmentId: assignment._id, studentId: me._id });
    if (submission?.submittedAt) {
      return res.status(400).json({ error: "You have already submitted this quiz." });
    }

    if (!submission) {
      submission = await createSubmission({ assignmentId: assignment._id, studentId: me._id, attempts: 1 });
    } else {
      submission.attempts = Number(submission.attempts || 0) + 1;
      await submission.save();
    }

    res.json({ success: true, attempts: submission.attempts });
  } catch (error) {
    console.error("POST /api/assignments/:id/start failed:", error);
    res.status(500).json({ error: "Failed to track quiz start" });
  }
};

export const submitQuiz = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can submit quiz" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.type !== "quiz") return res.status(400).json({ error: "This assignment is not a quiz" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    const { answers, isCheated } = req.body;

    const questions = Array.isArray(assignment?.content?.questions) ? assignment.content.questions : [];
    const fallbackMarksPerQuestion = questions.length > 0
      ? Number(assignment.totalMarks || 0) / questions.length
      : 1;

    let totalScore = 0;
    questions.forEach((q, idx) => {
      const answerIndex = answers?.[idx];
      if (answerIndex === undefined) return;
      const selectedText = (q.options || [])[answerIndex];
      const correctText = q.answer || q.correctAnswer;
      const configuredMarks = Number(q.marks);
      const effectiveMarks = Number.isFinite(configuredMarks) && configuredMarks > 0
        ? configuredMarks
        : fallbackMarksPerQuestion;
      if (selectedText === correctText) totalScore += effectiveMarks;
    });

    let submission = await getSubmission({ assignmentId: assignment._id, studentId: me._id });
    if (submission?.submittedAt) {
      return res.status(400).json({ error: "You have already submitted this quiz." });
    }

    if (!submission) {
      submission = new Submission({ assignmentId: assignment._id, studentId: me._id, attempts: 1 });
    }

    submission.answers = answers;
    submission.score = totalScore;
    submission.isCheated = Boolean(isCheated);
    submission.file = "QUIZ_SUBMISSION";
    submission.submittedAt = new Date();
    await submission.save();

    const teacher = await getUserById(assignment.teacherId);
    const io = req.app.get("io");
    if (teacher) {
      const notification = {
        id: `assignment_submission_${assignment._id}_${me._id}_${Date.now()}`,
        type: "ASSIGNMENT_SUBMITTED",
        title: "Quiz Submitted",
        content: `${me.profile?.name || "A student"} submitted quiz: ${assignment.title}`,
        relatedId: String(assignment._id),
        classroomId: String(assignment.classroomId),
        read: false,
        timestamp: new Date().toISOString(),
      };
      await pushNotification(teacher, notification);
      if (io) io.to(`user:${teacher._id.toString()}`).emit("new_notification", notification);
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error("POST /api/assignments/:id/submit-quiz failed:", error);
    res.status(500).json({ error: "Failed to submit quiz" });
  }
};

export const flagCheat = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });
    if (me.role !== "student") return res.status(403).json({ error: "Only students can be flagged for quiz cheating" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });
    if (assignment.type !== "quiz") return res.status(400).json({ error: "This assignment is not a quiz" });

    const enrolledIds = (me.enrolledClassroomIds || []).map((id) => String(id));
    if (!enrolledIds.includes(String(assignment.classroomId))) {
      return res.status(403).json({ error: "You are not enrolled in this classroom" });
    }

    let submission = await getSubmission({ assignmentId: assignment._id, studentId: me._id });
    if (!submission) {
      submission = await createSubmission({ assignmentId: assignment._id, studentId: me._id, attempts: 1, isCheated: true });
    } else {
      submission.isCheated = true;
      await submission.save();
    }

    res.json({ success: true, message: "Cheating recorded" });
  } catch (error) {
    console.error("POST /api/assignments/:id/flag-cheat failed:", error);
    res.status(500).json({ error: "Failed to flag cheating" });
  }
};

export const deleteAssignment = async (req, res) => {
  try {
    const me = await getMe(req.user.uid);
    if (!me) return res.status(404).json({ error: "User not found" });

    const assignment = await getAssignmentById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    const ownerAccess = me.role === "admin" || String(assignment.teacherId) === String(me._id);
    if (!ownerAccess) return res.status(403).json({ error: "Unauthorized to delete this assignment" });

    await deleteAssignmentCascade(req.params.id);

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/assignments/:id failed:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
};
