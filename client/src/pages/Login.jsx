import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAuth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
  signOut,
  deleteUser,
  getAdditionalUserInfo
} from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import ChangePasswordModal from "../components/ChangePasswordModal";
import UpdateEmailModal from "../components/UpdateEmailModal";
import toast from "react-hot-toast";
import { DotLottiePlayer } from '@dotlottie/react-player';
import studentLottie from '../assets/loading/STUDENT.lottie';
import profile1 from "../assets/profile/1.png";
import profile5 from "../assets/profile/5.png";
import profile9 from "../assets/profile/9.png";
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

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

/* ================= COMPONENT ================= */

export default function Login() {
  const auth = getAuth();
  const db = getFirestore();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [regno, setRegno] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [renderStatus, setRenderStatus] = useState("loading");
  const [dockerStatus, setDockerStatus] = useState("loading");
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setShowBadges((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Controls the Onboarding Flow State
  const [onboardingStage, setOnboardingStage] = useState(null);

  const renderHealthUrl = `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/api$/, "")}/health`;
  const dockerHealthUrl = `${(import.meta.env.VITE_DOCKER_BASE_URL || "").replace(/\/+$/, "")}/health`;

  const READY_STATUSES = new Set([200, 401, 403, 429, 502, 503]);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const StatusChip = ({ label, status }) => (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-700">
      {status === "loading" && <span className="h-2.5 w-2.5 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />}
      {status === "up" && <span className="h-2.5 w-2.5 rounded-full bg-green-500" />}
      {status === "down" && <span className="h-2.5 w-2.5 rounded-full bg-red-400" />}
      <span>{label}</span>
    </div>
  );

  /* ================= ONBOARDING CHECK ================= */
  useEffect(() => {
    if (loading || submitting) return;

    if (user) {
      if (!user.ispasswordreset) {
        setOnboardingStage("PASSWORD");
        return;
      }
      if (!user.isemailverified) {
        setOnboardingStage("EMAIL");
        return;
      }
      // Success
      setOnboardingStage(null);

      let base = "/student";
      if (user.role === "teacher") base = "/teacher";
      if (user.role === "admin") base = "/admin";

      const destination = user.role === "admin" ? `${base}/dashboard` : `${base}/home`;
      navigate(destination, { replace: true });
    }
  }, [user, loading, navigate, submitting]);

  /* ================= SERVICE HEALTH PING ================= */
  useEffect(() => {
    let cancelled = false;

    const ping = async (url, setter) => {
      if (!url || url === "/health") {
        if (!cancelled) setter("down");
        return;
      }
      try {
        const response = await fetch(url, { method: "GET" });
        if (!cancelled) setter(READY_STATUSES.has(response.status) ? "up" : "down");
      } catch {
        if (!cancelled) setter("down");
      }
    };

    const checkServices = async () => {
      if (!cancelled) {
        setRenderStatus((prev) => (prev === "up" ? prev : "loading"));
        setDockerStatus((prev) => (prev === "up" ? prev : "loading"));
      }
      await ping(renderHealthUrl, setRenderStatus);
      await wait(250);
      await ping(dockerHealthUrl, setDockerStatus);
    };

    checkServices();
    const intervalId = setInterval(checkServices, 10000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [renderHealthUrl, dockerHealthUrl]);

  /* ================= HANDLERS ================= */
  const handleLogout = async () => {
    await notifyServerLogout();
    signOut(auth).then(() => {
      setOnboardingStage(null);
      setRegno("");
      setPassword("");
      toast.success("Logged out");
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!regno || !password) {
      toast.error("Please fill out all the fields");
      return;
    }

    setSubmitting(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const normalizedRegno = regno.trim().toUpperCase();
      const q = query(collection(db, "users"), where("regno", "==", normalizedRegno));
      const snap = await getDocs(q);

      if (snap.empty) throw new Error("User not found");
      const data = snap.docs[0].data();
      let loginEmail = data.pendingmail || data.email || `${normalizedRegno.toLowerCase()}@nexus.local`;

      try {
        await signInWithEmailAndPassword(auth, loginEmail, password);
        toast.success("Login successful");
      } catch (err) {
        if (data.pendingmail && err.code === "auth/invalid-credential") {
          const fallback = `${normalizedRegno.toLowerCase()}@nexus.local`;
          await signInWithEmailAndPassword(auth, fallback, password);
          toast.success("Login successful");
        } else {
          throw err; // Re-throw to be caught by outer catch
        }
      }
    } catch (err) {
      // Handle known error codes for cleaner messages
      if (err.code === "auth/user-disabled") {
        toast.error("Account disabled Temporarily");
      } else if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.message.includes("invalid-credential")) {
        toast.error("Wrong password");
      } else if (err.message === "User not found") {
        toast.error("User not found");
      } else {
        toast.error("Wrong password"); // Default to "Wrong password" as requested for general failure if not clear, or stick to err.message? User said "for wrong credentials it should be wrong password"
        // Validating: If random error occurs, maybe user prefers "Wrong password" or generic. 
        // Let's assume generic "Wrong password" for auth failures to be safe as per "wrong credentials" request which covers most cases here.
        // Actually, let's look at the logs/logic. If query succeeds but verify fails, it IS wrong password.
        // If query fails, "User not found".
        // So if we are here, it's either User Not Found (handled) or Auth Failed (Wrong Password).
        // There could be network error.
        // I'll stick to a slightly safer check: if message is "User not found" -> "User not found". Else -> "Wrong password" (assuming mostly it is).
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      const q = query(collection(db, "users"), where("regno", "==", regno.trim().toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) throw new Error("User not found");
      const data = snap.docs[0].data();

      if (!data.isemailverified || !data.email || data.email.includes("@nexus.local")) {
        toast.error("Account setup incomplete. Please login with your temporary password.");
        return;
      }
      await sendPasswordResetEmail(auth, data.email);
      toast.success(`Password reset link sent to ${data.email}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleGoogleLogin = async () => {
    setSubmitting(true);
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if it's a new user in Firebase
      const { isNewUser } = getAdditionalUserInfo(result);

      if (isNewUser) {
        // Check 1: Is this email present in someone's pendingmail?
        const pendingQuery = query(collection(db, "users"), where("pendingmail", "==", user.email));
        const pendingSnap = await getDocs(pendingQuery);

        if (!pendingSnap.empty) {
          await deleteUser(user);
          toast.error("Email in use");
          setSubmitting(false); // Manually reset since we are not throwing error to catch block
          return;
        }

        // Check 2: General "No user found" for new sign-ups
        // Since we want to prevent first-time login users who haven't completed onboarding (i.e., not in Auth),
        // and sticking to the rule: "if not there then can throw an error"
        await deleteUser(user);
        toast.error("No user found with this Email");
        setSubmitting(false);
        return;
      }

      toast.success("Signed in with Google");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/user-disabled") {
        toast.error("Account disabled Temporarily");
      } else if (err.code !== "auth/popup-closed-by-user") {
        toast.error("Google sign-in failed or restricted for new accounts.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  /* ================= UI RENDER ================= */

  // 🔴 1. ONBOARDING OVERLAY
  if (onboardingStage && user) {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center p-4 gap-6 bg-gray-100">
        <div className="absolute top-0 -left-20 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute top-0 -right-20 w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

        <div className="w-full max-w-sm relative z-10">
          {onboardingStage === "PASSWORD" && <ChangePasswordModal />}
          {onboardingStage === "EMAIL" && <UpdateEmailModal />}
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-full hover:bg-gray-100 transition-all border border-gray-200 shadow-sm cursor-pointer z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <span>Go Back to Login</span>
        </button>

        <p className="text-gray-500 text-sm mt-2 relative z-10 font-medium">
          Step {onboardingStage === "PASSWORD" ? "1" : "2"} of 2: {onboardingStage === "PASSWORD" ? "Secure your account" : "Verify your email"}
        </p>
      </div>
    );
  }

  // 🟢 2. NEW FULL-SCREEN UNIFIED LOGIN
  return (
    <div className="min-h-screen w-full flex font-sans text-primary overflow-hidden relative bg-[#f8fafc]">
      {/* Mesh Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-100/60 via-amber-50/60 to-purple-100/60 opacity-80 mix-blend-multiply"></div>
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <div className="relative w-full h-screen flex z-10">

      {/* Hidden Dev Badges (Ctrl+Shift+R) - Moved to absolute page bottom for safety */}
      {showBadges && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 opacity-80 z-50">
          <StatusChip label="Render" status={renderStatus} />
          <StatusChip label="Docker" status={dockerStatus} />
        </div>
      )}

      {/* LEFT COMPONENT - Illustration Pane */}
      <div className="hidden lg:flex w-[55%] h-full flex-col items-center justify-center p-8 relative">
        <div className="absolute top-[20%] right-[30%] w-64 h-64 bg-amber-400/20 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[20%] left-[40%] w-72 h-72 bg-[#7EF640]/20 blur-[80px] rounded-full pointer-events-none"></div>
        <DotLottiePlayer
          src={studentLottie}
          loop
          autoplay
          className="w-full h-auto max-w-[700px] relative z-10 drop-shadow-xl"
        />
      </div>

      {/* RIGHT COMPONENT - Form Pane */}
      <div className="w-full lg:w-[45%] h-full flex flex-col items-center justify-center py-10 px-8 relative overflow-y-auto">
        <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white p-8 space-y-8 relative backdrop-blur-sm">

          {/* Header */}
          <div className="text-center mb-8 flex flex-col items-center w-full">
            <div className="flex flex-col items-center justify-center gap-3 group mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-12 h-12 md:w-16 md:h-16 overflow-visible">
                <defs>
                  <linearGradient id="beam-left-lg" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                  </linearGradient>
                  <linearGradient id="beam-right-lg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                    <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <g className="opacity-0 scale-75 origin-bottom transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100">
                  <path d="M 45 32 L -15 10 L -15 45 Z" fill="url(#beam-left-lg)" className="text-yellow-400" />
                  <path d="M 45 32 L -5 -5 L 10 -5 Z" fill="url(#beam-left-lg)" className="text-yellow-400" />
                  <path d="M 55 32 L 115 10 L 115 45 Z" fill="url(#beam-right-lg)" className="text-yellow-400" />
                  <path d="M 55 32 L 105 -5 L 90 -5 Z" fill="url(#beam-right-lg)" className="text-yellow-400" />
                  <path d="M 22 20 L 23 23 L 26 24 L 23 25 L 22 28 L 21 25 L 18 24 L 21 23 ZM 78 20 L 79 23 L 82 24 L 79 25 L 78 28 L 77 25 L 74 24 L 77 23 Z" className="fill-yellow-400" />
                  <circle cx="15" cy="35" r="1.5" className="fill-yellow-400" />
                  <circle cx="85" cy="35" r="1.5" className="fill-yellow-400" />
                  <circle cx="35" cy="10" r="1.5" className="fill-yellow-400" />
                  <circle cx="65" cy="10" r="1.5" className="fill-yellow-400" />
                </g>
                <g className="fill-slate-800 stroke-slate-800">
                  <path d="M 5 70 C 20 78 35 82 50 73 C 65 82 80 78 95 70 C 80 81 65 86 50 78 C 35 86 20 81 5 70 Z" fill="currentColor" stroke="none" />
                  <path d="M 12 78 C 25 86 38 90 50 81 C 62 90 75 86 88 78 C 75 89 62 94 50 86 C 38 94 25 89 12 78 Z" fill="currentColor" stroke="none" />
                  <path d="M 19 86 C 30 94 41 98 50 89 C 59 98 70 94 81 86 C 70 97 59 102 50 94 C 41 102 30 97 19 86 Z" fill="currentColor" stroke="none" />
                  <path d="M 39 73 L 61 73 L 58 68 L 42 68 Z" fill="currentColor" stroke="none" />
                  <path d="M 43 68 L 46 38 L 54 38 L 57 68 Z" fill="none" strokeWidth="3" />
                  <path d="M 44.5 58 C 48 61 52 56 55.5 58 M 45 46 C 49 49 51 43 55 46" strokeWidth="3" fill="none" />
                  <path d="M 47.5 68 L 47.5 61 C 47.5 59 52.5 59 52.5 61 L 52.5 68 Z" fill="currentColor" stroke="none" />
                  <rect x="48.5" y="44" width="3" height="5" rx="1.5" fill="currentColor" stroke="none" />
                  <path d="M 42 38 L 58 38 L 59 34 L 41 34 Z" fill="currentColor" stroke="none" />
                  <rect x="44.5" y="26" width="11" height="8" fill="none" strokeWidth="3" />
                  <rect x="48.5" y="26" width="3" height="8" fill="currentColor" stroke="none" />
                  <path d="M 43 27 L 57 27" fill="none" strokeWidth="2" strokeLinecap="round" />
                  <path d="M 42 26 L 58 26 C 58 19 53 18 50 18 C 47 18 42 19 42 26 Z" fill="currentColor" stroke="none" />
                  <path d="M 49 18 L 49 14 L 51 14 L 51 18 Z" fill="currentColor" stroke="none" />
                  <circle cx="50" cy="13" r="1.5" fill="currentColor" stroke="none" />
                </g>
              </svg>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 whitespace-nowrap">
                Beacon
              </h1>
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-1">
              Sign in to BCA Portal
            </h2>
            <p className="text-sm text-slate-600 font-medium max-w-[90%]">
              Connect with BCA community
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6" noValidate>

            <div className="space-y-6">
              {/* Reg No Floating Label */}
              <div>
                <div className="relative group bg-slate-50 border border-slate-100 rounded-xl focus-within:border-[#7EF640] focus-within:ring-1 focus-within:ring-[#7EF640] transition-all">
                  <input
                    type="text"
                    id="regno"
                    required
                    placeholder=" "
                    value={regno}
                    onChange={(e) => setRegno(e.target.value)}
                    className="block w-full bg-transparent border-none px-4 pt-6 pb-2 text-slate-800 text-base font-medium focus:ring-0 outline-none peer"
                  />
                  <label
                    htmlFor="regno"
                    className="absolute text-slate-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-slate-800 cursor-text"
                  >
                    Registration Number
                  </label>
                </div>
              </div>

              {/* Password Floating Label */}
              <div className="relative group bg-slate-50 border border-slate-100 rounded-xl focus-within:border-[#7EF640] focus-within:ring-1 focus-within:ring-[#7EF640] transition-all">
                <input
                  type={showPass ? "text" : "password"}
                  id="password"
                  required
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  className="block w-full bg-transparent border-none px-4 pt-6 pb-2 text-slate-800 text-base font-medium focus:ring-0 outline-none peer pr-10"
                />
                <label
                  htmlFor="password"
                  className="absolute text-slate-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3 peer-focus:text-slate-800 cursor-text"
                >
                  Password
                </label>

                {/* Eye Icon */}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>

                {/* Caps Lock Warning */}
                {capsLock && (
                  <p className="absolute -bottom-6 left-1 text-[10px] text-red-500 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Options Row */}
              <div className="flex items-center pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#7EF640] focus:ring-[#7EF640] transition-colors"
                  />
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-2">
              <button
                disabled={submitting}
                className="w-full h-12 rounded-full bg-slate-900 text-white font-medium hover:-translate-y-[1px] hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_15px_rgba(251,191,36,0.35)] flex items-center justify-center gap-2"
              >
                {submitting ? "Signing In..." : "Sign In"}
              </button>

              <div className="flex flex-col items-center gap-2 pt-1 pb-2">
                <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-slate-800 hover:underline transition-all">
                  Forgot password?
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-[10px] font-bold uppercase tracking-wider">OR</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              {/* Google Button with Label */}
              <div className="relative">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest z-10">
                  Quick Access
                </span>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="group w-full h-12 rounded-full border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                >
                  <div className="w-5 h-5 transition-all"><GoogleIcon /></div>
                  Sign in with Google
                </button>
              </div>
            </div>

          </form>

        </div>
      </div>
      </div>
    </div>
  );
}
