import Classroom from "../models/Classroom.js";
import Channel from "../models/Channel.js";

/**
 * Enroll a student in a matching classroom based on course, semester, and shift.
 * Intended to be used when a student is created or their academic profile is updated.
 * 
 * @param {Object} user - The student user document (Mongoose doc)
 * @param {Object} session - Optional mongoose session for transactions
 * @returns {Promise<boolean>} - True if enrolled in a classroom, false otherwise
 */
export async function enrollStudentInMatchingClassroom(user, session = null) {
  const profile = user.profile || {};
  const course = profile.course;
  const semester = profile.semester;
  const shift = profile.shift;

  if (!course || !semester || !shift) return false;

  const query = Classroom.findOne({
    "metadata.course": course,
    "metadata.semester": semester,
    "metadata.shift": shift
  });

  const matchingClassroom = session ? await query.session(session) : await query;

  if (matchingClassroom) {
    // If already enrolled, skip adding to array to prevent duplicates
    if (!matchingClassroom.studentIds.includes(user._id)) {
      matchingClassroom.studentIds.push(user._id);
      await (session ? matchingClassroom.save({ session }) : matchingClassroom.save());
    }
    
    if (!user.enrolledClassroomIds.includes(matchingClassroom._id)) {
      user.enrolledClassroomIds.push(matchingClassroom._id);
      await (session ? user.save({ session }) : user.save());
    }

    const channelUpdateOpts = session ? { session } : {};
    
    if (matchingClassroom.officialChannelId) {
      await Channel.findByIdAndUpdate(
        matchingClassroom.officialChannelId,
        { $addToSet: { participants: user._id } },
        channelUpdateOpts
      );
    }
    if (matchingClassroom.unofficialChannelId) {
      await Channel.findByIdAndUpdate(
        matchingClassroom.unofficialChannelId,
        { $addToSet: { participants: user._id } },
        channelUpdateOpts
      );
    }
    
    return true;
  }
  
  return false;
}

/**
 * Remove a student from all their enrolled classrooms and corresponding channels.
 * Intended to be used when a student's profile changes significantly, prior to re-enrolling them.
 * 
 * @param {Object} user - The student user document (Mongoose doc)
 * @param {Object} session - Optional mongoose session for transactions
 */
export async function removeStudentFromAllClassrooms(user, session = null) {
  if (!user.enrolledClassroomIds || user.enrolledClassroomIds.length === 0) return;

  const channelUpdateOpts = session ? { session } : {};

  for (const classId of user.enrolledClassroomIds) {
    const query = Classroom.findById(classId);
    const oldClass = session ? await query.session(session) : await query;
    
    if (oldClass) {
      oldClass.studentIds = oldClass.studentIds.filter(id => id.toString() !== user._id.toString());
      await (session ? oldClass.save({ session }) : oldClass.save());
      
      if (oldClass.officialChannelId) {
        await Channel.findByIdAndUpdate(
          oldClass.officialChannelId, 
          { $pull: { participants: user._id } },
          channelUpdateOpts
        );
      }
      if (oldClass.unofficialChannelId) {
        await Channel.findByIdAndUpdate(
          oldClass.unofficialChannelId, 
          { $pull: { participants: user._id } },
          channelUpdateOpts
        );
      }
    }
  }

  user.enrolledClassroomIds = [];
  await (session ? user.save({ session }) : user.save());
}
