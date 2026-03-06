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

async function run() {
  await connectDB();
  await ensureUniversityFolder();

  const adminUser = await User.findOne({ role: "admin" }).select("_id role profile").lean();
  if (!adminUser?._id) {
    throw new Error("No admin user found in MongoDB. Cannot create smoke announcement.");
  }

  const imagePath = path.resolve(
    repoRoot,
    "client",
    "src",
    "assets",
    "local-storage",
    "file-types",
    "sampleimg.png"
  );
  const imageBuffer = await fs.readFile(imagePath);
  const fileName = path.basename(imagePath);
  const publicId = `university/${Date.now()}-${fileName.replace(/\s+/g, "_")}`;
  const uploaded = await uploadBufferToCloudinary(publicId, imageBuffer, "image/png", "image");

  const createdBy = {
    userId: adminUser._id,
    name: adminUser.profile?.name || adminUser.profile?.displayName || "Admin",
    role: adminUser.role || "admin",
    avatar: adminUser.profile?.avatar ?? null,
  };

  const doc = await UniversityAnnouncement.create({
    kind: "announcement",
    message: "Campus map update: this is a smoke image announcement for modal preview testing.",
    attachment: {
      name: fileName,
      type: "image/png",
      kind: "image",
      url: uploaded.secure_url,
      downloadUrl: uploaded.secure_url,
      path: publicId,
      previewUrl: uploaded.secure_url,
      previewDownloadUrl: uploaded.secure_url,
      previewPath: publicId,
      previewType: "image/png",
      previewStatus: "ready",
      previewError: "",
      size: Number(uploaded.bytes || 0),
    },
    createdBy,
    isPinned: false,
    isActive: true,
  });

  console.log("Created university smoke announcement:", doc._id.toString());
  console.log("Cloudinary path:", publicId);
  console.log("URL:", uploaded.secure_url);
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Smoke seed failed:", error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
