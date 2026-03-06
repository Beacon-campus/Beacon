import axios from "axios";
import { auth } from "../firebase/firebase";
import { server } from "../main";

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchRecentUniversityAnnouncements(limit = 8) {
  const headers = await getAuthHeaders();
  const { data } = await axios.get(`${server}/university/announcements/recent?limit=${limit}`, { headers });
  return data;
}

export async function createUniversityAnnouncement({ message, attachment, isPinned = false }) {
  const headers = await getAuthHeaders();
  const { data } = await axios.post(
    `${server}/university/announcements`,
    { message, attachment, isPinned },
    { headers }
  );
  return data;
}

export async function fetchAdminDashboardOverview() {
  const headers = await getAuthHeaders();
  const { data } = await axios.get(`${server}/admin/dashboard/overview`, { headers });
  return data;
}

export async function fetchAdminDashboardTimeline(limit = 60) {
  const headers = await getAuthHeaders();
  const { data } = await axios.get(`${server}/admin/dashboard/timeline?limit=${limit}`, { headers });
  return data?.points || [];
}
