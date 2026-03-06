import AcademicCalendar from "../models/AcademicCalendar.js";

export const getAcademicCalendarByYear = async (academicYear) => {
  return await AcademicCalendar.findOne({ academicYear });
};

export function buildCloudinaryImageUrl(cloudName, publicId) {
  if (!cloudName || !publicId) return null;
  const normalizedPublicId = String(publicId)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return `https://res.cloudinary.com/${cloudName}/image/upload/${normalizedPublicId}`;
}

export async function downloadCalendarImage(cloudName, publicId) {
  const url = buildCloudinaryImageUrl(cloudName, publicId);
  if (!url) return { data: null, error: new Error("Missing Cloudinary URL") };

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { data: null, error: new Error(`HTTP ${response.status}`) };
    }
    const data = Buffer.from(await response.arrayBuffer());
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}
