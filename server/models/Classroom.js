import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true, // e.g. BCA601
    },
    name: {
      type: String,
      required: true, // e.g. Web Development
    },
    teacherIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    uploads: [
      {
        name: { type: String, required: true },
        type: { type: String, default: "file" },
        mimeType: { type: String, required: true },
        cloudinary: {
          publicId: { type: String, required: true },
          version: { type: Number, required: true },
          resourceType: { type: String, required: true },
          format: { type: String, required: true },
          secureUrl: { type: String, required: true },
        },
        previewUrl: { type: String },
        previewDownloadUrl: { type: String },
        previewPath: { type: String },
        previewType: { type: String },
        previewStatus: { type: String },
        previewError: { type: String },
        size: { type: Number, default: 0 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { _id: true }
);

const classroomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  
  metadata: {
    course: { type: String, required: true },
    semester: { type: Number, required: true },
    shift: { type: String, required: true },
  },
  
  studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  
  // SUBJECT → TEACHER mapping (source of truth)
  subjects: [subjectSchema],

  officialChannelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },
  unofficialChannelId: { type: mongoose.Schema.Types.ObjectId, ref: "Channel" },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Classroom || mongoose.model("Classroom", classroomSchema);
