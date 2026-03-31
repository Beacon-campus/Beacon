import admin from "firebase-admin";
import mongoose from "mongoose";
import User from "../models/User.js";
import Classroom from "../models/Classroom.js";
import Channel from "../models/Channel.js";
import { enrollStudentInMatchingClassroom, removeStudentFromAllClassrooms } from "../utils/classroomUtils.js";
import {
  getAllMongoUsers,
  getAllFirestoreUsers,
  getMongoUserById,
  getMongoUserByFirebaseUid,
  createFirestoreUser,
  updateFirestoreUser,
  deleteFirestoreUser,
  getAllClassrooms,
  findStudentsByCriteria,
  getClassroomsByCourse,
  deleteChannelsByIds,
  removeClassroomsFromUsers,
  deleteClassroomsByIds
} from "../services/admin.service.js";
import { getAdminDashboardOverview, getDashboardTimeline } from "../services/metrics.service.js";
import { listServerLogs } from "../services/logs.service.js";

export const verifyAdminRole = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const mongoUser = await getMongoUserByFirebaseUid(uid);

    if (!mongoUser || mongoUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Admin role required." });
    }

    next();
  } catch (err) {
    console.error("Admin verification error:", err);
    res.status(500).json({ error: "Internal server error during authorization." });
  }
};

export const getAllUsersAction = async (req, res) => {
  try {
    const users = await getAllMongoUsers();
    const firestoreDocs = await getAllFirestoreUsers();

    const formattedUsers = users.map((u) => {
        const profile = u.profile || {};
        let finalRegno = profile.regno || u.regno || "N/A";
        
        const fsDoc = firestoreDocs[u.firebaseUid] || {};
        const ispasswordreset = fsDoc.ispasswordreset ?? false;
        const temppassword = fsDoc.temppassword || "";

        return {
          _id: u._id,
          firebaseUid: u.firebaseUid,
          email: u.email,
          role: u.role,
          regno: finalRegno,
          displayName: profile.displayName || profile.name || "User",
          course: profile.course || "N/A",
          department: profile.department || "",
          semester: profile.semester || 0,
          createdAt: u.createdAt,
          disabled: !!u.disabled,
          ispasswordreset: ispasswordreset,
          isemailverified: fsDoc.isemailverified ?? false,
          temppassword: !ispasswordreset ? temppassword : null 
        };
    });

    res.json(formattedUsers);
  } catch (err) {
    console.error("Error fetching admin users:", err);
    res.status(500).json({ error: "Failed to fetch users." });
  }
};

export const createUserAction = async (req, res) => {
  const { role, name, regno, department, course, semester, shift } = req.body;

  if (!role || !name) {
    return res.status(400).json({ error: "Name and role are required." });
  }

  const safeRegno = regno ? regno.trim().toUpperCase() : `USER${Math.floor(Math.random() * 10000)}`;
  const autoEmail = req.body.email || `${safeRegno.toLowerCase()}@nexus.local`;
  const autoPassword = req.body.password || Math.random().toString(36).slice(-8);

  const calculateSemester = (regNo) => {
    if (!regNo || regNo.length < 3) return 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    if (regNo.startsWith("IT")) return 0; 
    const admissionYearPrefix = parseInt(regNo.substring(0, 2));
    if (isNaN(admissionYearPrefix)) return 1;
    const admissionYear = 2000 + admissionYearPrefix;
    let effectiveYear = currentYear;
    if (currentMonth <= 4) effectiveYear = currentYear - 1;
    const yearDiff = effectiveYear - admissionYear;
    let sem = (currentMonth >= 5 && currentMonth <= 10) ? yearDiff * 2 + 1 : yearDiff * 2 + 2;
    return sem > 0 ? sem : 1;
  };

  const calculatedSemester = (role.toLowerCase() === 'student' && !semester) ? calculateSemester(safeRegno) : (semester || 0);

  const deriveShift = (regNo) => {
    if (!regNo || regNo.length < 3) return "Morning";
    if (regNo.startsWith("IT")) return "Morning"; 
    const shiftCode = regNo.charAt(2);
    return shiftCode === "2" ? "Afternoon" : (shiftCode === "3" ? "Evening" : "Morning");
  };

  const calculatedShift = (role.toLowerCase() === 'student' && !shift) ? deriveShift(safeRegno) : (shift || "Morning");
  const finalCourse = (role.toLowerCase() === 'student' && (!course || course.trim() === "")) ? "BCA" : (course || "");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userRecord = await admin.auth().createUser({
      email: autoEmail,
      password: autoPassword,
      displayName: name || "New User",
    });

    const defaultAvatar = role === "teacher" ? 1 : 11;

    const newUser = new User({
      firebaseUid: userRecord.uid,
      email: autoEmail,
      role: role.toLowerCase(),
      regno: safeRegno,
      disabled: false,
      profile: {
        name: name || "User",
        displayName: name || "User",
        avatar: defaultAvatar,
        department: department || "",
        course: finalCourse,
        semester: calculatedSemester,
        shift: calculatedShift,
        regno: safeRegno,
      },
    });

    const savedUser = await newUser.save({ session });
    
    await createFirestoreUser(userRecord.uid, {
        course: finalCourse,
        department: role.toLowerCase() === "teacher" ? (department || "IT") : "",
        email: autoEmail,
        isemailverified: false,
        ispasswordreset: false,
        onboardingComplete: false,
        pendingmail: "",
        realName: name || "User",
        regno: safeRegno,
        role: role.toLowerCase(),
        temppassword: autoPassword,
    });

    if (role.toLowerCase() === "student") {
      await enrollStudentInMatchingClassroom(savedUser, session);
    }

    await session.commitTransaction();
    session.endSession();

    const u = savedUser.toObject();
    const profile = u.profile || {};
    let finalRegno = profile.regno || u.regno || "N/A";

    res.status(201).json({ 
        message: "User created successfully", 
        user: {
          _id: u._id,
          firebaseUid: u.firebaseUid,
          email: u.email,
          role: u.role,
          regno: finalRegno,
          displayName: profile.displayName || profile.name || "User",
          avatar: profile.avatar || defaultAvatar,
          disabled: false,
          ispasswordreset: false,
          temppassword: autoPassword 
        }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Error creating user:", error);
    
    if (error.code !== 'auth/email-already-exists' && error.errorInfo?.code !== 'auth/email-already-exists') {
         try {
           const existingFbUser = await admin.auth().getUserByEmail(autoEmail);
           if(existingFbUser) {
              await admin.auth().deleteUser(existingFbUser.uid);
              await deleteFirestoreUser(existingFbUser.uid);
           }
         } catch(cleanupErr) {
            console.error("Cleanup error:", cleanupErr);
         }
    }

    if (error.code === 'auth/email-already-exists') {
        return res.status(400).json({ error: "A user with this Register Number/Email already exists." });
    }
    
    res.status(500).json({ error: error.message || "Failed to create user." });
  }
};

export const toggleUserStatusAction = async (req, res) => {
  const { id } = req.params;
  const { disabled } = req.body; 

  if (typeof disabled !== 'boolean') {
      return res.status(400).json({ error: "Invalid status value." });
  }

  try {
    const user = await getMongoUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found in database." });
    }

    if (user.firebaseUid === req.user.uid) {
         return res.status(403).json({ error: "You cannot disable your own admin account." });
    }

    try {
        await admin.auth().updateUser(user.firebaseUid, {
          disabled: disabled
        });
    } catch(fbErr) {
        console.error("Firebase update user error:", fbErr);
        if (fbErr.code !== 'auth/user-not-found') {
           throw fbErr; 
        }
    }

    user.disabled = disabled;
    await user.save();

    res.json({ message: `User successfully ${disabled ? 'disabled' : 'enabled'}.`, disabled: user.disabled });

  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update user status." });
  }
};

export const updateUserAction = async (req, res) => {
  const { id } = req.params;
  const { email, role, name, regno, department, course, semester, shift } = req.body;

  try {
    const user = await getMongoUserById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const previousRole = user.role;
    const nextRole = role ? role.toLowerCase() : user.role;
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : undefined;
    const normalizedName = typeof name === "string" ? name.trim() : undefined;
    const normalizedRegno = typeof regno === "string" ? regno.trim().toUpperCase() : undefined;
    const normalizedDepartment = typeof department === "string" ? department.trim() : undefined;
    const normalizedCourse = typeof course === "string" ? course.trim() : undefined;
    const normalizedShift = typeof shift === "string" ? shift.trim() : undefined;
    const normalizedSemester = semester !== undefined ? Number(semester) : undefined;

    if (normalizedEmail && normalizedEmail !== user.email) {
      try {
        await admin.auth().updateUser(user.firebaseUid, {
          email: normalizedEmail,
          displayName: normalizedName || user.profile?.displayName || user.profile?.name || "User",
        });
      } catch (fbErr) {
        if (fbErr.code === 'auth/email-already-exists') {
           return res.status(400).json({ error: "The new email address is already in use by another account." });
        }
        throw fbErr;
      }
    } else if (normalizedName && (!user.profile || normalizedName !== user.profile.displayName)) {
       try {
           await admin.auth().updateUser(user.firebaseUid, {
              displayName: normalizedName,
           });
       } catch (fbErr) {
           console.warn("Failed to update Firebase Auth DisplayName, continuing...", fbErr);
       }
    }

    if (normalizedEmail !== undefined && normalizedEmail !== "") user.email = normalizedEmail;
    user.role = nextRole;
    if (normalizedRegno !== undefined) user.regno = normalizedRegno;
    
    if (!user.profile) user.profile = {};
    if (normalizedName) {
      user.profile.name = normalizedName;
      user.profile.displayName = normalizedName;
    }
    const wasStudent = previousRole === "student";
    const isStudent = nextRole === "student";
    let classroomChanged = false;
    
    if (isStudent) {
      if (!wasStudent) classroomChanged = true;
      if (normalizedCourse !== undefined && normalizedCourse !== user.profile.course) classroomChanged = true;
      if (normalizedSemester !== undefined && normalizedSemester !== user.profile.semester) classroomChanged = true;
      if (normalizedShift !== undefined && normalizedShift !== user.profile.shift) classroomChanged = true;
    }

    if (normalizedDepartment !== undefined) user.profile.department = normalizedDepartment;
    if (normalizedCourse !== undefined) user.profile.course = normalizedCourse;
    if (normalizedSemester !== undefined && Number.isFinite(normalizedSemester)) user.profile.semester = normalizedSemester;
    if (normalizedShift !== undefined) user.profile.shift = normalizedShift;
    if (normalizedRegno !== undefined) user.profile.regno = normalizedRegno;

    await user.save();

    await updateFirestoreUser(user.firebaseUid, {
      email: user.email,
      realName: user.profile?.displayName || user.profile?.name || "User",
      regno: user.profile?.regno || user.regno || "",
      role: user.role,
      course: user.role === "student" ? (user.profile?.course || "") : "",
      department: user.role === "teacher" ? (user.profile?.department || "") : "",
    });

    if (wasStudent && !isStudent) {
      await removeStudentFromAllClassrooms(user);
    } else if (isStudent && classroomChanged) {
      await removeStudentFromAllClassrooms(user);
      await enrollStudentInMatchingClassroom(user);
    }

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: error.message || "Failed to update user details." });
  }
};

export const deleteUserAction = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await getMongoUserById(id);
    if (!user) {
        return res.status(404).json({ error: "User not found." });
    }

    if (user.firebaseUid === req.user.uid) {
         return res.status(403).json({ error: "You cannot delete your own admin account." });
    }

    try {
        await admin.auth().deleteUser(user.firebaseUid);
        await deleteFirestoreUser(user.firebaseUid);
    } catch (fbErr) {
        console.warn("Delete User Info: User missing from Firebase Auth", fbErr);
    }

    if (user.enrolledClassroomIds && user.enrolledClassroomIds.length > 0) {
       await removeStudentFromAllClassrooms(user);
    }

    await User.findByIdAndDelete(id);

    res.json({ message: "User deleted successfully." });

  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user." });
  }
};

export const getClassroomsAction = async (req, res) => {
  try {
    const classrooms = await getAllClassrooms();

    const formatted = classrooms.map((cls) => ({
      _id: cls._id,
      name: cls.name,
      course: cls.metadata?.course || "N/A",
      semester: cls.metadata?.semester || "N/A",
      shift: cls.metadata?.shift || "N/A",
      studentCount: cls.studentIds?.length || 0,
      subjects: cls.subjects || [],
      createdAt: cls.createdAt,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching classrooms:", err);
    res.status(500).json({ error: "Failed to fetch classrooms." });
  }
};

export const createClassroomAction = async (req, res) => {
  const { name, course, semester, shift, description } = req.body;

  if (!name || !course || !semester || !shift) {
    return res.status(400).json({ error: "Name, Course, Semester, and Shift are required." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const students = await findStudentsByCriteria({
      role: "student",
      "profile.course": course,
      "profile.semester": Number(semester),
      "profile.shift": shift,
    }, session);

    const studentIds = students.map((s) => s._id);

    const newClassroom = new Classroom({
      name,
      metadata: { course, semester: Number(semester), shift },
      studentIds: studentIds,
      subjects: [], 
    });

    const officialChat = new Channel({
      name: `${name} - Official`,
      type: "classroom",
      classroomMode: "official",
      course: course,
      semester: Number(semester),
      participants: studentIds,
      classroomId: newClassroom._id,
    });

    const studentHubChat = new Channel({
      name: `${name} - Student Hub`,
      type: "classroom",
      classroomMode: "unofficial",
      course: course,
      semester: Number(semester),
      participants: studentIds,
      classroomId: newClassroom._id,
    });

    await officialChat.save({ session });
    await studentHubChat.save({ session });

    newClassroom.officialChannelId = officialChat._id;
    newClassroom.unofficialChannelId = studentHubChat._id;
    await newClassroom.save({ session });

    if (studentIds.length > 0) {
      await User.updateMany(
        { _id: { $in: studentIds } },
        { $addToSet: { enrolledClassroomIds: newClassroom._id } }
      ).session(session);
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Classroom generated successfully." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating classroom:", error);
    res.status(500).json({ error: "Failed to construct classroom resources." });
  }
};

export const bulkCreateClassroomsAction = async (req, res) => {
  const { course } = req.body;

  if (!course) {
    return res.status(400).json({ error: "Course target is required." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shifts = ['Morning', 'Afternoon', 'Evening'];
    const semesters = [1, 2, 3, 4, 5, 6];

    for (const shift of shifts) {
      for (const semester of semesters) {
        const name = `${course} - Sem ${semester} - ${shift}`;
        
        const students = await findStudentsByCriteria({
          role: "student",
          "profile.course": course,
          "profile.semester": semester,
          "profile.shift": shift,
        }, session);

        const studentIds = students.map((s) => s._id);

        const newClassroom = new Classroom({
          name,
          metadata: { course, semester, shift },
          studentIds: studentIds,
          subjects: [], 
        });

        const officialChat = new Channel({
           name: `${name} - Official`,
           type: "classroom",
           classroomMode: "official",
           course: course,
           semester: Number(semester),
           participants: studentIds,
           classroomId: newClassroom._id,
        });

        const studentHubChat = new Channel({
           name: `${name} - Student Hub`,
           type: "classroom",
           classroomMode: "unofficial",
           course: course,
           semester: Number(semester),
           participants: studentIds,
           classroomId: newClassroom._id,
        });

        await officialChat.save({ session });
        await studentHubChat.save({ session });

        newClassroom.officialChannelId = officialChat._id;
        newClassroom.unofficialChannelId = studentHubChat._id;
        await newClassroom.save({ session });

        if (studentIds.length > 0) {
          await User.updateMany(
            { _id: { $in: studentIds } },
            { $addToSet: { enrolledClassroomIds: newClassroom._id } }
          ).session(session);
        }
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Network mapped completely." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error creating bulk classrooms:", error);
    res.status(500).json({ error: "Failed to construct classroom network." });
  }
};

export const addSubjectToClassroomAction = async (req, res) => {
  const { id } = req.params;
  const { code, name } = req.body;

  if (!code || !name) {
    return res.status(400).json({ error: "Subject code and name are required." });
  }

  try {
    const classroom = await Classroom.findById(id);
    if (!classroom) return res.status(404).json({ error: "Classroom not found." });

    if (classroom.subjects.some(sub => sub.code.toUpperCase() === code.toUpperCase())) {
      return res.status(400).json({ error: "A subject with this code already exists here." });
    }

    classroom.subjects.push({ code: code.toUpperCase(), name, teacherIds: [] });
    await classroom.save();

    res.status(201).json({ message: "Subject added successfully.", classroom });
  } catch (error) {
    console.error("Error adding subject:", error);
    res.status(500).json({ error: "Failed to add subject." });
  }
};

export const assignTeachersToSubjectAction = async (req, res) => {
  const { id, subjectId } = req.params;
  const { teacherIds } = req.body; 

  if (!Array.isArray(teacherIds)) {
    return res.status(400).json({ error: "teacherIds must be an array." });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classroom = await Classroom.findById(id).session(session);
    if (!classroom) return res.status(404).json({ error: "Classroom not found." });

    const subject = classroom.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ error: "Subject not found." });

    subject.teacherIds = teacherIds;
    await classroom.save({ session });

    const allAssignedTeachers = new Set();
    classroom.subjects.forEach(sub => {
       sub.teacherIds.forEach(tId => allAssignedTeachers.add(tId.toString()));
    });

    const allRequiredParticipants = [
       ...classroom.studentIds.map(sid => sid.toString()),
       ...Array.from(allAssignedTeachers)
    ];

    await Channel.findByIdAndUpdate(
        classroom.officialChannelId,
        { participants: allRequiredParticipants },
        { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Teachers securely assigned to subject." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error assigning teachers to subject:", error);
    res.status(500).json({ error: "Failed to assign teachers." });
  }
};

export const deleteClassroomAction = async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classroom = await Classroom.findById(id).session(session);
    if (!classroom) {
      return res.status(404).json({ error: "Classroom not found." });
    }

    await deleteChannelsByIds([classroom.officialChannelId, classroom.unofficialChannelId].filter(Boolean), session);
    await removeClassroomsFromUsers([classroom._id], session);
    await deleteClassroomsByIds([id], session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Classroom successfully disassembled." });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting classroom:", error);
    res.status(500).json({ error: "Failed to obliterate classroom infrastructure." });
  }
};

export const deleteCourseClassroomsAction = async (req, res) => {
  const { courseName } = req.params;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const classrooms = await getClassroomsByCourse(courseName, session);
    
    if (!classrooms || classrooms.length === 0) {
      return res.status(404).json({ error: "No classrooms found for this course." });
    }

    const classroomIds = classrooms.map(c => c._id);
    let channelIds = classrooms.flatMap(c => [c.officialChannelId, c.unofficialChannelId].filter(Boolean));

    // Also pick up duplicate channels created by `syncClassroomsForStudents` that are orphaned
    const duplicateChannels = await Channel.find({ type: "classroom", course: courseName }).session(session);
    const duplicateChannelIds = duplicateChannels.map(c => c._id);
    
    // Merge and deduplicate all channel IDs to ensure a clean wipe
    const allChannelIdsToWipe = [...new Set([...channelIds.map(id => id.toString()), ...duplicateChannelIds.map(id => id.toString())])];

    if (allChannelIdsToWipe.length > 0) {
      await deleteChannelsByIds(allChannelIdsToWipe, session);
    }

    await removeClassroomsFromUsers(classroomIds, session);
    await deleteClassroomsByIds(classroomIds, session);

    await session.commitTransaction();
    session.endSession();

    res.json({ message: "Course network successfully disassembled." });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error deleting course network:", error);
    res.status(500).json({ error: "Failed to obliterate course infrastructure." });
  }
};

export const getDashboardOverviewAction = async (req, res) => {
  try {
    const io = req.app.get("io");
    const overview = await getAdminDashboardOverview(io);
    return res.json(overview);
  } catch (error) {
    console.error("Error fetching dashboard overview:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard overview." });
  }
};

export const getDashboardTimelineAction = async (req, res) => {
  try {
    const points = getDashboardTimeline(req.query.limit);
    return res.json({ points });
  } catch (error) {
    console.error("Error fetching dashboard timeline:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard timeline." });
  }
};

export const getServerLogsAction = async (req, res) => {
  try {
    const data = await listServerLogs({
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search,
      category: req.query.category,
      status: req.query.status,
      eventType: req.query.eventType,
    });
    return res.json(data);
  } catch (error) {
    console.error("Error fetching server logs:", error);
    return res.status(500).json({ error: "Failed to fetch server logs." });
  }
};
