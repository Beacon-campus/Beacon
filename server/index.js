import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import admin from "firebase-admin";
import path from "path";
import { createRequire } from "module";
import mongoose from "mongoose";
import { createServer } from "http";

import connectDB from "./config/db.js";
import User from "./models/User.js";
import todoRoutes from "./routes/todos.route.js";
import sketchRoutes from "./routes/sketches.route.js";
import chatRoutes from "./routes/chat.route.js";
import classroomRoutes from "./routes/classroom.route.js";
import Classroom from "./models/Classroom.js";
import initializeSocket from "./services/socket.service.js";
import calendarRoutes from "./routes/calendar.route.js";
import timetableRoutes from "./routes/timetable.route.js";
import noteRoutes from "./routes/notes.route.js";
import assignmentRoutes from "./routes/assignment.route.js";
import uploadRoutes from "./routes/uploads.route.js";

import botRoutes from "./routes/bot.route.js";
import friendsRoutes from "./routes/friends.route.js";
import notificationRoutes from "./routes/notifications.route.js";
import adminRoutes from "./routes/admin.route.js"; // [NEW] Admin Routes
import universityRoutes from "./routes/university.route.js";
import verifyFirebaseToken from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { buildMetricsMiddleware, startMetricsSampling } from "./services/metrics.service.js";

const require = createRequire(import.meta.url);

/* ================= FIREBASE INIT ================= */
let serviceAccount;
try {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY) {
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
      universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN
    };
  } else {
    serviceAccount = require("./serviceAccountKey.json");
  }
} catch (error) {
  console.log("Error loading service account from .env or file.");
}

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} else {
  console.warn("⚠️ Firebase skipped: No service account found. Please provide FIREBASE_PROJECT_ID etc. in .env or serviceAccountKey.json");
}

/* ================= EXPRESS & SOCKET SETUP ================= */
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Dynamic CORS configuration from env (comma-separated values supported)
const allowedOrigins = String(process.env.CLIENT_URL || "http://localhost:5173,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const frameAncestors = ["'self'", ...allowedOrigins];

// INITIALIZE SOCKET.IO
// Pass 'app' so we can use req.app.get("io") in routes!
initializeSocket(server, app, allowedOrigins);

app.use(
  helmet({
    // Allow frontend origin to embed media from this API origin.
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Allow the deployed frontend to frame file responses (doc/pdf preview modal).
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "frame-ancestors": frameAncestors,
      },
    },
  })
);
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Public health check route (must stay above API rate limiter)
app.get("/health", (_, res) => res.status(200).send("OK"));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per `window`
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
  standardHeaders: true, 
  legacyHeaders: false,
});
// Apply rate limiter to all api routes
app.use("/api", apiLimiter);

app.use(express.json({ limit: "5mb" }));
app.use(buildMetricsMiddleware());

// CONNECT TO DATABASE
connectDB();
startMetricsSampling();

console.log("🔥 SERVER FILE LOADED");

/* ================= ROUTES ================= */
app.use("/api/todos", todoRoutes);
app.use("/api/sketch", sketchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/classroom", classroomRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/uploads/file", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/uploads", uploadRoutes);
app.use("/api/bot", botRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes); // [NEW] Admin Routes
app.use("/api/university", universityRoutes);

import quotesRoutes from "./routes/quotes.route.js";
import authRoutes from "./routes/auth.route.js";

app.use("/api/quotes", quotesRoutes);
app.use("/api", authRoutes); // mounts /login-lookup, /me, /update-profile, /sync-email

/* ================= HEALTH & START ================= */
app.get("/", (_, res) => res.send("Server running"));

// Global Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

