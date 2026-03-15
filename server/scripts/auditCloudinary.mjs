import { MongoClient } from "mongodb";

const MONGO_URI = process.env.MONGO_URI;
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "";

if (!MONGO_URI) {
  console.error("Missing MONGO_URI in environment.");
  process.exit(1);
}

const TARGET_COLLECTIONS = new Set([
  "UniversityAnnouncement",
  "Classroom",
  "Submission",
  "Message",
  "Announcement",
]);

const PROJECTION = {
  attachment: 1,
  attachments: 1,
  noteData: 1,
  uploads: 1,
  file: 1,
  subjects: 1,
  url: 1,
  downloadUrl: 1,
  previewUrl: 1,
  previewDownloadUrl: 1,
  path: 1,
};

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const DOC_EXTS = new Set(["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt"]);

function extractStrings(value, out, depth = 0, maxDepth = 6) {
  if (depth > maxDepth || value == null) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) extractStrings(item, out, depth + 1, maxDepth);
    return;
  }
  if (typeof value === "object") {
    for (const key of Object.keys(value)) {
      extractStrings(value[key], out, depth + 1, maxDepth);
    }
  }
}

function getExtensionFromString(value) {
  if (typeof value !== "string") return null;

  const proxyIdx = value.indexOf("/api/uploads/file/");
  if (proxyIdx !== -1) {
    const tail = value.slice(proxyIdx + "/api/uploads/file/".length);
    const encodedPath = tail.split("?")[0];
    try {
      const decoded = decodeURIComponent(encodedPath);
      const extMatch = decoded.match(/\.([a-z0-9]{1,5})$/i);
      if (extMatch) return extMatch[1].toLowerCase();
    } catch {
      // ignore decode errors
    }
  }

  const match = value.match(/\.([a-z0-9]{1,5})(?:[?#]|$)/i);
  if (match) return match[1].toLowerCase();
  return null;
}

function extractEncodedPath(url) {
  const idx = url.indexOf("/api/uploads/file/");
  if (idx === -1) return null;
  const tail = url.slice(idx + "/api/uploads/file/".length);
  return tail.split("?")[0];
}

function encodePublicId(publicId) {
  return String(publicId)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function classifyDecoded(decoded) {
  const lower = String(decoded).toLowerCase();
  if (lower.startsWith("data:")) return "base64";
  if (lower.startsWith("http://") || lower.startsWith("https://")) return "full_url";
  if (lower.includes("res.cloudinary.com")) return "cloudinary_url";
  return "public_id_or_path";
}

function guessResourceType(publicId) {
  const extMatch = String(publicId).match(/\.([a-z0-9]{1,5})$/i);
  if (!extMatch) return "raw";
  const ext = extMatch[1].toLowerCase();
  return IMAGE_EXTS.has(ext) ? "image" : "raw";
}

async function main() {
  const client = new MongoClient(MONGO_URI, { maxPoolSize: 2 });
  await client.connect();
  const db = client.db();

  const collections = (await db.listCollections().toArray()).map((c) => c.name);
  const included = [];

  for (const name of collections) {
    if (TARGET_COLLECTIONS.has(name)) {
      included.push(name);
      continue;
    }

    const col = db.collection(name);
    const sample = await col.findOne({
      $or: [
        { attachment: { $exists: true } },
        { attachments: { $exists: true } },
        { noteData: { $exists: true } },
        { uploads: { $exists: true } },
        { file: { $exists: true } },
        { "subjects.uploads": { $exists: true } },
        { "attachment.url": { $exists: true } },
        { "noteData.url": { $exists: true } },
      ],
    });
    if (sample) included.push(name);
  }

  const report = {
    collections: {},
    totals: {
      docsScanned: 0,
      docsWithProxy: 0,
      docsWithCloudinary: 0,
      docsWithBase64: 0,
    },
    extensions: { images: {}, documents: {}, other: {} },
    proxyUrls: [],
  };

  for (const name of included) {
    const col = db.collection(name);
    const cursor = col.find({}, { projection: PROJECTION });

    let docsScanned = 0;
    let docsWithProxy = 0;
    let docsWithCloudinary = 0;
    let docsWithBase64 = 0;

    for await (const doc of cursor) {
      docsScanned += 1;
      const strings = [];
      extractStrings(doc, strings);

      let hasProxy = false;
      let hasCloudinary = false;
      let hasBase64 = false;

      for (const value of strings) {
        if (!hasProxy && value.includes("/api/uploads/file/")) {
          hasProxy = true;
          if (report.proxyUrls.length < 200 && value.includes("/api/uploads/file/")) {
            report.proxyUrls.push(value);
          }
        }
        if (!hasCloudinary && value.includes("res.cloudinary.com")) hasCloudinary = true;
        if (!hasBase64 && value.startsWith("data:")) hasBase64 = true;

        const ext = getExtensionFromString(value);
        if (ext) {
          if (IMAGE_EXTS.has(ext)) {
            report.extensions.images[ext] = (report.extensions.images[ext] || 0) + 1;
          } else if (DOC_EXTS.has(ext)) {
            report.extensions.documents[ext] = (report.extensions.documents[ext] || 0) + 1;
          } else {
            report.extensions.other[ext] = (report.extensions.other[ext] || 0) + 1;
          }
        }
      }

      if (hasProxy) docsWithProxy += 1;
      if (hasCloudinary) docsWithCloudinary += 1;
      if (hasBase64) docsWithBase64 += 1;
    }

    report.collections[name] = {
      docsScanned,
      docsWithProxy,
      docsWithCloudinary,
      docsWithBase64,
    };

    report.totals.docsScanned += docsScanned;
    report.totals.docsWithProxy += docsWithProxy;
    report.totals.docsWithCloudinary += docsWithCloudinary;
    report.totals.docsWithBase64 += docsWithBase64;
  }

  // Encoded path analysis (10 examples)
  const proxyExamples = [];
  const seen = new Set();
  for (const url of report.proxyUrls) {
    if (proxyExamples.length >= 10) break;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const encodedPath = extractEncodedPath(url);
    if (!encodedPath) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(encodedPath);
    } catch {
      decoded = "<decode_error>";
    }
    proxyExamples.push({
      url,
      encodedPath,
      decoded,
      classification: classifyDecoded(decoded),
    });
  }

  // Availability test (10 random proxy URLs)
  const availability = [];
  const headTargets = [...new Set(report.proxyUrls)].slice(0, 10);
  for (const url of headTargets) {
    const encodedPath = extractEncodedPath(url);
    if (!encodedPath) continue;
    let decoded;
    try {
      decoded = decodeURIComponent(encodedPath);
    } catch {
      decoded = null;
    }
    if (!decoded) continue;

    const resourceType = guessResourceType(decoded);
    const cloudUrl = CLOUDINARY_CLOUD_NAME
      ? `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload/${encodePublicId(decoded)}`
      : null;

    let status = "skipped";
    let error = null;
    if (cloudUrl) {
      try {
        const res = await fetch(cloudUrl, { method: "HEAD" });
        status = res.status;
      } catch (err) {
        status = "error";
        error = err?.message || String(err);
      }
    } else {
      status = "missing_cloud_name";
    }

    availability.push({
      proxyUrl: url,
      publicId: decoded,
      resourceType,
      cloudUrl,
      status,
      error,
    });
  }

  const output = {
    collectionsScanned: included,
    attachmentCounts: report.collections,
    totals: report.totals,
    extensions: report.extensions,
    encodedPathExamples: proxyExamples,
    availability,
  };

  console.log(JSON.stringify(output, null, 2));
  await client.close();
}

main().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
