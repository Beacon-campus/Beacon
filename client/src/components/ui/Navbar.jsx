import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../ChangePasswordModal";
import AdminEditProfileModal from "../admin/AdminEditProfileModal";
import { notifyServerLogout } from "../../services/session.service";

// Import your SVGs

import { useEffect, useState } from "react";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogoAnimating, setIsLogoAnimating] = useState(false);

  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!isLogoAnimating) return undefined;

    const timeoutId = window.setTimeout(() => {
      setIsLogoAnimating(false);
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [isLogoAnimating]);

  if (!user) return null;

  const role = user.role;
  const basePath = role === "teacher" ? "/teacher" : "/student";
  const isCommunity = location.pathname.startsWith(`${basePath}/community`);
  const isHome = location.pathname.startsWith(`${basePath}/`) && !isCommunity;

  const handleLogout = async () => {
    localStorage.removeItem("userQuote"); // Clear stored quote
    localStorage.removeItem("classroomColors"); // Clear stored classroom colors
    const auth = getAuth();
    await notifyServerLogout();
    await signOut(auth);
    navigate("/", { replace: true });
  };

  const triggerMobileLogoAnimation = () => {
    setIsLogoAnimating(false);

    window.requestAnimationFrame(() => {
      setIsLogoAnimating(true);
    });
  };

  const getTabClass = (isActive) => {
    const base = "relative z-10 flex items-center justify-center gap-2 w-36 px-4 py-2 rounded-full text-sm font-bold text-center transition-all duration-200";
    return isActive ? `${base} text-white` : `${base} text-[#64748B] hover:text-[#0F172A] hover:bg-gray-200/50`;
  };

  // Helper for Icon styling


  const avatarId = user?.profile?.avatar || 11;
  const avatarUrl = new URL(`../../assets/profile/${avatarId}.png`, import.meta.url).href;

  return (
    <div className="w-full">
      {/* Mobile Top Header Strip */}
      <div className="hidden max-[768px]:flex fixed top-0 left-0 right-0 z-[60] h-[64px] items-center justify-between border-b border-white/50 bg-white/55 px-4 py-2 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.45)] backdrop-blur-2xl supports-[backdrop-filter]:bg-white/45">
        {/* Mobile Header Logo */}
        <button
          type="button"
          onClick={triggerMobileLogoAnimation}
          className={`group flex items-center gap-3 rounded-full border border-transparent px-1.5 py-1 transition-all duration-300 active:scale-95 ${isLogoAnimating ? "scale-[1.02] -translate-y-0.5" : ""}`}
          aria-label="Animate Beacon logo"
        >
          <div className="flex items-center justify-center min-w-[34px] w-[34px] flex-shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="h-[34px] w-[34px] overflow-visible">
              <defs>
                <linearGradient id="beam-left-mob" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="beam-right-mob" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <g className={`origin-bottom transition-all duration-300 ease-out ${isLogoAnimating ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
                <path d="M 45 32 L -15 10 L -15 45 Z" fill="url(#beam-left-mob)" className="text-yellow-400" />
                <path d="M 45 32 L -5 -5 L 10 -5 Z" fill="url(#beam-left-mob)" className="text-yellow-400" />
                <path d="M 55 32 L 115 10 L 115 45 Z" fill="url(#beam-right-mob)" className="text-yellow-400" />
                <path d="M 55 32 L 105 -5 L 90 -5 Z" fill="url(#beam-right-mob)" className="text-yellow-400" />
                <path d="M 22 20 L 23 23 L 26 24 L 23 25 L 22 28 L 21 25 L 18 24 L 21 23 ZM 78 20 L 79 23 L 82 24 L 79 25 L 78 28 L 77 25 L 74 24 L 77 23 Z" className="fill-yellow-400" />
                <circle cx="15" cy="35" r="1.5" className="fill-yellow-400" />
                <circle cx="85" cy="35" r="1.5" className="fill-yellow-400" />
                <circle cx="35" cy="10" r="1.5" className="fill-yellow-400" />
                <circle cx="65" cy="10" r="1.5" className="fill-yellow-400" />
              </g>
              <g className={`fill-slate-800 stroke-slate-800 transition-all duration-300 ${isLogoAnimating ? "scale-[1.02]" : "scale-100"}`}>
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
          </div>
          <span className="text-[1.32rem] font-extrabold tracking-tight text-slate-800">Beacon</span>
        </button>

        {/* Mobile Header Logout */}
        <button
          onClick={handleLogout}
          className="group flex items-center gap-1.5 rounded-full border border-white/60 bg-white/55 px-3 py-2 text-xs font-bold text-gray-600 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.55)] transition-all hover:scale-105 hover:bg-white/75 hover:text-black"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 group-hover:opacity-100 transition-opacity" fill="currentColor">
            <path d="m15.889 16.011c-.817-.099-1.57.488-1.668 1.311-.117.979-.253 1.74-.36 2.263-.483.095-1.137.204-1.86.288v-14.354c.78.119 1.458.28 1.935.413.081.416.181 1 .272 1.751.098.826.865 1.41 1.672 1.306.822-.101 1.407-.85 1.307-1.672-.233-1.893-.51-2.873-.54-2.978-.133-.455-.474-.821-.918-.986.018.009-1.903-.691-3.728-.847v-.444c0-.521-.401-.956-.921-.997-.519-.041-1.049-.065-1.579-.065-3.44 0-6.813 1-6.954 1.042-.329.099-.585.359-.677.69-.035.128-.869 3.201-.869 9.268s.824 9.619.859 9.768c.095.402.427.705.837.762.139.019 2.304.471 6.804.471 2.679 0 6.016-.664 5.976-.7.511-.131.915-.521 1.064-1.025.016-.053.386-1.312.659-3.596.099-.823-.488-1.569-1.311-1.668zm-8.889-4.011c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm15.8 1.1c-.768 1.024-1.676 1.933-2.701 2.701-.176.132-.387.2-.6.2-.536.01-1.011-.461-1-1v-1h-3c-.828 0-1.5-.671-1.5-1.5s.672-1.5 1.5-1.5h3v-1c0-.379.214-.725.553-.895s.744-.133 1.047.094c1.024.768 1.933 1.676 2.701 2.701.266.355.266.844 0 1.199z" />
          </svg>
          <span className="hidden min-[321px]:inline">LOGOUT</span>
        </button>
      </div>

      {/* Desktop Navbar */}
      <div className="relative flex flex-col md:flex-row items-center justify-between min-h-[60px] max-[768px]:hidden flex-1 w-full">
        {/* Spacer to push Logout button to the right in flex justify-between */}
        <div className="w-32"></div>

        {/* ============================================================
            Center: Tabs Container
            FIX: Removed 'relative' from the end of this className.
            It is now purely 'absolute' so it centers correctly.
           ============================================================ */}
        {/* Center: Tabs Container (Hidden for Admin/Mobile) */}
        {/* Center: Tabs Container (Hidden for Admin/Mobile) */}
        {role !== "admin" && (
          <div className="absolute left-1/2 top-1/2 hidden min-[769px]:flex -translate-x-1/2 -translate-y-1/2 items-center glass-panel rounded-full p-1 shadow-sm">

            {/* THE SLIDING PILL BACKGROUND */}
            <div
              className={`absolute left-1 top-1 bottom-1 w-36 rounded-full bg-[#0F172A] shadow-sm transition-transform duration-300 ease-out border border-gray-800 ${isCommunity ? "translate-x-[9.5rem]" : "translate-x-0"
                }`}
            />

            {/* HOME LINK */}
            <Link
              to={`${basePath}/home`}
              className={getTabClass(isHome)}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 transition-all duration-200"
                fill="currentColor"
              >
                <path d="M23,22h-3V6c0-2.206-1.794-4-4-4h-.535c-.238-.411-.55-.782-.929-1.092C13.606,.146,12.396-.157,11.216,.079l-3.197,.639c-2.329,.466-4.019,2.528-4.019,4.903V22H1c-.552,0-1,.447-1,1s.448,1,1,1H23c.552,0-1-.447,1-1s-.448-1-1-1ZM11.5,14c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5,.672,1.5,1.5-.672,1.5-1.5,1.5Zm6.5,8h-2V4c1.103,0,2,.897,2,2V22Z" />
              </svg>
              <span>Home</span>
            </Link>

            {/* Spacer */}
            <div className="w-2" />

            {/* COMMUNITY LINK */}
            <Link
              to={`${basePath}/community`}
              className={getTabClass(isCommunity)}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 transition-all duration-200"
                fill="currentColor"
              >
                <path d="m.213,9.145c-.341-.435-.264-1.063.171-1.404L8.919,1.062c1.814-1.419,4.348-1.42,6.162,0l8.535,6.679c.435.34.512.969.171,1.404-.197.252-.491.384-.788.384-.215,0-.433-.069-.615-.212L13.849,2.638c-1.088-.852-2.609-.852-3.697,0L1.616,9.316c-.436.34-1.063.262-1.403-.171Zm4.395,9.06c.247.189.393.483.393.795v4c0,.553-.447,1-1,1H1c-.553,0-1-.447-1-1,0-2.286,1.571-4.374,3.737-4.965.299-.08.622-.019.87.17Zm19.393,4.795c0,.553-.447,1-1,1h-3c-.553,0-1-.447-1-1v-4c0-.312.146-.605.393-.795.249-.188.573-.25.87-.17,2.166.591,3.737,2.679,3.737,4.965ZM4.5,11c-1.381,0-2.5,1.119-2.5,2.5s1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5-1.119-2.5-2.5-2.5Zm17.5,2.5c0-1.381-1.119-2.5-2.5-2.5s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5Zm-10-5.5c-1.381,0-2.5,1.119-2.5,2.5s1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5-1.119-2.5-2.5-2.5Zm5,12v3c0,.553-.447,1-1,1h-8c-.553,0-1-.447-1-1v-3c0-2.757,2.243-5,5-5s5,2.243,5,5Z" />
              </svg>
              <span>Community</span>
            </Link>
          </div>
        )}

        {/* Right: Logout / Admin Profile */}
        {role === "admin" ? (
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setShowAdminProfile(!showAdminProfile)}
              className="flex items-center justify-center rounded-full border-2 border-transparent hover:border-primary transition-colors focus:outline-none"
            >
              <img src={avatarUrl} alt="Admin Profile" className="w-10 h-10 rounded-full object-cover shadow-sm" />
            </button>

            {showAdminProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAdminProfile(false)}
                />
                <div className="absolute top-14 right-0 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={avatarUrl} alt="Admin Profile" className="w-12 h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-bold text-gray-800 truncate">{user?.profile?.displayName || "Admin User"}</span>
                      <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 my-2"></div>

                  <button
                    onClick={() => { setShowAdminProfile(false); setShowProfileModal(true); }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 mb-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-400">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    Edit Profile
                  </button>

                  <button
                    onClick={() => { setShowAdminProfile(false); setShowPasswordModal(true); }}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-400">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" />
                    </svg>
                    Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3 mt-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-red-400">
                      <path d="m15.889 16.011c-.817-.099-1.57.488-1.668 1.311-.117.979-.253 1.74-.36 2.263-.483.095-1.137.204-1.86.288v-14.354c.78.119 1.458.28 1.935.413.081.416.181 1 .272 1.751.098.826.865 1.41 1.672 1.306.822-.101 1.407-.85 1.307-1.672-.233-1.893-.51-2.873-.54-2.978-.133-.455-.474-.821-.918-.986.018.009-1.903-.691-3.728-.847v-.444c0-.521-.401-.956-.921-.997-.519-.041-1.049-.065-1.579-.065-3.44 0-6.813 1-6.954 1.042-.329.099-.585.359-.677.69-.035.128-.869 3.201-.869 9.268s.824 9.619.859 9.768c.095.402.427.705.837.762.139.019 2.304.471 6.804.471 2.679 0 6.016-.664 5.976-.7.511-.131.915-.521 1.064-1.025.016-.053.386-1.312.659-3.596.099-.823-.488-1.569-1.311-1.668zm-8.889-4.011c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm15.8 1.1c-.768 1.024-1.676 1.933-2.701 2.701-.176.132-.387.2-.6.2-.536.01-1.011-.461-1-1v-1h-3c-.828 0-1.5-.671-1.5-1.5s.672-1.5 1.5-1.5h3v-1c0-.379.214-.725.553-.895s.744-.133 1.047.094c1.024.768 1.933 1.676 2.701 2.701.266.355.266.844 0 1.199z" />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold text-gray-600 hover:text-black transition-all group glass-panel hover:scale-105"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 group-hover:opacity-100 transition-opacity"
              fill="currentColor"
            >
              <path d="m15.889 16.011c-.817-.099-1.57.488-1.668 1.311-.117.979-.253 1.74-.36 2.263-.483.095-1.137.204-1.86.288v-14.354c.78.119 1.458.28 1.935.413.081.416.181 1 .272 1.751.098.826.865 1.41 1.672 1.306.822-.101 1.407-.85 1.307-1.672-.233-1.893-.51-2.873-.54-2.978-.133-.455-.474-.821-.918-.986.018.009-1.903-.691-3.728-.847v-.444c0-.521-.401-.956-.921-.997-.519-.041-1.049-.065-1.579-.065-3.44 0-6.813 1-6.954 1.042-.329.099-.585.359-.677.69-.035.128-.869 3.201-.869 9.268s.824 9.619.859 9.768c.095.402.427.705.837.762.139.019 2.304.471 6.804.471 2.679 0 6.016-.664 5.976-.7.511-.131.915-.521 1.064-1.025.016-.053.386-1.312.659-3.596.099-.823-.488-1.569-1.311-1.668zm-8.889-4.011c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm15.8 1.1c-.768 1.024-1.676 1.933-2.701 2.701-.176.132-.387.2-.6.2-.536.01-1.011-.461-1-1v-1h-3c-.828 0-1.5-.671-1.5-1.5s.672-1.5 1.5-1.5h3v-1c0-.379.214-.725.553-.895s.744-.133 1.047.094c1.024.768 1.933 1.676 2.701 2.701.266.355.266.844 0 1.199z" />
            </svg>
            <span className="hidden min-[321px]:inline">LOGOUT</span>
          </button>
        )}
      </div>

      {/* Admin Edit Profile Modal */}
      <AdminEditProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      {/* Admin Change Password Modal Rendering */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute -top-12 right-0 text-white hover:bg-white/20 rounded-full w-10 h-10 flex items-center justify-center transition-colors font-bold z-10 text-xl"
            >
              ✕
            </button>
            <ChangePasswordModal onClose={() => setShowPasswordModal(false)} isProfileView={true} />
          </div>
        </div>
      )}
    </div>
  );
}
