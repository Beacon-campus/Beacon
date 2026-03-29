import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import ChangePasswordModal from "../ChangePasswordModal";
import AdminEditProfileModal from "../admin/AdminEditProfileModal";
import { notifyServerLogout } from "../../services/session.service";

// Import your SVGs

import { useState } from "react";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

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

  const getTabClass = (isActive) => {
    const base = "relative z-10 flex items-center justify-center gap-1.5 sm:gap-2 w-24 sm:w-36 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-bold text-center transition-all duration-200 focus:outline-none";
    return isActive ? `${base} text-slate-800 drop-shadow-sm` : `${base} text-slate-500 hover:text-slate-800`;
  };

  // Helper for Icon styling


  const avatarId = user?.profile?.avatar || 11;
  const avatarUrl = new URL(`../../assets/profile/${avatarId}.png`, import.meta.url).href;

  return (
    <div className="">
      <div className="relative flex items-center justify-between w-full min-h-[60px]">
        
        {/* Left: Branding */}
        <div className="flex-1 flex justify-start items-center pl-1 sm:pl-0">
          <Link to={`${basePath}/home`} className="flex items-center gap-2 group hover:scale-[1.02] active:scale-95 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-8 h-8 sm:w-10 sm:h-10 overflow-visible">
              <defs>
                <linearGradient id="beam-left-nav" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="beam-right-nav" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                  <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <g className="opacity-0 scale-75 origin-bottom transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100">
                <path d="M 45 32 L -15 10 L -15 45 Z" fill="url(#beam-left-nav)" />
                <path d="M 45 32 L -5 -5 L 10 -5 Z" fill="url(#beam-left-nav)" />
                <path d="M 55 32 L 115 10 L 115 45 Z" fill="url(#beam-right-nav)" />
                <path d="M 55 32 L 105 -5 L 90 -5 Z" fill="url(#beam-right-nav)" />
                <path d="M 22 20 L 23 23 L 26 24 L 23 25 L 22 28 L 21 25 L 18 24 L 21 23 Z" className="fill-yellow-400" />
                <circle cx="15" cy="35" r="1.5" className="fill-yellow-400" />
              </g>
              <g className="fill-slate-800 stroke-slate-800 transition-colors duration-300 group-hover:fill-slate-700">
                <path d="M 5 70 C 20 78 35 82 50 73 C 65 82 80 78 95 70 C 80 81 65 86 50 78 C 35 86 20 81 5 70 Z" fill="currentColor" stroke="none" />
                <path d="M 35 75 L 40 35 C 40 30 60 30 60 35 L 65 75 Z" fill="none" strokeWidth="4" strokeLinejoin="round" />
                <path d="M 36 70 L 64 70 M 38 55 L 62 55 M 39 40 L 61 40" strokeWidth="3" />
                <path d="M 42 35 L 42 25 C 42 20 58 20 58 25 L 58 35 Z" fill="white" strokeWidth="3" strokeLinejoin="round" />
                <path d="M 45 20 C 45 15 55 15 55 20 Z" fill="#ef4444" stroke="none" />
                <path d="M 40 25 L 60 25" strokeWidth="3" />
                <rect x="47" y="22" width="6" height="10" fill="#fbbf24" stroke="none" className="animate-pulse" />
              </g>
            </svg>
          </Link>
        </div>

        {/* ============================================================
            Center: Tabs Container
           ============================================================ */}
        {/* Center: Tabs Container (Visible on mobile, just smaller) */}
        {role !== "admin" && (
          <div className="shrink-0 flex relative items-center bg-gray-100/90 border border-gray-200/60 rounded-full p-1 shadow-inner z-10">

            {/* THE SLIDING PILL BACKGROUND */}
            <div
              className={`absolute left-1 top-1 bottom-1 w-24 sm:w-36 rounded-full bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] border border-gray-100 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isCommunity ? "translate-x-[6.5rem] sm:translate-x-[9.5rem]" : "translate-x-0"
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

        {/* Right: Notifications / Profile */}
        <div className="flex-1 flex justify-end items-center gap-1 sm:gap-4 relative pr-1 sm:pr-0">
          
          {/* Notification Bell */}
          <Link to={`${basePath}/notif`} className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100 focus:outline-none">
            <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
          </Link>

          {/* Profile Dropdown Toggle for ALL Roles */}
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setShowAdminProfile(!showAdminProfile)}
              className="flex items-center justify-center rounded-full border-2 border-transparent hover:border-primary transition-colors focus:outline-none group active:scale-95"
            >
              <img src={avatarUrl} alt="Profile" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-sm group-hover:shadow-md transition-shadow" />
            </button>

            {showAdminProfile && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowAdminProfile(false)}
                />
                <div className="absolute top-14 right-0 mt-2 w-56 sm:w-64 bg-white rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] border border-gray-100 p-3 sm:p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={avatarUrl} alt="Profile" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-gray-200 shadow-sm" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-bold text-gray-800 text-sm sm:text-base truncate">{user?.profile?.displayName || "User"}</span>
                      <span className="text-xs text-gray-500 truncate">{user?.email}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 my-2"></div>

                  <button
                    onClick={() => { 
                      setShowAdminProfile(false); 
                      if (role === "admin") {
                        setShowProfileModal(true); 
                      } else {
                        navigate(`${basePath}/profile`);
                      }
                    }}
                    className="w-full text-left px-3 py-2 sm:py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 mb-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-gray-400">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                    </svg>
                    Edit Profile
                  </button>

                  <button
                    onClick={() => { setShowAdminProfile(false); setShowPasswordModal(true); }}
                    className="w-full text-left px-3 py-2 sm:py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3 mb-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 text-gray-400" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                    </svg>
                    Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 sm:py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-3 mt-1"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2 text-red-400" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
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
