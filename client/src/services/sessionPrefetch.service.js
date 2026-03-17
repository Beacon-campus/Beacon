import apiClient from "./apiClient";
import { getPageCache, setPageCache } from "./pageCache.service";

const STAGE2_DELAY_MS = 500;
const STAGE2_BATCH_SIZE = 2;
const TTL_60S = 60_000;
const TTL_120S = 120_000;

async function safeGet(url) {
  try {
    const { data } = await apiClient.get(url);
    return data;
  } catch {
    return null;
  }
}

async function getCachedOrFetch(userKey, cacheKey, url, ttlMs = 0) {
  const cached = getPageCache(cacheKey, userKey);
  if (cached !== null) return cached;
  const data = await safeGet(url);
  if (data) setPageCache(cacheKey, userKey, data, ttlMs);
  return data;
}

async function runBatches(tasks, batchSize) {
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize).map((task) => task());
    await Promise.all(batch);
  }
}

async function prefetchStage1(userKey) {
  await Promise.all([
    () => getCachedOrFetch(userKey, "auth:me", "/me", TTL_60S),
    () => getCachedOrFetch(userKey, "chat:my-channels", "/chat/my-channels", TTL_60S),
    () => getCachedOrFetch(userKey, "notifications:list", "/notifications", TTL_60S),
  ].map((task) => task()));
}

async function prefetchStage2(userKey, role) {
  const tasks = [
    () => getCachedOrFetch(userKey, "home:todos", "/todos", TTL_60S),
    () => getCachedOrFetch(userKey, "home:notes", "/notes", TTL_60S),
    () => getCachedOrFetch(userKey, "home:calendar-current", "/calendar/current", TTL_60S),
    async () => {
      const announcements = await getCachedOrFetch(
        userKey,
        "home:announcements:8",
        "/university/announcements/recent?limit=8",
        TTL_120S
      );
      if (announcements) {
        setPageCache("university:recent:8", userKey, announcements, TTL_120S);
      }
    },
  ];

  if (role === "student") {
    tasks.push(
      () => getCachedOrFetch(userKey, "bot:history:student", "/bot/history", TTL_60S),
      () => getCachedOrFetch(userKey, "student:study-materials", "/classroom/study-materials/student", TTL_120S)
    );
  }

  if (role === "teacher") {
    tasks.push(
      () => getCachedOrFetch(userKey, "bot:history:teacher", "/bot/history", TTL_60S),
      () => getCachedOrFetch(userKey, "teacher:study-materials", "/classroom/study-materials/teacher", TTL_120S),
      () => getCachedOrFetch(userKey, "teacher:assignments:my-classrooms", "/assignments/my-classrooms", TTL_120S)
    );
  }

  if (role === "admin") {
    tasks.push(
      () => getCachedOrFetch(userKey, "admin:users", "/admin/users", TTL_120S),
      () => getCachedOrFetch(userKey, "admin:classrooms", "/admin/classrooms", TTL_120S),
      () => getCachedOrFetch(userKey, "admin:dashboard:overview", "/admin/dashboard/overview", 30_000),
      () => getCachedOrFetch(userKey, "university:recent:50", "/university/announcements/recent?limit=50", TTL_60S),
      () => getCachedOrFetch(userKey, "admin:logs:page=1&limit=20", "/admin/logs?page=1&limit=20", 15_000)
    );
  }

  await runBatches(tasks, STAGE2_BATCH_SIZE);
}

export async function prefetchSessionPageCaches({ uid, role }) {
  const userKey = uid || "guest";
  await prefetchStage1(userKey);

  setTimeout(() => {
    prefetchStage2(userKey, role).catch(() => {});
  }, STAGE2_DELAY_MS);
}
