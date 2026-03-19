import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
dotenv.config({ path: path.resolve(repoRoot, "server", ".env") });

const MONGO_URI = process.env.MONGO_URI || "";
const TARGET_BASE_URL = process.env.API_URL || "";
const DRY_RUN = String(process.env.DRY_RUN || "0") === "1";

const BASE_SOURCE_PATTERNS = [
  "http://localhost:5000",
  "https://localhost:5000",
  "http://127.0.0.1:5000",
  "https://127.0.0.1:5000",
  "localhost:5000",
  "127.0.0.1:5000",
];

function normalizeTargetBaseUrl(url) {
  const normalized = String(url || "").trim().replace(/\/+$/, "");
  if (!normalized) {
    throw new Error("API_URL is required for migration.");
  }
  const parsed = new URL(normalized);
  if (parsed.protocol !== "https:") {
    throw new Error("API_URL must be HTTPS for production migration.");
  }
  return normalized;
}

function buildSourcePatterns(targetBaseUrl) {
  const parsed = new URL(targetBaseUrl);
  return [
    ...BASE_SOURCE_PATTERNS,
    // Catch old mixed-content links on the production host, e.g. http://streak-api-... .
    `http://${parsed.host}`,
  ];
}

function replaceSourceUrl(input, targetBaseUrl, sourcePatterns) {
  if (typeof input !== "string" || !input) return input;
  let out = input;
  for (const source of sourcePatterns) {
    out = out.split(source).join(targetBaseUrl);
  }
  return out;
}

function deepReplace(value, targetBaseUrl, sourcePatterns, stats) {
  if (typeof value === "string") {
    const replaced = replaceSourceUrl(value, targetBaseUrl, sourcePatterns);
    if (replaced !== value) {
      stats.stringsChanged += 1;
      return { value: replaced, changed: true };
    }
    return { value, changed: false };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = deepReplace(item, targetBaseUrl, sourcePatterns, stats);
      changed = changed || result.changed;
      return result.value;
    });
    return { value: next, changed };
  }

  if (value && typeof value === "object") {
    // Preserve BSON/native types that should not be traversed as plain objects.
    if (
      value instanceof Date ||
      value instanceof mongoose.Types.ObjectId ||
      Buffer.isBuffer(value)
    ) {
      return { value, changed: false };
    }

    let changed = false;
    const next = {};
    for (const [key, val] of Object.entries(value)) {
      const result = deepReplace(val, targetBaseUrl, sourcePatterns, stats);
      changed = changed || result.changed;
      next[key] = result.value;
    }
    return { value: next, changed };
  }

  return { value, changed: false };
}

async function migrateCollection(collection, targetBaseUrl, sourcePatterns, summary) {
  const cursor = collection.find({}, { projection: { _id: 1 } });
  let scanned = 0;
  let changedDocs = 0;
  let changedStrings = 0;

  while (await cursor.hasNext()) {
    const { _id } = await cursor.next();
    const doc = await collection.findOne({ _id });
    scanned += 1;

    if (!doc) continue;
    const stats = { stringsChanged: 0 };
    const { value: updatedDoc, changed } = deepReplace(doc, targetBaseUrl, sourcePatterns, stats);
    if (!changed) continue;

    changedDocs += 1;
    changedStrings += stats.stringsChanged;
    if (!DRY_RUN) {
      await collection.replaceOne({ _id }, updatedDoc);
    }
  }

  summary.collections.push({
    name: collection.collectionName,
    scanned,
    changedDocs,
    changedStrings,
  });
  summary.totalScanned += scanned;
  summary.totalChangedDocs += changedDocs;
  summary.totalChangedStrings += changedStrings;
}

async function run() {
  const targetBaseUrl = normalizeTargetBaseUrl(TARGET_BASE_URL);
  const sourcePatterns = buildSourcePatterns(targetBaseUrl);
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is required.");
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  const allCollections = await db.listCollections().toArray();
  const collections = allCollections
    .map((c) => c.name)
    .filter((name) => !name.startsWith("system."));

  const summary = {
    dryRun: DRY_RUN,
    targetBaseUrl,
    sourcePatterns,
    totalScanned: 0,
    totalChangedDocs: 0,
    totalChangedStrings: 0,
    collections: [],
  };

  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    await migrateCollection(collection, targetBaseUrl, sourcePatterns, summary);
  }

  console.log(JSON.stringify(summary, null, 2));
}

run()
  .then(async () => {
    await mongoose.connection.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("URL migration failed:", error);
    try {
      await mongoose.connection.close();
    } catch {
      // ignore close errors
    }
    process.exit(1);
  });
