import { auth } from "../firebase/firebase";
import { server } from "../main";

export async function notifyServerLogout() {
  try {
    const token = await auth.currentUser?.getIdToken?.();
    if (!token) return;
    await fetch(`${server}/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Ignore logout logging failures on client side.
  }
}
