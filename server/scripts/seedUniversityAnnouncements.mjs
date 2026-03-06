import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs/promises";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import UniversityAnnouncement from "../models/UniversityAnnouncement.js";
import { uploadBufferToCloudinary } from "../services/uploads.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.resolve(repoRoot, "server", ".env") });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
const apiKey = process.env.CLOUDINARY_API_KEY || "";
const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

if (!cloudName || !apiKey || !apiSecret) {
  throw new Error("Cloudinary credentials are missing in server/.env");
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

function getSampleFilePath(relativePath) {
  return path.resolve(repoRoot, "client", "src", "assets", "local-storage", relativePath);
}

async function ensureUniversityFolder() {
  try {
    await cloudinary.api.create_folder("university");
    console.log("Created Cloudinary folder: university");
  } catch (error) {
    const message = String(error?.message || "");
    if (message.toLowerCase().includes("already exists")) {
      console.log("Cloudinary folder already exists: university");
      return;
    }
    throw error;
  }
}

async function uploadSample(filePath, mimeType) {
  const fileName = path.basename(filePath);
  const isImage = mimeType.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";
  const publicId = `university/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
  const buffer = await fs.readFile(filePath);
  const result = await uploadBufferToCloudinary(publicId, buffer, mimeType, resourceType);

  return {
    name: fileName,
    type: mimeType,
    url: result.secure_url,
    downloadUrl: result.secure_url,
    path: publicId,
    previewUrl: mimeType === "application/pdf" || isImage ? result.secure_url : "",
    previewDownloadUrl: mimeType === "application/pdf" || isImage ? result.secure_url : "",
    previewPath: mimeType === "application/pdf" || isImage ? publicId : "",
    previewType: mimeType === "application/pdf" ? "application/pdf" : isImage ? mimeType : "",
    previewStatus: mimeType === "application/pdf" || isImage ? "ready" : "unavailable",
    previewError: "",
    size: Number(result.bytes || 0),
    kind: isImage ? "image" : "file",
  };
}

async function seed() {
  await connectDB();

  const adminUser = await User.findOne({ role: "admin" }).select("_id role profile").lean();
  if (!adminUser?._id) {
    throw new Error("No admin user found in MongoDB. Cannot set createdBy metadata.");
  }

  await ensureUniversityFolder();

  const pdfAttachment = await uploadSample(
    getSampleFilePath(path.join("file-types", "file-example_PDF_500_kB.pdf")),
    "application/pdf"
  );
  const docxAttachment = await uploadSample(
    getSampleFilePath(path.join("file-types", "file-sample_100kB.docx")),
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const createdBy = {
    userId: adminUser._id,
    name: adminUser.profile?.name || adminUser.profile?.displayName || "Admin",
    role: adminUser.role || "admin",
    avatar: adminUser.profile?.avatar ?? null,
  };

  const payload = [
    {
      kind: "announcement",
      message: "Mid-sem exam schedule is now published. Please check the attached PDF for room and timing details.",
      attachment: pdfAttachment,
      createdBy,
      isPinned: false,
      isActive: true,
    },
    {
      kind: "announcement",
      message: "Scholarship circular is attached. Eligible students should complete submission before Friday 5 PM.",
      attachment: docxAttachment,
      createdBy,
      isPinned: false,
      isActive: true,
    },
  ];

  const inserted = await UniversityAnnouncement.insertMany(payload);
  console.log(`Inserted ${inserted.length} university announcements.`);
  console.log("Uploaded asset paths:", payload.map((p) => p.attachment?.path).filter(Boolean));
}

seed()
  .then(async () => {
    await mongoose.connection.close();
    console.log("Done.");
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
