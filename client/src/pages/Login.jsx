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

  // 🟢 2. NEW SPLIT LOGIN LAYOUT
  return (
    <div className="h-screen w-full flex bg-white font-sans text-primary overflow-hidden">

      {/* LEFT PANEL - Animation & Info */}
      <div className="hidden lg:flex w-[60%] h-full flex-col items-center justify-center p-8 bg-white relative">

        <div className="relative z-10 max-w-4xl w-full flex flex-col items-center gap-6">

          {/* Lottie Container (Top & Large) */}
          <div className="w-full flex justify-center py-2">
            <DotLottiePlayer
              src={studentLottie}
              loop
              autoplay
              className="w-full h-auto max-h-[600px] grayscale"
            />
          </div>

          {/* Bottom text */}
          <p className="text-black text-base leading-relaxed max-w-2xl font-medium text-center">
            Welcome to your digital campus. Connect seamlessly with your classmates and teachers, manage your assignments with ease, and access powerful AI tools tailored to your studies. We've brought everything you need for a productive academic life—including real-time collaboration, instant resource sharing, and smart scheduling—into one intuitive, collaborative space suitable for everyone.
          </p>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="w-full lg:w-[40%] h-full flex flex-col items-center justify-center p-6 relative bg-white overflow-y-auto">

        <div className="w-full max-w-sm space-y-8">

          {/* Header */}
          <div className="text-center space-y-2 mb-8 flex flex-col items-center w-full">
            <div className="flex items-center justify-center gap-3 group cursor-pointer mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-12 h-12 md:w-16 md:h-16">
                <g className="opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100">
                  <path d="M 45 32 L 5 15 L 5 45 Z" className="fill-yellow-400 opacity-60" />
                  <path d="M 45 32 L 15 5 L 25 5 Z" className="fill-yellow-400 opacity-40" />
                  <path d="M 55 32 L 95 15 L 95 45 Z" className="fill-yellow-400 opacity-60" />
                  <path d="M 55 32 L 85 5 L 75 5 Z" className="fill-yellow-400 opacity-40" />
                  <path d="M 25 20 L 26 23 L 29 24 L 26 25 L 25 28 L 24 25 L 21 24 L 24 23 ZM 75 20 L 76 23 L 79 24 L 76 25 L 75 28 L 74 25 L 71 24 L 74 23 Z" className="fill-yellow-400" />
                  <circle cx="15" cy="30" r="1.5" className="fill-yellow-400" />
                  <circle cx="85" cy="30" r="1.5" className="fill-yellow-400" />
                  <circle cx="35" cy="10" r="1.5" className="fill-yellow-400" />
                  <circle cx="65" cy="10" r="1.5" className="fill-yellow-400" />
                </g>
                <g className="fill-slate-800 stroke-slate-800">
                  <path d="M 50 82 C 30 82 15 75 5 70 C 10 78 25 86 50 90 C 75 86 90 78 95 70 C 85 75 70 82 50 82 Z" fill="currentColor" stroke="none" />
                  <path d="M 50 88 C 35 88 20 83 10 78 C 15 85 30 92 50 96 C 70 92 85 85 90 78 C 80 83 65 88 50 88 Z" fill="currentColor" stroke="none" />
                  <path d="M 50 94 C 35 94 25 90 15 86 C 20 91 35 97 50 100 C 65 97 80 91 85 86 C 75 90 65 94 50 94 Z" fill="currentColor" stroke="none" />
                  <path d="M 37 77 L 63 77 L 60 72 L 40 72 Z" fill="currentColor" stroke="none" />
                  <path d="M 42 72 L 46 38 L 54 38 L 58 72 Z" fill="none" strokeWidth="2.5" />
                  <path d="M 43 65 C 48 68 52 62 57 65 M 44.5 50 C 49 53 51 47 55.5 50" strokeWidth="2.5" fill="none" />
                  <path d="M 47.5 72 L 47.5 63 C 47.5 61 52.5 61 52.5 63 L 52.5 72 Z" fill="currentColor" stroke="none" />
                  <rect x="48.5" y="44" width="3" height="5" rx="1.5" fill="currentColor" stroke="none" />
                  <path d="M 43 38 L 57 38 L 58 35 L 42 35 Z" fill="currentColor" stroke="none" />
                  <rect x="45" y="27" width="10" height="8" fill="none" strokeWidth="2.5" />
                  <rect x="48" y="27" width="4" height="8" fill="currentColor" stroke="none" />
                  <path d="M 43 27 L 57 27 C 57 20 53 19 50 19 C 47 19 43 20 43 27 Z" fill="currentColor" stroke="none" />
                  <path d="M 49 19 L 49 15 L 51 15 L 51 19 Z" fill="currentColor" stroke="none" />
                  <circle cx="50" cy="14" r="1.5" fill="currentColor" stroke="none" />
                </g>
              </svg>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                Beacon
              </h1>
            </div>
            <p className="text-sm text-gray-500 font-medium max-w-[90%]">
              Your digital campus for learning, collaboration, and AI tools
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <StatusChip label="Render" status={renderStatus} />
              <StatusChip label="Docker" status={dockerStatus} />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6" noValidate>

            <div className="space-y-6">
              {/* Reg No Floating Label */}
              <div className="mt-1">
                <div className="relative group border-b-2 border-gray-200 focus-within:border-primary transition-colors pt-4 pb-1">
                  <input
                    type="text"
                    id="regno"
                    required
                    placeholder=" "
                    value={regno}
                    onChange={(e) => setRegno(e.target.value)}
                    className="block w-full bg-transparent border-none p-0 text-primary text-lg font-medium focus:ring-0 outline-none focus:outline-none peer"
                  />
                  <label
                    htmlFor="regno"
                    className="absolute text-gray-500 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-primary"
                  >
                    Registration Number
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-400">Use your institutional registration number</p>
              </div>

              {/* Password Floating Label */}
              <div className="relative group border-b-2 border-gray-200 focus-within:border-primary transition-colors pt-4 pb-1">
                <input
                  type={showPass ? "text" : "password"}
                  id="password"
                  required
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  className="block w-full bg-transparent border-none p-0 text-primary text-lg font-medium focus:ring-0 outline-none focus:outline-none peer pr-10"
                />
                <label
                  htmlFor="password"
                  className="absolute text-gray-500 duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] left-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4 peer-focus:text-primary"
                >
                  Password
                </label>

                {/* Eye Icon */}
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-0 top-1/2 translate-y-0 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>

                {/* Caps Lock Warning */}
                {capsLock && (
                  <p className="absolute -bottom-5 left-0 text-[10px] text-red-500 font-medium flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-red-500 inline-block"></span> Caps Lock is ON
                  </p>
                )}
              </div>

              {/* Options Row */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary transition-colors"
                  />
                  <span className="text-sm text-gray-500 group-hover:text-gray-700 transition-colors">Remember me</span>
                </label>

                <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-primary hover:underline transition-all">
                  Forgot password?
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4 pt-2">
              <button
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-white font-semibold hover:-translate-y-[1px] hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? "Signing In..." : "Sign In"}
              </button>

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
                  className="group w-full h-12 rounded-xl border border-gray-200 bg-white text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
                >
                  <div className="w-5 h-5 grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all"><GoogleIcon /></div>
                  Sign in with Google
                </button>
              </div>
            </div>

          </form>

          {/* Footer moved to Right Panel */}
          <div className="flex items-center justify-center gap-4 pt-6">
            <div className="flex -space-x-4 grayscale opacity-80">
              <img src={profile1} alt="User 1" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
              <img src={profile5} alt="User 2" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
              <img src={profile9} alt="User 3" className="w-10 h-10 rounded-full border-2 border-white object-cover" />
            </div>
            <p className="text-xs font-medium text-gray-400 mt-2 text-center max-w-xs">
              Used daily across campus by students and faculty to boost productivity
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
