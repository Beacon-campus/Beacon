import Log from "../models/Log.js";
import User from "../models/User.js";

function getClientIp(req) {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.trim()) {
    return xff.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "";
}

export async function resolveActorByFirebaseUid(firebaseUid, fallbackEmail = "") {
  if (!firebaseUid) {
    return {
      userId: null,
      firebaseUid: "",
      name: "",
      role: "",
      email: fallbackEmail || "",
    };
  }

  const user = await User.findOne({ firebaseUid })
    .select("_id firebaseUid role email profile.name profile.displayName")
    .lean();

  if (!user) {
    return {
      userId: null,
      firebaseUid,
      name: "",
      role: "",
      email: fallbackEmail || "",
    };
  }

  return {
    userId: user._id,
    firebaseUid: user.firebaseUid || firebaseUid,
    name: user.profile?.name || user.profile?.displayName || "",
    role: user.role || "",
    email: user.email || fallbackEmail || "",
  };
}

export async function createLogEntry(payload = {}) {
  try {
    const doc = await Log.create({
      eventType: String(payload.eventType || "SYSTEM_EVENT").trim(),
      category: String(payload.category || "system").trim(),
      action: String(payload.action || "unknown").trim(),
      status: payload.status || "info",
      actor: payload.actor || {},
      target: payload.target || {},
      metadata: payload.metadata || {},
      message: payload.message || "",
      ip: payload.ip || "",
      userAgent: payload.userAgent || "",
    });
    return doc;
  } catch (error) {
    console.error("Failed to create log entry:", error);
    return null;
  }
}

export async function createLogFromRequest(req, payload = {}) {
  const actor = payload.actor || (await resolveActorByFirebaseUid(req?.user?.uid, req?.user?.email || ""));
  return createLogEntry({
    ...payload,
    actor,
    ip: payload.ip || getClientIp(req),
    userAgent: payload.userAgent || String(req.headers["user-agent"] || ""),
  });
}

export async function hasRecentLog({ eventType, actorUserId, actorFirebaseUid, withinMinutes = 30 }) {
  const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
  const query = {
    eventType,
    createdAt: { $gte: cutoff },
  };
  if (actorUserId) {
    query["actor.userId"] = actorUserId;
  } else if (actorFirebaseUid) {
    query["actor.firebaseUid"] = actorFirebaseUid;
  }
  const exists = await Log.findOne(query).select("_id").lean();
  return !!exists;
}

export async function listServerLogs({
  page = 1,
  limit = 30,
  search = "",
  category = "",
  status = "",
  eventType = "",
} = {}) {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);

  const query = {};
  if (category) query.category = category;
  if (status) query.status = status;
  if (eventType) query.eventType = eventType;

  if (search && String(search).trim()) {
    const pattern = String(search).trim();
    query.$or = [
      { eventType: { $regex: pattern, $options: "i" } },
      { action: { $regex: pattern, $options: "i" } },
      { category: { $regex: pattern, $options: "i" } },
      { message: { $regex: pattern, $options: "i" } },
      { "actor.name": { $regex: pattern, $options: "i" } },
      { "actor.email": { $regex: pattern, $options: "i" } },
      { "metadata.fileName": { $regex: pattern, $options: "i" } },
      { "metadata.scope": { $regex: pattern, $options: "i" } },
    ];
  }

  const [total, items] = await Promise.all([
    Log.countDocuments(query),
    Log.find(query)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages: Math.max(Math.ceil(total / safeLimit), 1),
    items,
  };
}
