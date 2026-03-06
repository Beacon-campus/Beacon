import { useEffect, useState } from "react";
import {
  verifyBeforeUpdateEmail,
  signOut,
} from "firebase/auth";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import toast from "react-hot-toast";
import { notifyServerLogout } from "../services/session.service";

/* ================= COMPONENT ================= */
export default function UpdateEmailModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("input"); // input | waiting

  /* ================= CLEAN PENDING MAIL ON OPEN ================= */

  useEffect(() => {
    const clearPending = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        await updateDoc(doc(db, "users", user.uid), {
          pendingmail: "",
        });
      } catch {
        // silent
      }
    };

    clearPending();
  }, []);

  /* ================= SEND VERIFICATION ================= */

  const handleSendVerification = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Session expired. Please login again.");
      }

      const normalizedEmail = email.trim().toLowerCase();

      // ❌ Block internal placeholder emails
      if (normalizedEmail.endsWith("@nexus.local")) {
        throw new Error("Please enter a valid email address.");
      }

      // 1️⃣ Check if email already exists
      const emailSnap = await getDocs(
        query(
          collection(db, "users"),
          where("email", "==", normalizedEmail)
        )
      );

      if (emailSnap.docs.some((d) => d.id !== user.uid)) {
        throw new Error("This email is already in use.");
      }

      // 2️⃣ Check if email already pending elsewhere
      const pendingSnap = await getDocs(
        query(
          collection(db, "users"),
          where("pendingmail", "==", normalizedEmail)
        )
      );

      if (pendingSnap.docs.some((d) => d.id !== user.uid)) {
        throw new Error("This email is already in use.");
      }

      // 3️⃣ Save pending mail
      await updateDoc(doc(db, "users", user.uid), {
        pendingmail: normalizedEmail,
      });

      // 4️⃣ Send Firebase verification
      await verifyBeforeUpdateEmail(user, normalizedEmail);

      toast.success("Verification link sent to your email");
      setStep("waiting");

    } catch (err) {
      toast.error(err.message || "Failed to send verification");

      if (err.code === "auth/requires-recent-login") {
        await notifyServerLogout();
        await signOut(auth);
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="bg-white w-full rounded-xl p-8 space-y-6 shadow-xl relative z-10">

      {step === "input" && (
        <>
          <h2 className="text-xl font-semibold text-center text-primary">
            {onClose ? "Update Email Address" : "Verify Your Email"}
          </h2>

          <p className="text-sm text-gray-500 text-center">
            {onClose ? "Enter your new email address." : "Please link a real email address to secure your account."}
          </p>

          <form onSubmit={handleSendVerification} className="space-y-4">
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* ✅ UPDATED: Single primary button (Logout is handled by parent Login.jsx) */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70"
            >
              {loading ? "Sending..." : "Send Verification Link"}
            </button>

            {/* CANCEL BUTTON (Only if onClose is provided) */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 text-gray-600 font-medium hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-200"
              >
                Cancel
              </button>
            )}
          </form>
        </>
      )}

      {step === "waiting" && (
        <div className="space-y-5 text-center">
          <div className="text-4xl">📩</div>

          <h3 className="text-lg font-semibold text-primary">
            Check your inbox
          </h3>

          <p className="text-sm text-gray-500">
            We sent a verification link to <br />
            <b className="text-primary">{email}</b>
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-left text-yellow-800">
            <ol className="list-decimal list-inside space-y-1">
              <li>Open your email</li>
              <li>Click the verification link</li>
              <li>Come back here and click below</li>
            </ol>
          </div>

          <button
            onClick={async () => {
              await notifyServerLogout();
              await signOut(auth);
              window.location.reload();
            }}
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            I’ve verified — Login again
          </button>
        </div>
      )}

    </div>
  );
}
