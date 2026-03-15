import {
  getAcademicCalendarByYear,
  downloadCalendarImage,
  buildCloudinaryImageUrl,
} from "../services/calendar.service.js";
import { buildCloudinaryUrl } from "../utils/cloudinaryUrl.js";
import AcademicCalendar from "../models/AcademicCalendar.js";
import User from "../models/User.js";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "../services/uploads.service.js";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const DEFAULT_ODD_PUBLIC_ID = process.env.CALENDAR_ODD_PUBLIC_ID || "calendar/odd-sem";
const DEFAULT_EVEN_PUBLIC_ID = process.env.CALENDAR_EVEN_PUBLIC_ID || "calendar/even-sem";

const normalizeCandidates = (list) =>
  [...new Set((list || []).filter((value) => typeof value === "string" && value.trim().length > 0))];

const getDefaultAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 6) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
};

const parseDataUrl = (dataUrl) => {
  const parsed = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!parsed) return null;
  const mimeType = parsed[1];
  const buffer = Buffer.from(parsed[2], "base64");
  return { mimeType, buffer };
};

const ensureAdmin = async (uid) => {
  const me = await User.findOne({ firebaseUid: uid }).lean();
  return Boolean(me && me.role === "admin");
};

export const getCurrentCalendar = async (req, res) => {
  try {
    const requestedYear = String(req.query.academicYear || "").trim();
    const academicYear = requestedYear || getDefaultAcademicYear();
    const calendar =
      (await getAcademicCalendarByYear(academicYear)) ||
      (requestedYear ? null : await getAcademicCalendarByYear("2025-2026"));

    if (!calendar) {
      return res.status(404).json({ error: "Calendar not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingEvents = calendar.events
      .filter((event) => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);

    const apiOrigin = `${req.protocol}://${req.get("host")}`;
    const oddProxyUrl = `${apiOrigin}/api/calendar/image/odd`;
    const evenProxyUrl = `${apiOrigin}/api/calendar/image/even`;

    const oddCloudinary = calendar?.oddSemCloudinary || null;
    const evenCloudinary = calendar?.evenSemCloudinary || null;

    const oddDirectUrl = oddCloudinary?.secureUrl
      || buildCloudinaryUrl({
        publicId: oddCloudinary?.publicId || DEFAULT_ODD_PUBLIC_ID,
        version: oddCloudinary?.version,
        resourceType: oddCloudinary?.resourceType || "image",
      })
      || buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_ODD_PUBLIC_ID);

    const evenDirectUrl = evenCloudinary?.secureUrl
      || buildCloudinaryUrl({
        publicId: evenCloudinary?.publicId || DEFAULT_EVEN_PUBLIC_ID,
        version: evenCloudinary?.version,
        resourceType: evenCloudinary?.resourceType || "image",
      })
      || buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_EVEN_PUBLIC_ID);

    const oddSemUrlCandidates = normalizeCandidates([
      calendar.oddSemUrl,
      oddProxyUrl,
      oddDirectUrl,
      process.env.CALENDAR_ODD_URL,
      process.env.CALENDAR_ODD_FALLBACK_URL,
    ]);

    const evenSemUrlCandidates = normalizeCandidates([
      calendar.evenSemUrl,
      evenProxyUrl,
      evenDirectUrl,
      process.env.CALENDAR_EVEN_URL,
      process.env.CALENDAR_EVEN_FALLBACK_URL,
    ]);

    res.json({
      academicYear: calendar.academicYear,
      oddSemUrl: calendar.oddSemUrl || oddDirectUrl,
      evenSemUrl: calendar.evenSemUrl || evenDirectUrl,
      oddSemCloudinary: oddCloudinary,
      evenSemCloudinary: evenCloudinary,
      oddSemUrlCandidates,
      evenSemUrlCandidates,
      events: Array.isArray(calendar.events) ? calendar.events : [],
      upcomingEvents,
    });
  } catch (err) {
    console.error("Calendar fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCalendarImage = async (req, res) => {
  try {
    if (!CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: "Cloudinary is not configured on server" });
    }

    const { semester } = req.params;
    const publicId = semester === "odd" ? DEFAULT_ODD_PUBLIC_ID : semester === "even" ? DEFAULT_EVEN_PUBLIC_ID : null;
    if (!publicId) {
      return res.status(400).json({ error: "semester must be odd or even" });
    }

    const { data, error } = await downloadCalendarImage(CLOUDINARY_CLOUD_NAME, publicId);
    if (error || !data) {
      return res.status(404).json({
        error: "Calendar image not found in storage",
        publicId,
        details: error?.message || null,
      });
    }

    const lowerPath = publicId.toLowerCase();
    const contentType =
      lowerPath.endsWith(".png")
        ? "image/png"
        : lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg")
          ? "image/jpeg"
          : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.send(data);
  } catch (err) {
    console.error("Calendar image proxy error:", err);
    return res.status(500).json({ error: "Server error while loading calendar image" });
  }
};

export const updateImagePaths = async (req, res) => {
  try {
    if (!req.user?.uid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isAdmin = await ensureAdmin(req.user.uid);
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const {
      academicYear: rawAcademicYear,
      oddSemUrl,
      evenSemUrl,
      oddImageDataUrl,
      evenImageDataUrl,
      events,
    } = req.body || {};

    const academicYear = String(rawAcademicYear || getDefaultAcademicYear()).trim();
    let nextOddUrl = String(oddSemUrl || "").trim();
    let nextEvenUrl = String(evenSemUrl || "").trim();
    const updateDoc = {};

    if (oddImageDataUrl || evenImageDataUrl) {
      if (!isCloudinaryConfigured) {
        return res.status(500).json({ error: "Cloudinary is not configured on server" });
      }
    }

    if (oddImageDataUrl) {
      const parsed = parseDataUrl(oddImageDataUrl);
      if (!parsed || !parsed.mimeType.startsWith("image/") || !parsed.buffer.length) {
        return res.status(400).json({ error: "Invalid odd semester image payload" });
      }
      const uploaded = await uploadBufferToCloudinary(
        DEFAULT_ODD_PUBLIC_ID,
        parsed.buffer,
        parsed.mimeType,
        "image",
        { overwrite: true }
      );
      const cloudinaryMeta = {
        publicId: uploaded?.public_id || DEFAULT_ODD_PUBLIC_ID,
        version: Number(uploaded?.version || 0) || null,
        resourceType: uploaded?.resource_type || "image",
        format: uploaded?.format || "png",
        secureUrl: uploaded?.secure_url || "",
      };
      nextOddUrl = cloudinaryMeta.secureUrl || buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_ODD_PUBLIC_ID);
      updateDoc.oddSemCloudinary = cloudinaryMeta;
    }

    if (evenImageDataUrl) {
      const parsed = parseDataUrl(evenImageDataUrl);
      if (!parsed || !parsed.mimeType.startsWith("image/") || !parsed.buffer.length) {
        return res.status(400).json({ error: "Invalid even semester image payload" });
      }
      const uploaded = await uploadBufferToCloudinary(
        DEFAULT_EVEN_PUBLIC_ID,
        parsed.buffer,
        parsed.mimeType,
        "image",
        { overwrite: true }
      );
      const cloudinaryMeta = {
        publicId: uploaded?.public_id || DEFAULT_EVEN_PUBLIC_ID,
        version: Number(uploaded?.version || 0) || null,
        resourceType: uploaded?.resource_type || "image",
        format: uploaded?.format || "png",
        secureUrl: uploaded?.secure_url || "",
      };
      nextEvenUrl = cloudinaryMeta.secureUrl || buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_EVEN_PUBLIC_ID);
      updateDoc.evenSemCloudinary = cloudinaryMeta;
    }

    if (nextOddUrl) updateDoc.oddSemUrl = nextOddUrl;
    if (nextEvenUrl) updateDoc.evenSemUrl = nextEvenUrl;
    if (Array.isArray(events)) updateDoc.events = events;

    const calendar = await AcademicCalendar.findOneAndUpdate(
      { academicYear },
      { $set: updateDoc, $setOnInsert: { academicYear } },
      { new: true, upsert: true }
    );

    return res.json({
      message: "Calendar updated successfully",
      academicYear: calendar.academicYear,
      oddSemUrl: calendar.oddSemUrl || "",
      evenSemUrl: calendar.evenSemUrl || "",
      events: Array.isArray(calendar.events) ? calendar.events : [],
      updatedAt: calendar.updatedAt,
    });
  } catch (err) {
    console.error("Calendar image path update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
