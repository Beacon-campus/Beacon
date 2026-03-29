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
      <div className="relative flex items-center w-full min-h-[60px]">
        {/* Left Spacer to balance flex layout and center the tabs perfectly */}
        <div className="flex-1"></div>

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

        {/* Right: Logout / Admin Profile */}
        <div className="flex-1 flex justify-end items-center">
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
            className="flex items-center justify-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full text-sm font-bold text-gray-600 hover:text-black transition-all group glass-panel hover:scale-105 shrink-0 z-10"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 group-hover:opacity-100 transition-opacity"
              fill="currentColor"
            >
              <path d="m15.889 16.011c-.817-.099-1.57.488-1.668 1.311-.117.979-.253 1.74-.36 2.263-.483.095-1.137.204-1.86.288v-14.354c.78.119 1.458.28 1.935.413.081.416.181 1 .272 1.751.098.826.865 1.41 1.672 1.306.822-.101 1.407-.85 1.307-1.672-.233-1.893-.51-2.873-.54-2.978-.133-.455-.474-.821-.918-.986.018.009-1.903-.691-3.728-.847v-.444c0-.521-.401-.956-.921-.997-.519-.041-1.049-.065-1.579-.065-3.44 0-6.813 1-6.954 1.042-.329.099-.585.359-.677.69-.035.128-.869 3.201-.869 9.268s.824 9.619.859 9.768c.095.402.427.705.837.762.139.019 2.304.471 6.804.471 2.679 0 6.016-.664 5.976-.7.511-.131.915-.521 1.064-1.025.016-.053.386-1.312.659-3.596.099-.823-.488-1.569-1.311-1.668zm-8.889-4.011c0-.828.672-1.5 1.5-1.5s1.5.672 1.5 1.5-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5zm15.8 1.1c-.768 1.024-1.676 1.933-2.701 2.701-.176.132-.387.2-.6.2-.536.01-1.011-.461-1-1v-1h-3c-.828 0-1.5-.671-1.5-1.5s.672-1.5 1.5-1.5h3v-1c0-.379.214-.725.553-.895s.744-.133 1.047.094c1.024.768 1.933 1.676 2.701 2.701.266.355.266.844 0 1.199z" />
            </svg>
            <span className="hidden sm:inline">LOGOUT</span>
          </button>
          )}
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
