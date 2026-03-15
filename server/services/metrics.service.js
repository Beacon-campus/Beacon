import process from "node:process";
import mongoose from "mongoose";
import admin from "firebase-admin";
import { v2 as cloudinary } from "cloudinary";
import User from "../models/User.js";
import Message from "../models/Message.js";
import Classroom from "../models/Classroom.js";
import Channel from "../models/Channel.js";
import Announcement from "../models/Announcement.js";
import UniversityAnnouncement from "../models/UniversityAnnouncement.js";
import Assignment from "../models/Assignment.js";
import { isCloudinaryConfigured } from "./uploads.service.js";

const MAX_POINTS = 120;
const SAMPLE_INTERVAL_MS = 60 * 1000;

const state = {
  startedAt: Date.now(),
  requests: {
    total: 0,
    byStatus: { "2xx": 0, "4xx": 0, "5xx": 0 },
    recent: [],
  },
  timeline: [],
};

export function recordRequestMetric({ method, path, statusCode, durationMs }) {
  state.requests.total += 1;
  if (statusCode >= 500) state.requests.byStatus["5xx"] += 1;
  else if (statusCode >= 400) state.requests.byStatus["4xx"] += 1;
  else state.requests.byStatus["2xx"] += 1;

  state.requests.recent.push({
    ts: Date.now(),
    method,
    path,
    statusCode,
    durationMs: Number(durationMs || 0),
  });
  if (state.requests.recent.length > 2000) {
    state.requests.recent = state.requests.recent.slice(-1000);
  }
}

export function buildMetricsMiddleware() {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const diffNs = process.hrtime.bigint() - start;
      const durationMs = Number(diffNs) / 1e6;
      recordRequestMetric({
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
      });
    });
    next();
  };
}

function aggregateRecentMs(windowMs) {
  const now = Date.now();
  const rows = state.requests.recent.filter((row) => now - row.ts <= windowMs);
  const latencies = rows.map((r) => r.durationMs).sort((a, b) => a - b);
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)] : 0;
  const p95 = latencies.length ? latencies[Math.floor(Math.max(0, latencies.length * 0.95 - 1))] : 0;
  const errorCount = rows.filter((r) => r.statusCode >= 500).length;
  return {
    count: rows.length,
    p50: Number(p50.toFixed(2)),
    p95: Number(p95.toFixed(2)),
    errorRate: rows.length ? Number(((errorCount / rows.length) * 100).toFixed(2)) : 0,
  };
}

async function fetchFirestoreUsersCount() {
  try {
    const snap = await admin.firestore().collection("users").get();
    return snap.size;
  } catch {
    return null;
  }
}

async function fetchCloudinaryUsage() {
  if (!isCloudinaryConfigured) return null;
  try {
    return await cloudinary.api.usage();
  } catch (error) {
    console.warn("Cloudinary usage fetch failed:", error?.message || error);
    return null;
  }
}

async function getStoragePathBreakdown() {
  const [chatFiles, groupFiles, communityOfficialFiles, communityHubFiles, studyMaterialFiles, assignmentSubmissionFiles, assignmentResourceFiles, universityFiles] =
    await Promise.all([
      Message.countDocuments({ "noteData.path": { $regex: /^chat\// } }),
      Message.countDocuments({ "noteData.path": { $regex: /^groups\// } }),
      Announcement.countDocuments({ "noteData.path": { $regex: /^community\/official\// } }),
      Message.countDocuments({ "noteData.path": { $regex: /^community\/hub\// } }),
      Classroom.aggregate([
        { $unwind: "$subjects" },
        { $unwind: "$subjects.uploads" },
        { $match: { "subjects.uploads.path": { $regex: /^study-materials\// } } },
        { $count: "count" },
      ]).then((rows) => rows?.[0]?.count || 0),
      // Assignment submissions are stored in Submission.file
      mongoose.connection.collection("submissions").countDocuments({ "file.path": { $regex: /^assignments\/submissions\// } }),
      Message.countDocuments({ "noteData.path": { $regex: /^assignments\/resources\// } }),
      UniversityAnnouncement.countDocuments({
        $or: [
          { "attachment.path": { $regex: /^university\/announcements\// } },
          { "attachment.path": { $regex: /^university\// } },
        ],
      }),
    ]);

  return {
    "chat/": chatFiles,
    "groups/": groupFiles,
    "community/official/": communityOfficialFiles,
    "community/hub/": communityHubFiles,
    "study-materials/": studyMaterialFiles,
    "assignments/submissions/": assignmentSubmissionFiles,
    "assignments/resources/": assignmentResourceFiles,
    "university/announcements/": universityFiles,
  };
}

async function capturePoint() {
  const recent = aggregateRecentMs(SAMPLE_INTERVAL_MS);
  const [mongoUsers, mongoMessages, mongoClassrooms, mongoChannels, mongoAssignments, universityAnnouncements, firestoreUsers, cloudinaryUsage] =
    await Promise.all([
      User.countDocuments({}),
      Message.countDocuments({}),
      Classroom.countDocuments({}),
      Channel.countDocuments({}),
      Assignment.countDocuments({}),
      UniversityAnnouncement.countDocuments({ kind: "announcement", isActive: true }),
      fetchFirestoreUsersCount(),
      fetchCloudinaryUsage(),
    ]);

  // Cloudinary's usage API returns nested objects: { usage: 1234, credits_usage: ... }
  // Limits are typically provided generally under credits, or explicitly if available.
  const cloudStorageUsage = cloudinaryUsage?.storage?.usage || 0;
  const cloudStorageLimit = cloudinaryUsage?.credits?.limit 
    ? (cloudinaryUsage.credits.limit * 1024 * 1024 * 1024) // Rough estimation, 1 credit = ~1GB storage
    : 0;

  const cloudBandwidthUsage = cloudinaryUsage?.bandwidth?.usage || 0;
  const cloudBandwidthLimit = cloudinaryUsage?.credits?.limit
    ? (cloudinaryUsage.credits.limit * 1024 * 1024 * 1024) // Rough estimation, 1 credit = ~1GB bandwidth
    : 0;

  const cloudStoragePct = cloudStorageLimit
    ? Number(((cloudStorageUsage / cloudStorageLimit) * 100).toFixed(2))
    : 0;
  const cloudBandwidthPct = cloudBandwidthLimit
    ? Number(((cloudBandwidthUsage / cloudBandwidthLimit) * 100).toFixed(2))
    : 0;

  const point = {
    ts: Date.now(),
    requestCount: recent.count,
    p95: recent.p95,
    errorRate: recent.errorRate,
    heapUsedMB: Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)),
    mongoUsers,
    mongoMessages,
    mongoClassrooms,
    mongoChannels,
    mongoAssignments,
    universityAnnouncements,
    firestoreUsers: firestoreUsers ?? 0,
    firebaseSyncGap: firestoreUsers == null ? 0 : mongoUsers - firestoreUsers,
    cloudStoragePct,
    cloudBandwidthPct,
  };
  state.timeline.push(point);
  if (state.timeline.length > MAX_POINTS) {
    state.timeline = state.timeline.slice(-MAX_POINTS);
  }
}

let samplingTimer = null;
export function startMetricsSampling() {
  if (samplingTimer) return;
  capturePoint().catch((error) => {
    console.warn("Initial metrics sampling failed:", error?.message || error);
  });
  samplingTimer = setInterval(() => {
    capturePoint().catch((error) => {
      console.warn("Metrics sampling failed:", error?.message || error);
    });
  }, SAMPLE_INTERVAL_MS);
}

export async function getAdminDashboardOverview(io) {
  const [mongoUsers, mongoMessages, mongoClassrooms, mongoChannels, mongoAssignments, classroomAnnouncements, universityAnnouncements, firestoreUsers, cloudinaryUsage, folderBreakdown] =
    await Promise.all([
      User.countDocuments({}),
      Message.countDocuments({}),
      Classroom.countDocuments({}),
      Channel.countDocuments({}),
      Assignment.countDocuments({}),
      Announcement.countDocuments({}),
      UniversityAnnouncement.countDocuments({ kind: "announcement", isActive: true }),
      fetchFirestoreUsersCount(),
      fetchCloudinaryUsage(),
      getStoragePathBreakdown(),
    ]);

  const mongoStateMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const socketStats = { totalSockets: 0, userRooms: [], allRooms: {} };
  const recent5m = aggregateRecentMs(5 * 60 * 1000);
  const recent60m = aggregateRecentMs(60 * 60 * 1000);

  return {
    generatedAt: new Date().toISOString(),
    uptimeSec: Math.floor(process.uptime()),
    runtime: {
      nodeVersion: process.version,
      memory: {
        rssMB: Number((process.memoryUsage().rss / (1024 * 1024)).toFixed(2)),
        heapUsedMB: Number((process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2)),
        heapTotalMB: Number((process.memoryUsage().heapTotal / (1024 * 1024)).toFixed(2)),
      },
    },
    requests: {
      total: state.requests.total,
      byStatus: state.requests.byStatus,
      last5m: recent5m,
      last60m: recent60m,
    },
    mongodb: {
      state: mongoStateMap[mongoose.connection.readyState] || "unknown",
      readyState: mongoose.connection.readyState,
      counts: {
        users: mongoUsers,
        messages: mongoMessages,
        classrooms: mongoClassrooms,
        channels: mongoChannels,
        assignments: mongoAssignments,
        classroomAnnouncements,
        universityAnnouncements,
      },
    },
    firebase: {
      firestoreUsers,
      mongoUsers,
      syncGap: firestoreUsers == null ? null : mongoUsers - firestoreUsers,
    },
    cloudinary: {
      configured: isCloudinaryConfigured,
      usage: cloudinaryUsage
        ? {
            // Cloudinary Free tier groups quota in "credits" (1 credit = 1GB Storage OR 1GB Bandwidth)
            storage: cloudinaryUsage.storage?.usage || 0,
            storage_limit: cloudinaryUsage.credits?.limit ? cloudinaryUsage.credits.limit * 1024 * 1024 * 1024 : 0,
            credits: cloudinaryUsage.credits?.usage || 0,
            credits_limit: cloudinaryUsage.credits?.limit || 0,
            objects: cloudinaryUsage.objects?.usage || 0,
            bandwidth: cloudinaryUsage.bandwidth?.usage || 0,
            bandwidth_limit: cloudinaryUsage.credits?.limit ? cloudinaryUsage.credits.limit * 1024 * 1024 * 1024 : 0,
          }
        : null,
      folderBreakdown,
    },
    sockets: {
      totalSockets: socketStats.totalSockets,
      userRoomCount: socketStats.userRooms?.length || 0,
      roomCount: Object.keys(socketStats.allRooms || {}).length,
    },
  };
}

export function getDashboardTimeline(limit = 60) {
  const safeLimit = Math.min(Math.max(Number(limit) || 60, 10), MAX_POINTS);
  return state.timeline.slice(-safeLimit);
}
