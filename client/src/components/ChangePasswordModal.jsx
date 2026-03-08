import { useState } from "react";
import {
  reauthenticateWithCredential,
  signOut,
  EmailAuthProvider,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { auth, db } from "../firebase/firebase";
import toast from "react-hot-toast";
import { notifyServerLogout } from "../services/session.service";

/* ================= ICONS ================= */
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);

/* ================= COMPONENT ================= */
export default function ChangePasswordModal({ onClose, isProfileView }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (newPassword !== confirmPassword) {
        throw new Error("New passwords do not match!");
      }

      const user = auth.currentUser;
      if (!user) throw new Error("Session expired. Please login again.");

      // 1. Re-authenticate
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);

      // 2. Update actual password
      await updatePassword(user, newPassword);

      // 3. Update Firestore Flag and delete temppassword
      await updateDoc(doc(db, "users", user.uid), {
        ispasswordreset: true,
        temppassword: deleteField(),
      });

      if (isProfileView) {
        toast.success("Password updated successfully. Please login again.");
        await notifyServerLogout();
        await signOut(auth);
      } else {
        toast.success("Password secured! Processing to next step...");
      }

      window.location.reload();

    } catch (err) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="bg-white w-full rounded-xl p-8 shadow-2xl relative z-10">
      <h2 className="text-xl font-semibold text-center text-primary mb-2">
        {isProfileView ? "Update Password" : "Change Password"}
      </h2>

      <p className="text-sm text-gray-500 text-center mb-6">
        {isProfileView
          ? "Enter your current password to set a new one."
          : "You must set a new password to continue."
        }
      </p>

      {/* ✅ ADDED FORM TAG HERE */}
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* CURRENT PASSWORD */}
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            placeholder="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showCurrent ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* NEW PASSWORD */}
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showNew ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {/* CONFIRM NEW PASSWORD */}
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 bg-gray-50/80 border border-gray-200 rounded-xl pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 bg-[#0F172A] hover:bg-[#1e293b] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 mt-2"
        >
          {loading ? "Updating..." : "Update Password"}
        </button>

        {/* CANCEL BUTTON */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 text-gray-600 font-bold bg-gray-100/80 hover:bg-gray-200/80 rounded-xl transition-all"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
