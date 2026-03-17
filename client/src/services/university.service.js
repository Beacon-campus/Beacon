import apiClient from "./apiClient";
import { clearPageCacheByPrefix, getOrFetchPageCache } from "./pageCache.service";
import { auth } from "../firebase/firebase";

function getUserKey() {
  return auth.currentUser?.uid || "guest";
}

export async function fetchRecentUniversityAnnouncements(limit = 8, options = {}) {
  const { force = false } = options;
  const userKey = getUserKey();
  return getOrFetchPageCache(
    `university:recent:${limit}`,
    userKey,
    async () => {
      const { data } = await apiClient.get(`/university/announcements/recent?limit=${limit}`);
      return data;
    },
    { ttlMs: 120_000, force }
  );
}

export async function createUniversityAnnouncement({ message, attachment, isPinned = false }) {
  const userKey = getUserKey();
  const { data } = await apiClient.post("/university/announcements", { message, attachment, isPinned });
  clearPageCacheByPrefix("university:recent:", userKey);
  clearPageCacheByPrefix("home:announcements:", userKey);
  return data;
}

export async function fetchAdminDashboardOverview(options = {}) {
  const { force = false } = options;
  const userKey = getUserKey();
  return getOrFetchPageCache(
    "admin:dashboard:overview",
    userKey,
    async () => {
      const { data } = await apiClient.get("/admin/dashboard/overview");
      return data;
    },
    { ttlMs: 30_000, force }
  );
}

export async function fetchAdminDashboardTimeline(limit = 60) {
  const { data } = await apiClient.get(`/admin/dashboard/timeline?limit=${limit}`);
  return data?.points || [];
}
