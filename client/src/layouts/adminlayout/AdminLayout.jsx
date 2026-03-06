import { useState, useEffect } from "react";
import { Outlet, Link, Navigate, NavLink } from "react-router-dom";
import Navbar from "../../components/ui/Navbar";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import UpdateEmailModal from "../../components/UpdateEmailModal";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import flameGif from "../../assets/flame.gif";

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user, loading } = useAuth();

  // Helper for Link styling
  const getLinkClass = ({ isActive }) => {
    const base = `flex items-center ${collapsed ? "justify-center w-10 h-10 p-0 mx-auto" : "gap-3 px-3.5 py-2.5 mx-3"} text-sm font-medium transition-all duration-200 group relative rounded-[12px]`;
    
    if (isActive) return `${base} bg-[#F0FDF4] text-[#15803D] font-bold shadow-sm`;
    
    return `${base} bg-transparent text-gray-500 hover:bg-[#F8FAFC]`;
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
          className={`fixed top-4 bottom-4 left-4 z-50 ${collapsed ? "w-20" : "w-56"
            } glass-panel rounded-3xl p-4 flex flex-col justify-between transition-all duration-300`}
        >
            <div className="flex flex-col h-full">

              {/* HEADER: Logo Area */}
              <div 
                className={`flex items-center ${collapsed ? "justify-center p-0 mx-auto mt-6" : "gap-3 p-6"} mb-2 cursor-pointer hover:opacity-80 transition-opacity`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {isHovered ? (
                    <img src={flameGif} alt="Flame" className="w-8 h-8 object-contain" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-8 h-8 text-primary fill-current"
                    >
                      <path d="M12.8324 21.8013C15.9583 21.1747 20 18.926 20 13.1112C20 7.8196 16.1267 4.29593 13.3415 2.67685C12.7235 2.31757 12 2.79006 12 3.50492V5.3334C12 6.77526 11.3938 9.40711 9.70932 10.5018C8.84932 11.0607 7.92052 10.2242 7.816 9.20388L7.73017 8.36604C7.6304 7.39203 6.63841 6.80075 5.85996 7.3946C4.46147 8.46144 3 10.3296 3 13.1112C3 20.2223 8.28889 22.0001 10.9333 22.0001C11.0871 22.0001 11.2488 21.9955 11.4171 21.9858C10.1113 21.8742 8 21.064 8 18.4442C8 16.3949 9.49507 15.0085 10.631 14.3346C10.9365 14.1533 11.2941 14.3887 11.2941 14.7439V15.3331C11.2941 15.784 11.4685 16.4889 11.8836 16.9714C12.3534 17.5174 13.0429 16.9454 13.0985 16.2273C13.1161 16.0008 13.3439 15.8564 13.5401 15.9711C14.1814 16.3459 15 17.1465 15 18.4442C15 20.4922 13.871 21.4343 12.8324 21.8013Z" />
                    </svg>
                  )}
                </div>
                
                <span className={`font-black text-2xl tracking-tight text-primary uppercase whitespace-nowrap transition-opacity duration-200 ${collapsed ? "opacity-0 w-0 overflow-hidden hidden" : "opacity-100"}`}>
                  STREAK
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

                <NavLink to="/admin/transfer-user" className={getLinkClass}>
                  {({ isActive }) => (
                    <>
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                          <path d="m20.707 5.293-3-3a1 1 0 0 0-1.414 1.414L17.586 5H4a1 1 0 1 0 0 2h13.586l-1.293 1.293a1 1 0 1 0 1.414 1.414l3-3a1 1 0 0 0 0-1.414ZM3.293 18.707l3 3a1 1 0 0 0 1.414-1.414L6.414 19H20a1 1 0 1 0 0-2H6.414l1.293-1.293a1 1 0 1 0-1.414-1.414l-3 3a1 1 0 0 0 0 1.414Z" />
                        </svg>
                      </div>
                      <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Transfer User</span>
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
          <div className={`relative z-10 flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 ${collapsed ? "ml-28" : "ml-64"}`}>
            <div className="px-6 pt-4 pb-0">
              <Navbar />
            </div>

            <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-y-auto w-full no-scrollbar">
                <Outlet />
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
