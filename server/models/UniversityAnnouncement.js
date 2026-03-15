import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    type: { type: String, default: "file" },
    name: { type: String, default: "" },
    mimeType: { type: String, default: "" },
    cloudinary: {
      publicId: { type: String, required: true },
      version: { type: Number, required: true },
      resourceType: { type: String, required: true },
      format: { type: String, required: true },
      secureUrl: { type: String, required: true },
    },
    previewUrl: { type: String, default: "" },
    previewDownloadUrl: { type: String, default: "" },
    previewPath: { type: String, default: "" },
    previewType: { type: String, default: "" },
    previewStatus: { type: String, default: "" },
    previewError: { type: String, default: "" },
    size: { type: Number, default: 0 },
    kind: { type: String, enum: ["image", "file"], default: "file" },
  },
  { _id: false }
);

const universityAnnouncementSchema = new mongoose.Schema(
  {
    kind: { type: String, default: "announcement", index: true },
    message: { type: String, trim: true, default: "" },
    attachment: { type: attachmentSchema, default: null },
    createdBy: {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      avatar: { type: Number, default: null },
    },
    isPinned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, collection: "university" }
);

universityAnnouncementSchema.index({ createdAt: -1 });

export default mongoose.model("UniversityAnnouncement", universityAnnouncementSchema);
