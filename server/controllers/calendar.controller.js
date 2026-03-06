import {
  getAcademicCalendarByYear,
  downloadCalendarImage,
  buildCloudinaryImageUrl,
} from "../services/calendar.service.js";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";
const DEFAULT_ODD_PUBLIC_ID = process.env.CALENDAR_ODD_PUBLIC_ID || "calendar/odd-sem";
const DEFAULT_EVEN_PUBLIC_ID = process.env.CALENDAR_EVEN_PUBLIC_ID || "calendar/even-sem";

const normalizeCandidates = (list) =>
  [...new Set((list || []).filter((value) => typeof value === "string" && value.trim().length > 0))];

export const getCurrentCalendar = async (req, res) => {
  try {
    const calendar = await getAcademicCalendarByYear("2025-2026");

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

    const oddDirectUrl = buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_ODD_PUBLIC_ID);
    const evenDirectUrl = buildCloudinaryImageUrl(CLOUDINARY_CLOUD_NAME, DEFAULT_EVEN_PUBLIC_ID);

    const oddSemUrlCandidates = normalizeCandidates([
      oddProxyUrl,
      oddDirectUrl,
      process.env.CALENDAR_ODD_URL,
      process.env.CALENDAR_ODD_FALLBACK_URL,
      calendar.oddSemUrl,
    ]);

    const evenSemUrlCandidates = normalizeCandidates([
      evenProxyUrl,
      evenDirectUrl,
      process.env.CALENDAR_EVEN_URL,
      process.env.CALENDAR_EVEN_FALLBACK_URL,
      calendar.evenSemUrl,
    ]);

    res.json({
      academicYear: calendar.academicYear,
      oddSemUrl: oddDirectUrl || calendar.oddSemUrl,
      evenSemUrl: evenDirectUrl || calendar.evenSemUrl,
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
    return res.status(501).json({
      error: "Not implemented yet. Configure CALENDAR_ODD_PUBLIC_ID and CALENDAR_EVEN_PUBLIC_ID in server/.env",
    });
  } catch (err) {
    console.error("Calendar image path update error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
