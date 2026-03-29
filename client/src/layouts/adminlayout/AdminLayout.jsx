import { useState, useEffect } from "react";
import { Outlet, Link, Navigate, NavLink } from "react-router-dom";
import Navbar from "../../components/ui/Navbar";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import UpdateEmailModal from "../../components/UpdateEmailModal";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import MobileBottomNav from "../../components/ui/MobileBottomNav";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user, loading } = useAuth();

  // Helper for Link styling
  const getLinkClass = ({ isActive }) => {
    const base = `flex items-center ${collapsed ? "justify-center w-10 h-10 p-0 mx-auto" : "gap-3 px-3.5 py-2.5 mx-3"} text-sm font-medium transition-all duration-200 group relative rounded-[12px] border-l-4`;
    
    if (isActive) return `${base} bg-green-50 text-green-700 border-l-green-500 font-bold shadow-sm`;
    
    return `${base} bg-transparent text-gray-500 border-l-transparent hover:bg-gray-50/50 hover:text-gray-800`;
  };

  const getIconClass = (isActive) => {
    const base = "w-3.5 h-3.5 transition-all duration-200 fill-current";
    return isActive ? `${base} opacity-100` : `${base} group-hover:opacity-100`;
  };

  /* ================= LOADING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  /* ================= AUTH PROTECTION ================= */
  if (!user) {
    return <Navigate to="/" replace />;
  }

  /* ================= ONBOARDING STATE ================= */
  const needsPassword = user.ispasswordreset === false;
  const needsEmail = user.isemailverified === false;
  const isBlocking = needsPassword || needsEmail;

  // Resolve Avatar URL
  const avatarId = user?.profile?.avatar || 11;
  const avatarUrl = new URL(`../../assets/profile/${avatarId}.png`, import.meta.url).href;

  return (
    <>
      {/* ================= BLOCKING MODALS ================= */}
      {needsPassword ? (
        <ChangePasswordModal />
      ) : needsEmail ? (
        <UpdateEmailModal />
      ) : null}

      {/* ================= MAIN UI ================= */}
      <div
        className={`relative flex h-screen bg-[#F4F7FB] overflow-hidden transition-all duration-300 ${isBlocking ? "blur-sm pointer-events-none select-none" : ""
          }`}
      >
        {/* Ambient Aurora Animated Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob"></div>
        <div className="absolute top-[20%] right-[-5%] w-[35%] h-[40%] bg-green-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob animation-delay-4000"></div>

        {/* Sidebar */}
        <div
          className={`
            hidden md:flex flex-col justify-between p-4
            fixed top-4 bottom-4 left-4 z-[60] h-auto rounded-3xl glass-panel shadow-sm
            transition-all duration-300
            ${collapsed ? 'w-20' : 'w-56'}
          `}
        >
            <div className="flex flex-col h-full">

              {/* HEADER: Logo Area */}
              <div 
                className={`flex items-center group cursor-pointer ${collapsed ? "justify-center p-0 mx-auto mt-6" : "gap-2 px-4 py-3 -ml-4 hover:bg-slate-900 rounded-xl"} mb-2 transition-all duration-300 ease-in-out hover:scale-[1.02] active:scale-95`}
              >
                <div className="flex items-center justify-center shrink-0 -mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className="w-10 h-10 overflow-visible">
                    <defs>
                      <linearGradient id="beam-left" x1="1" y1="0" x2="0" y2="0">
                        <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="beam-right" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.7"/>
                        <stop offset="100%" stopColor="#FBBF24" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <g className="opacity-0 scale-75 origin-bottom transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100">
                      <path d="M 45 32 L -15 10 L -15 45 Z" fill="url(#beam-left)" className="text-yellow-400" />
                      <path d="M 45 32 L -5 -5 L 10 -5 Z" fill="url(#beam-left)" className="text-yellow-400" />
                      <path d="M 55 32 L 115 10 L 115 45 Z" fill="url(#beam-right)" className="text-yellow-400" />
                      <path d="M 55 32 L 105 -5 L 90 -5 Z" fill="url(#beam-right)" className="text-yellow-400" />
                      <path d="M 22 20 L 23 23 L 26 24 L 23 25 L 22 28 L 21 25 L 18 24 L 21 23 ZM 78 20 L 79 23 L 82 24 L 79 25 L 78 28 L 77 25 L 74 24 L 77 23 Z" className="fill-yellow-400" />
                      <circle cx="15" cy="35" r="1.5" className="fill-yellow-400" />
                      <circle cx="85" cy="35" r="1.5" className="fill-yellow-400" />
                      <circle cx="35" cy="10" r="1.5" className="fill-yellow-400" />
                      <circle cx="65" cy="10" r="1.5" className="fill-yellow-400" />
                    </g>
                    <g className="fill-slate-800 stroke-slate-800 transition-colors duration-300 group-hover:fill-white group-hover:stroke-white">
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
                
                <span className={`text-2xl font-extrabold tracking-tight text-slate-800 transition-all duration-300 group-hover:text-white whitespace-nowrap ${collapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100"}`}>
                  Beacon
                </span>
              </div>

              {/* Separator Line */}
              <div className="border-b border-gray-200 mb-4"></div>

              {/* Dynamic Menu Content */}
              <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                <NavLink to="/admin/dashboard" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="m9,9H2c-1.103,0-2-.897-2-2v-2C0,2.243,2.243,0,5,0h4c1.103,0,2,.897,2,2v5c0,1.103-.897,2-2,2Zm10,15h-4c-1.103,0-2-.897-2-2v-5c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v2c0,2.757-2.243,5-5,5Zm3-11h-7c-1.103,0-2-.897-2-2V2c0-1.103.897-2,2-2h4c2.757,0,5,2.243,5,5v6c0,1.103-.897,2-2,2Zm-13,11h-4c-2.757,0-5-2.243-5-5v-6c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v9c0,1.103-.897,2-2,2Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Dashboard</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/user-management" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="M12 2A5 5 0 1 0 17 7 5 5 0 0 0 12 2Zm0 8A3 3 0 1 1 15 7 3 3 0 0 1 12 10ZM21 21v1H3v-1A7 7 0 0 1 10 14h4a7 7 0 0 1 7 7Zm-2 0a5 5 0 0 0-5-5H10a5 5 0 0 0-5 5Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Users</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/bulk-upload" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="M16 8V5a3 3 0 0 0-6 0v3H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-4 7.5a1.5 1.5 0 1 1 1.5-1.5 1.5 1.5 0 0 1-1.5 1.5Zm2-7.5h-4V5a2 2 0 0 1 4 0Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Bulk Upload</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/classroom-management" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Classroom Mgmt</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/announcements" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4v3a1 1 0 0 0 1.6.8L13.5 18H20a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm0 14h-6.8a1 1 0 0 0-.6.2L10 18.25V17a1 1 0 0 0-1-1H4V4h16v12Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Announcements</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/calendar" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="M24,7v1H0v-1C0,4.239,2.239,2,5,2h1V1c0-.552,.448-1,1-1h0c.552,0,1,.448,1,1v1h8V1c0-.552,.448-1,1-1h0c.552,0,1,.448,1,1v1h1c2.761,0,5,2.239,5,5Zm0,10c0,3.86-3.141,7-7,7s-7-3.14-7-7,3.141-7,7-7,7,3.14,7,7Zm-5,.586l-1-1v-1.586c0-.552-.448-1-1-1h0c-.552,0-1,.448-1,1v2c0,.265,.105,.52,.293,.707l1.293,1.293c.39,.39,1.024,.39,1.414,0h0c.39-.39,.39-1.024,0-1.414Zm-11-.586c0-2.829,1.308-5.35,3.349-7H0v9c0,2.761,2.239,5,5,5h6.349c-2.041-1.65-3.349-4.171-3.349-7Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Calendar</span>
                    </>
                  )}
                </NavLink>

                <NavLink to="/admin/server-logs" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="M20 3H4a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v12Zm-3-8h-6a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2Zm0 4h-4a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2ZM7 9H6A1 1 0 0 0 6 11H7a1 1 0 0 0 0-2Zm0 4H6a1 1 0 0 0 0 2H7a1 1 0 0 0 0-2Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Server Logs</span>
                    </>
                  )}
                </NavLink>

              </nav>

              {/* Footer / Collapse Button */}
              <div className="flex flex-col gap-2 mt-auto min-h-[50px] justify-end">
                <div className="border-t border-gray-200"></div>

                {/* Collapse Button */}
                <button
                  onClick={() => setCollapsed(!collapsed)}
                  className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors self-center mt-2 relative z-10"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`w-8 h-8 fill-current text-gray-500 transition-transform duration-500 ${collapsed ? "rotate-0" : "rotate-180"
                      }`}
                  >
                    <path d="M13.1,19.5a1.5,1.5,0,0,1-1.061-2.561l4.586-4.585a.5.5,0,0,0,0-.708L12.043,7.061a1.5,1.5,0,0,1,2.121-2.122L18.75,9.525a3.505,3.505,0,0,1,0,4.95l-4.586,4.586A1.5,1.5,0,0,1,13.1,19.5Z" /><path d="M6.1,19.5a1.5,1.5,0,0,1-1.061-2.561L9.982,12,5.043,7.061A1.5,1.5,0,0,1,7.164,4.939l6,6a1.5,1.5,0,0,1,0,2.122l-6,6A1.5,1.5,0,0,1,6.1,19.5Z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className={`relative z-10 flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 ml-0 md:ml-32 ${collapsed ? 'xl:ml-28' : 'xl:ml-64'}`}>
            <div className="px-4 sm:px-6 pt-4 pb-0 relative flex items-center w-full">
              <div className="w-full">
                <Navbar />
              </div>
            </div>
            <div className="flex-1 px-4 sm:px-6 pb-6 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto w-full no-scrollbar pb-16 sm:pb-0">
                <Outlet />
              </div>
            </div>
          </div>

        </div>
      <MobileBottomNav />
    </>
  );
}
