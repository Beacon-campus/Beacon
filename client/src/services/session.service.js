import apiClient from "./apiClient";
import { clearAllPageCache } from "./pageCache.service";

export async function notifyServerLogout() {
  try {
    await apiClient.post("/logout");
  } catch {
    // Ignore logout logging failures on client side.
  } finally {
    clearAllPageCache();
  }
}
