import apiClient from "./apiClient";
import { setPageCache } from "./pageCache.service";

async function safeGet(url) {
  try {
    const { data } = await apiClient.get(url);
    return data;
  } catch {
    return null;
  }
}

async function prefetchCommon(userKey) {
  const [quote, calendar, todos, notes, notifications, announcements] = await Promise.all([
    safeGet("/quotes/random"),
    safeGet("/calendar/current"),
    safeGet("/todos"),
    safeGet("/notes"),
    safeGet("/notifications"),
    safeGet("/university/announcements/recent?limit=8"),
  ]);

  if (quote) {
    setPageCache("student:home:quote", userKey, quote);
    setPageCache("teacher:home:quote", userKey, quote);
  }
  if (calendar) {
    setPageCache("student:home:calendar-current", userKey, calendar, 60_000);
    setPageCache("teacher:home:calendar-current", userKey, calendar, 60_000);
  }
  if (todos) {
    setPageCache("home:todos", userKey, todos);
  }
  if (notes) {
    setPageCache("home:notes", userKey, notes);
  }
  if (notifications) {
    setPageCache("home:notifications:8", userKey, notifications, 60_000);
  }
  if (announcements) {
    setPageCache("home:announcements:8", userKey, announcements, 60_000);
    setPageCache("university:recent:8", userKey, announcements, 60_000);
  }
}

async function prefetchStudent(userKey) {
  const [studyMaterials, botHistory] = await Promise.all([
    safeGet("/classroom/study-materials/student"),
    safeGet("/bot/history"),
  ]);
  if (studyMaterials) {
    setPageCache("student:study-materials", userKey, studyMaterials, 120_000);
  }
  if (botHistory) {
    setPageCache("bot:history:student", userKey, botHistory, 60_000);
  }
}

async function prefetchTeacher(userKey) {
  const [studyMaterials, classrooms, botHistory] = await Promise.all([
    safeGet("/classroom/study-materials/teacher"),
    safeGet("/assignments/my-classrooms"),
    safeGet("/bot/history"),
  ]);

  if (studyMaterials) {
    setPageCache("teacher:study-materials", userKey, studyMaterials, 120_000);
  }
  if (classrooms) {
    setPageCache("teacher:assignments:my-classrooms", userKey, classrooms, 120_000);
  }
  if (botHistory) {
    setPageCache("bot:history:teacher", userKey, botHistory, 60_000);
  }
}

async function prefetchAdmin(userKey) {
  const [users, classrooms, dashboardOverview, announcements, logs] = await Promise.all([
    safeGet("/admin/users"),
    safeGet("/admin/classrooms"),
    safeGet("/admin/dashboard/overview"),
    safeGet("/university/announcements/recent?limit=50"),
    safeGet("/admin/logs?page=1&limit=20"),
  ]);

  if (users) setPageCache("admin:users", userKey, users, 120_000);
  if (classrooms) setPageCache("admin:classrooms", userKey, classrooms, 120_000);
  if (dashboardOverview) setPageCache("admin:dashboard:overview", userKey, dashboardOverview, 30_000);
  if (announcements) setPageCache("university:recent:50", userKey, announcements, 60_000);
  if (logs) setPageCache("admin:logs:page=1&limit=20", userKey, logs, 15_000);
}

export async function prefetchSessionPageCaches({ uid, role }) {
  const userKey = uid || "guest";
  await prefetchCommon(userKey);

  if (role === "student") {
    await prefetchStudent(userKey);
    return;
  }
  if (role === "teacher") {
    await prefetchTeacher(userKey);
    return;
  }
  if (role === "admin") {
    await prefetchAdmin(userKey);
  }
}
