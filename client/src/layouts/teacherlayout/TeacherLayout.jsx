import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, Navigate, NavLink } from "react-router-dom";
import Navbar from "../../components/ui/Navbar";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import UpdateEmailModal from "../../components/UpdateEmailModal";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// SVG Imports removed (using inline)

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("home"); // "home" | "community"

  const isCommunity = location.pathname.startsWith("/teacher/community");
  const homeMobileContentPadding = isCommunity ? "max-[768px]:px-3 max-[425px]:px-2" : "max-[768px]:px-0";

  const getLinkClass = ({ isActive }) => {
    const base = `flex items-center ${collapsed ? "justify-center w-10 h-10 p-0 mx-auto" : "gap-2.5 px-3.5 py-2"} text-sm font-medium transition-all duration-200 group relative border-l-4 rounded-lg`;

    if (isActive) {
      return `${base} bg-green-50 text-green-700 border-l-green-500 font-bold`;
    }

    return `${base} bg-transparent text-gray-500 border-l-transparent hover:bg-gray-50/50 hover:text-gray-800`;
  };

  const getIconClass = (isActive) => {
    // Icons are now inline SVGs. Removed invert/brightness filters in favor of currentColor.
    const base = "w-3.5 h-3.5 transition-all duration-200 fill-current";
    return isActive ? `${base} opacity-100` : `${base} group-hover:opacity-100`;
  };

  /* ================= OFFLINE DETECTION ================= */
  useEffect(() => {
    const handleOffline = () => {
      toast("Cloud sync disabled(no changes are being saved)\nPlease connect to the internet", {
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-red-500 fill-current">
            <path d="m10.47,12.377l-5.226,8.96c-.689,1.181.163,2.663,1.53,2.663h10.453c1.367,0,2.218-1.483,1.53-2.663l-5.226-8.96c-.683-1.171-2.376-1.171-3.059,0Zm1.53,10.623h0c-.552,0-1-.448-1-1h0c0-.552.448-1,1-1h0c.552,0,1,.448,1,1h0c0,.552-.448,1-1,1Zm-1-4v-3c0-.552.448-1,1-1h0c.552,0,1,.448,1,1v3c0,.552-.448,1-1,1h0c-.552,0-1-.448-1-1Zm13-6.504c0,2.39-1.128,4.518-2.875,5.892-.448.34-.885.595-1.304.806l-4.564-7.825c-.684-1.171-1.901-1.871-3.257-1.871s-2.574.699-3.257,1.871l-4.885,8.375c-2.233-.7-3.858-2.789-3.858-5.249,0-1.546.656-3.029,1.801-4.07.273-.248.405-.593.346-.901-.184-.946-.195-1.919-.033-2.89C2.66,3.345,5.225.733,8.497.133c3.592-.661,7.183,1.167,8.735,4.438.14.296.41.503.742.569,3.492.696,6.026,3.789,6.026,7.354Z" />
          </svg>
        ),
        duration: Infinity,
        id: 'offline-toast',
      });
    };

    const handleOnline = () => {
      toast.dismiss('offline-toast');
      toast("You are back online", {
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-green-500 fill-current">
            <path d="m16 23a1 1 0 1 1 1 1 1 1 0 0 1 -1-1zm4.535-2.122a1 1 0 0 0 0-1.414 5 5 0 0 0 -7.07 0 1 1 0 0 0 1.414 1.414 3.074 3.074 0 0 1 4.242 0 1 1 0 0 0 1.414 0zm2.829-2.828a1 1 0 0 0 0-1.414 9.01 9.01 0 0 0 -12.728 0 1 1 0 0 0 1.414 1.414 7.011 7.011 0 0 1 9.9 0 1 1 0 0 0 1.414 0zm-14.142 1.414a3 3 0 0 1 0-4.243 11.014 11.014 0 0 1 14.757-.721 7.945 7.945 0 0 0 -5.622-7.14 1.087 1.087 0 0 1 -.722-.733 8 8 0 0 0 -15.49.842 7.648 7.648 0 0 0 .8 5.179 5.448 5.448 0 0 0 -2.888 5.652 5.844 5.844 0 0 0 5.626 4.7h7.1c-1.667-1.653-3.296-3.271-3.561-3.536z" />
          </svg>
        ),
        duration: 3000,
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

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
  const avatarId = user?.profile?.avatar || (user?.role === 'teacher' ? 1 : 11);
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
          className={`hidden min-[769px]:flex fixed top-4 bottom-4 left-4 z-50 ${collapsed ? "w-20" : "w-56"
            } glass-panel rounded-3xl p-4 flex-col justify-between transition-all duration-300`}
        >
          <div className="flex flex-col h-full">

              {/* HEADER: Logo Area */}
              <div 
                className={`flex items-center group cursor-pointer ${collapsed ? "justify-center p-0 mx-auto mt-6" : "gap-3 px-4 py-3"} mb-2 transition-transform duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.02] active:scale-95`}
              >
                <div className="flex items-center justify-center min-w-[40px] w-[40px] flex-shrink-0 -mr-1">
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
                    <g className="fill-slate-800 stroke-slate-800 transition-colors duration-300">
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
                
                <span className={`text-2xl font-extrabold tracking-tight text-slate-800 overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out origin-left ${collapsed ? "w-0 opacity-0 -translate-x-2" : "w-24 opacity-100 translate-x-0"}`}>
                  Beacon
                </span>
              </div>

              {/* Separator Line (Rev 8: Matches Profile/Bottom Style) */}
              <div className="border-b border-gray-200 mb-4"></div>

              {/* Dynamic Menu Content */}
              <nav className="space-y-2 flex-1 overflow-y-auto no-scrollbar">
                {isCommunity ? (
                  // Community Links
                  <>
                    <NavLink to="/teacher/community" end className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="M19.675,2.758A11.936,11.936,0,0,0,10.474.1,12,12,0,0,0,12.018,24H19a5.006,5.006,0,0,0,5-5V11.309l0-.063A12.044,12.044,0,0,0,19.675,2.758ZM8,7h4a1,1,0,0,1,0,2H8A1,1,0,0,1,8,7Zm8,10H8a1,1,0,0,1,0-2h8a1,1,0,0,1,0,2Zm0-4H8a1,1,0,0,1,0-2h8a1,1,0,0,1,0,2Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Messages</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/community/classrooms" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="m23,24h-5c-.4,0-.761-.238-.919-.605s-.082-.794.194-1.084c.792-.833,1.967-1.311,3.225-1.311s2.433.478,3.225,1.311c.276.29.352.717.194,1.084s-.519.605-.919.605Zm-7.581-.605c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-8.5,0c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-3.419-3.395c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2ZM4.5,5c1.381,0,2.5-1.119,2.5-2.5S5.881,0,4.5,0s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5ZM20.5,0h-12.26c.479.715.76,1.575.76,2.5,0,.529-.108,1.029-.276,1.5h5.157c1.451,0,2.784.978,3.06,2.402.372,1.915-1.092,3.598-2.942,3.598h-4v3c0,.552.448,1,1,1h5v-1c0-.552.448-1,1-1h2c.552,0,1,.448,1,1v1h.5c1.933,0,3.5-1.567,3.5-3.5V3.5c0-1.933-1.567-3.5-3.5-3.5Zm-12.5,13v-5h6c.553,0,1-.448,1-1s-.447-1-1-1H4C1.791,6,0,7.791,0,10v3c0,.552.448,1,1,1h6c.552,0,1-.448,1-1Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Classroom</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/community/groups" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="m7.5 13a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm6.5 11h-13a1 1 0 0 1 -1-1v-.5a7.5 7.5 0 0 1 15 0v.5a1 1 0 0 1 -1 1zm3.5-15a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm-1.421 2.021a6.825 6.825 0 0 0 -4.67 2.831 9.537 9.537 0 0 1 4.914 5.148h6.677a1 1 0 0 0 1-1v-.038a7.008 7.008 0 0 0 -7.921-6.941z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Groups</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/community/publish-assignment" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="M16.4,13.17c-.74-.74-1.73-1.15-2.77-1.15h-1.63v1.63c0,1.04,.41,2.04,1.15,2.77l6.84,6.84c.85,.85,2.24,1.01,3.17,.25,1.07-.88,1.13-2.46,.18-3.41l-6.93-6.93ZM.1,6C.57,3.72,2.59,2,5,2h14c2.41,0,4.43,1.72,4.9,4H.1Zm23.9,2v9c0,.3-.03,.59-.08,.87l-6.11-6.11c-1.11-1.11-2.62-1.73-4.19-1.73h-2.62c-.55,0-1,.45-1,1v2.63c0,1.57,.62,3.08,1.73,4.19l4.16,4.16H5c-2.76,0-5-2.24-5-5V8H24Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Assignments</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/community/upload-materials" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="M0,19H5v5H3c-1.657,0-3-1.343-3-3v-2ZM5,5V0H3C1.343,0,0,1.343,0,3v2H5Zm7,0V3c0-1.657-1.343-3-3-3h-2V5h5ZM0,7v10H5V7H0Zm7,0v10h5V7H7Zm0,17h2c1.657,0,3-1.343,3-3v-2H7v5ZM13.424,7.478l3.639,10.944,5.412-1.795-3.639-10.944-5.412,1.795Zm4.27,12.841l.792,2.312c.348,1.048,1.48,1.615,2.528,1.267l1.615-.535c1.049-.348,1.617-1.481,1.268-2.529l-.791-2.309-5.412,1.795ZM12.793,5.58l5.412-1.795-.803-2.415c-.348-1.048-1.48-1.616-2.528-1.268l-1.615,.535c-1.048,.348-1.616,1.48-1.268,2.528l.803,2.415Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Upload Materials</span>
                        </>
                      )}
                    </NavLink>
                  </>
                ) : (
                  // Home Links
                  <>
                    <NavLink to="/teacher/home" className={getLinkClass}>
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
                    <NavLink to="/teacher/todo" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="m13.27 7.48c-.813.813-1.27 1.915-1.27 3.065v.955c0 .276.224.5.5.5h.955c1.149 0 2.252-.457 3.064-1.269l6.715-6.715c.85-.85 1.013-2.236.252-3.167-.875-1.07-2.456-1.129-3.409-.176zm4.664 4.664c-1.195 1.196-2.786 1.855-4.479 1.855h-1.455c-1.104 0-2-.896-2-2v-1.455c0-1.692.659-3.282 1.855-4.479l5.468-5.466c-.697-.37-1.48-.599-2.323-.599h-10c-2.757 0-5 2.243-5 5v14c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5v-8.921l-2.066 2.066zm-9.767 4.522-1.687 1.687c-.431.431-.995.648-1.561.648-.533 0-1.066-.193-1.491-.582l-.669-.579c-.417-.362-.462-.993-.101-1.411.363-.417.994-.462 1.411-.101l.689.598c.103.093.228.092.307.013l1.687-1.687c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414zm0-5-1.687 1.687c-.431.431-.995.648-1.561.648-.533 0-1.066-.193-1.491-.582l-.669-.579c-.417-.362-.462-.994-.101-1.411.363-.418.994-.461 1.411-.101l.689.598c.103.094.228.092.307.013l1.687-1.687c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414zm7.833 11.293h-4c-.553 0-1-.447-1-1s.447-1 1-1h4c.553 0 1 .447 1 1s-.447 1-1 1z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>To-dos</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/notes" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 512 512" className={getIconClass(isActive)}>
                              <g>
                                <path d="M320,170.667h139.52c-7.448-19.736-19.019-37.656-33.941-52.565l-74.325-74.368c-14.927-14.905-32.852-26.468-52.587-33.92   v139.52C298.667,161.115,308.218,170.667,320,170.667z" />
                                <path d="M468.821,213.333H320c-35.346,0-64-28.654-64-64V0.512C252.565,0.277,249.131,0,245.653,0h-96.32   C90.452,0.071,42.737,47.786,42.667,106.667v298.667C42.737,464.214,90.452,511.93,149.333,512h213.333   c58.881-0.07,106.596-47.786,106.667-106.667V223.68C469.333,220.203,469.056,216.768,468.821,213.333z" />
                              </g>
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Notes</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/sketch" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="M23.305,16.25a1.888,1.888,0,0,1-1.377,1.177,1.912,1.912,0,0,1-1.769-.521l-.1-.1a3.567,3.567,0,0,0-6.089,2.553l.04,4.516-.924.077c-.331.028-.663.05-1,.05A12,12,0,0,1,3.745,3.371,11.885,11.885,0,0,1,12.5.007,12.155,12.155,0,0,1,24.08,11.7,11.924,11.924,0,0,1,23.305,16.25Zm-6.19-8.2A1.5,1.5,0,1,0,18.95,9.115,1.5,1.5,0,0,0,17.115,8.05Zm-5-3A1.5,1.5,0,1,0,13.95,6.115,1.5,1.5,0,0,0,12.115,5.05Zm-5,3A1.5,1.5,0,1,0,8.95,9.115,1.5,1.5,0,0,0,7.115,8.05Zm0,6A1.5,1.5,0,1,0,8.95,15.115,1.5,1.5,0,0,0,7.115,14.05Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Sketch</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/calender" className={getLinkClass}>
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
                    <NavLink to="/teacher/researchbot" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Research Bot</span>
                        </>
                      )}
                    </NavLink>
                    <NavLink to="/teacher/notif" className={getLinkClass}>
                      {({ isActive }) => (
                        <>
                          <div className="w-6 h-6 flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 24 24" className={getIconClass(isActive)}>
                              <path d="M4.068,18H19.724a3,3,0,0,0,2.821-4.021L19.693,6.094A8.323,8.323,0,0,0,11.675,0h0A8.321,8.321,0,0,0,3.552,6.516l-2.35,7.6A3,3,0,0,0,4.068,18Z" /><path d="M7.1,20a5,5,0,0,0,9.8,0Z" />
                            </svg>
                          </div>
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Notifications</span>
                        </>
                      )}
                    </NavLink>
                  </>
                )}
              </nav>

              {/* Footer / Profile & Collapse Button */}
              <div className="flex flex-col gap-2 mt-auto">
                <div className="pt-4 border-t border-gray-200">
                  <Link
                    to="/teacher/profile"
                    className={`flex items-center gap-3 p-2 rounded-xl transition-all group ${collapsed ? "justify-center" : ""} hover:bg-gray-100`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={avatarUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 shadow-sm"
                      />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-primary rounded-full"></div>
                    </div>

                    {/* Text Info */}
                    <div className={`flex flex-col overflow-hidden transition-all duration-200 ${collapsed ? "w-0 opacity-0 hidden" : "w-full opacity-100"
                      }`}>
                      <span className="font-bold text-sm text-gray-800 truncate">
                        {user?.profile?.displayName || "Teacher"}
                      </span>
                      <span className="text-xs text-gray-400 font-medium group-hover:text-primary transition-colors">
                        Edit Profile
                      </span>
                    </div>

                    {/* Settings Icon */}
                    <div className={`shrink-0 transition-opacity duration-200 ${collapsed ? "w-0 opacity-0 hidden" : "opacity-100"
                      }`}>
                      <svg
                        viewBox="0 0 512 512"
                        className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:rotate-45 transition-all fill-current text-gray-400 group-hover:text-primary"
                      >
                        <path d="M34.283,384c17.646,30.626,56.779,41.148,87.405,23.502c0.021-0.012,0.041-0.024,0.062-0.036l9.493-5.483   c17.92,15.332,38.518,27.222,60.757,35.072V448c0,35.346,28.654,64,64,64s64-28.654,64-64v-10.944   c22.242-7.863,42.841-19.767,60.757-35.115l9.536,5.504c30.633,17.673,69.794,7.167,87.467-23.467   c17.673-30.633,7.167-69.794-23.467-87.467l0,0l-9.472-5.461c4.264-23.201,4.264-46.985,0-70.187l9.472-5.461   c30.633-17.673,41.14-56.833,23.467-87.467c-17.673-30.633-56.833-41.14-87.467-23.467l-9.493,5.483   C362.862,94.638,342.25,82.77,320,74.944V64c0-35.346-28.654-64-64-64s-64,28.654-64,64v10.944   c-22.242,7.863-42.841,19.767-60.757,35.115l-9.536-5.525C91.073,86.86,51.913,97.367,34.24,128s-7.167,69.794,23.467,87.467l0,0   l9.472,5.461c-4.264,23.201-4.264,46.985,0,70.187l-9.472,5.461C27.158,314.296,16.686,353.38,34.283,384z M256,170.667   c47.128,0,85.333,38.205,85.333,85.333S303.128,341.333,256,341.333S170.667,303.128,170.667,256S208.872,170.667,256,170.667z" />
                      </svg>
                    </div>
                  </Link>
                </div>

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
          <div className={`relative flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 ${collapsed ? "min-[769px]:ml-28 ml-0" : "min-[769px]:ml-64 ml-0"} pb-20 min-[769px]:pb-0 pt-[64px] min-[769px]:pt-0`}>
            <div className={`px-6 pt-4 pb-0 max-[768px]:px-0 max-[768px]:pt-0 ${isCommunity ? "max-[768px]:px-3 max-[425px]:px-2 max-[768px]:pt-4" : ""}`}>
              <Navbar />
            </div>

            <div className={`flex-1 px-6 max-[768px]:px-0 ${isCommunity ? "max-[768px]:px-3 max-[425px]:px-2" : ""} pb-6 max-[768px]:pb-0 overflow-hidden flex flex-col`}>
              <div className="shrink-0 mb-3 pb-0 hidden min-[769px]:block">
                <Breadcrumb />
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto w-full no-scrollbar flex flex-col">
                <Outlet />
              </div>
            </div>
          </div>

        {/* ================= MOBILE BOTTOM NAVIGATION ================= */}
        {mobileMenuOpen && (
          <div className="max-[768px]:block hidden fixed inset-0 z-[60] bg-black/10 transition-opacity" onClick={() => setMobileMenuOpen(false)}></div>
        )}

        <div className="max-[768px]:flex hidden fixed bottom-0 left-0 right-0 z-[70] bg-white border-t border-gray-200 px-3 sm:px-6 py-2.5 flex justify-around items-end shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          {/* Mobile Menu Overlay absolutely positioned above */}
          {mobileMenuOpen && (
            <div className="absolute bottom-[100%] left-0 right-0 min-h-[30vh] max-h-[60vh] overflow-hidden flex flex-col">
              <div className="animate-slide-up flex-1 glass-panel bg-white/70 backdrop-blur-3xl rounded-t-[32px] p-4 flex flex-col gap-1 border-x border-t border-white/60 shadow-[0_-20px_40px_-20px_rgba(0,0,0,0.15)] mb-0">
              <div className="w-10 h-1 bg-gray-300/80 rounded-full mx-auto mb-3" />
              <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-lg font-extrabold text-gray-800 tracking-tight">{mobileTab === 'home' ? 'Home Menu' : 'Community Menu'}</h2>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 bg-white/60 rounded-full text-gray-500 hover:bg-white/90 transition-colors">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24 2.4 21.6 0 12 9.6 2.4 0 0 2.4 9.6 12 0 21.6 2.4 24 12 14.4 21.6 24 24 21.6 14.4 12 24 2.4z" /></svg>
                </button>
              </div>
              <nav className="space-y-0.5 flex-1 overflow-y-auto no-scrollbar px-1" onClick={(e) => { if (e.target.closest('a')) setMobileMenuOpen(false); }}>
                {mobileTab === 'community' ? (
                  <>
                    <NavLink to="/teacher/community" end className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M19.675,2.758A11.936,11.936,0,0,0,10.474.1,12,12,0,0,0,12.018,24H19a5.006,5.006,0,0,0,5-5V11.309l0-.063A12.044,12.044,0,0,0,19.675,2.758ZM8,7h4a1,1,0,0,1,0,2H8A1,1,0,0,1,8,7Zm8,10H8a1,1,0,0,1,0-2h8a1,1,0,0,1,0,2Zm0-4H8a1,1,0,0,1,0-2h8a1,1,0,0,1,0,2Z" /></svg></div><span className="font-bold text-sm">Messages</span></NavLink>
                    <NavLink to="/teacher/community/classrooms" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="m23,24h-5c-.4,0-.761-.238-.919-.605s-.082-.794.194-1.084c.792-.833,1.967-1.311,3.225-1.311s2.433.478,3.225,1.311c.276.29.352.717.194,1.084s-.519.605-.919.605Zm-7.581-.605c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-8.5,0c.158-.367.082-.794-.194-1.084-.792-.833-1.967-1.311-3.225-1.311s-2.433.478-3.225,1.311c-.276.29-.352.717-.194,1.084s.519.605.919.605h5c.4,0,.761-.238.919-.605Zm-3.419-3.395c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2Zm8.5,0c1.105,0,2-.895,2-2s-.895-2-2-2-2,.895-2,2,.895,2,2,2ZM4.5,5c1.381,0,2.5-1.119,2.5-2.5S5.881,0,4.5,0s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5ZM20.5,0h-12.26c.479.715.76,1.575.76,2.5,0,.529-.108,1.029-.276,1.5h5.157c1.451,0,2.784.978,3.06,2.402.372,1.915-1.092,3.598-2.942,3.598h-4v3c0,.552.448,1,1,1h5v-1c0-.552.448-1,1-1h2c.552,0,1,.448,1,1v1h.5c1.933,0,3.5-1.567,3.5-3.5V3.5c0-1.933-1.567-3.5-3.5-3.5Zm-12.5,13v-5h6c.553,0,1-.448,1-1s-.447-1-1-1H4C1.791,6,0,7.791,0,10v3c0,.552.448,1,1,1h6c.552,0,1-.448,1-1Z" /></svg></div><span className="font-bold text-sm">Classroom</span></NavLink>
                    <NavLink to="/teacher/community/groups" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="m7.5 13a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm6.5 11h-13a1 1 0 0 1 -1-1v-.5a7.5 7.5 0 0 1 15 0v.5a1 1 0 0 1 -1 1zm3.5-15a4.5 4.5 0 1 1 4.5-4.5 4.505 4.505 0 0 1 -4.5 4.5zm-1.421 2.021a6.825 6.825 0 0 0 -4.67 2.831 9.537 9.537 0 0 1 4.914 5.148h6.677a1 1 0 0 0 1-1v-.038a7.008 7.008 0 0 0 -7.921-6.941z" /></svg></div><span className="font-bold text-sm">Groups</span></NavLink>
                    <NavLink to="/teacher/community/publish-assignment" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M16.4,13.17c-.74-.74-1.73-1.15-2.77-1.15h-1.63v1.63c0,1.04,.41,2.04,1.15,2.77l6.84,6.84c.85,.85,2.24,1.01,3.17,.25,1.07-.88,1.13-2.46,.18-3.41l-6.93-6.93ZM.1,6C.57,3.72,2.59,2,5,2h14c2.41,0,4.43,1.72,4.9,4H.1Zm23.9,2v9c0,.3-.03,.59-.08,.87l-6.11-6.11c-1.11-1.11-2.62-1.73-4.19-1.73h-2.62c-.55,0-1,.45-1,1v2.63c0,1.57,.62,3.08,1.73,4.19l4.16,4.16H5c-2.76,0-5-2.24-5-5V8H24Z" /></svg></div><span className="font-bold text-sm">Assignments</span></NavLink>
                    <NavLink to="/teacher/community/upload-materials" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M0,19H5v5H3c-1.657,0-3-1.343-3-3v-2ZM5,5V0H3C1.343,0,0,1.343,0,3v2H5Zm7,0V3c0-1.657-1.343-3-3-3h-2V5h5ZM0,7v10H5V7H0Zm7,0v10h5V7H7Zm0,17h2c1.657,0,3-1.343,3-3v-2H7v5ZM13.424,7.478l3.639,10.944,5.412-1.795-3.639-10.944-5.412,1.795Zm4.27,12.841l.792,2.312c.348,1.048,1.48,1.615,2.528,1.267l1.615-.535c1.049-.348,1.617-1.481,1.268-2.529l-.791-2.309-5.412,1.795ZM12.793,5.58l5.412-1.795-.803-2.415c-.348-1.048-1.48-1.616-2.528-1.268l-1.615,.535c-1.048,.348-1.616,1.48-1.268,2.528l.803,2.415Z" /></svg></div><span className="font-bold text-sm">Upload Materials</span></NavLink>
                  </>
                ) : (
                  <>
                    <NavLink to="/teacher/home" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="m9,9H2c-1.103,0-2-.897-2-2v-2C0,2.243,2.243,0,5,0h4c1.103,0,2,.897,2,2v5c0,1.103-.897,2-2,2Zm10,15h-4c-1.103,0-2-.897-2-2v-5c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v2c0,2.757-2.243,5-5,5Zm3-11h-7c-1.103,0-2-.897-2-2V2c0-1.103.897-2,2-2h4c2.757,0,5,2.243,5,5v6c0,1.103-.897,2-2,2Zm-13,11h-4c-2.757,0-5-2.243-5-5v-6c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v9c0,1.103-.897,2-2,2Z" /></svg></div><span className="font-bold text-sm">Dashboard</span></NavLink>
                    <NavLink to="/teacher/todo" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="m13.27 7.48c-.813.813-1.27 1.915-1.27 3.065v.955c0 .276.224.5.5.5h.955c1.149 0 2.252-.457 3.064-1.269l6.715-6.715c.85-.85 1.013-2.236.252-3.167-.875-1.07-2.456-1.129-3.409-.176zm4.664 4.664c-1.195 1.196-2.786 1.855-4.479 1.855h-1.455c-1.104 0-2-.896-2-2v-1.455c0-1.692.659-3.282 1.855-4.479l5.468-5.466c-.697-.37-1.48-.599-2.323-.599h-10c-2.757 0-5 2.243-5 5v14c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5v-8.921l-2.066 2.066zm-9.767 4.522-1.687 1.687c-.431.431-.995.648-1.561.648-.533 0-1.066-.193-1.491-.582l-.669-.579c-.417-.362-.462-.993-.101-1.411.363-.417.994-.462 1.411-.101l.689.598c.103.093.228.092.307.013l1.687-1.687c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414zm0-5-1.687 1.687c-.431.431-.995.648-1.561.648-.533 0-1.066-.193-1.491-.582l-.669-.579c-.417-.362-.462-.994-.101-1.411.363-.419.994-.461 1.411-.101l.689.598c.103.093.228.092.307.013l1.687-1.687c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414zm0-4.96-1.687 1.687c-.431.431-.995.648-1.561.648-.533 0-1.066-.193-1.491-.582l-.669-.579c-.417-.362-.462-.994-.101-1.411.363-.418.994-.461 1.411-.101l.689.598c.103.094.228.092.307.013l1.687-1.687c.391-.391 1.023-.391 1.414 0s.391 1.023 0 1.414zm7.833 11.293h-4c-.553 0-1-.447-1-1s.447-1 1-1h4c.553 0 1 .447 1 1s-.447 1-1 1z" /></svg></div><span className="font-bold text-sm">To-dos</span></NavLink>
                    <NavLink to="/teacher/notes" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 512 512" className="w-4 h-4 fill-current"><path d="M320,170.667h139.52c-7.448-19.736-19.019-37.656-33.941-52.565l-74.325-74.368c-14.927-14.905-32.852-26.468-52.587-33.92   v139.52C298.667,161.115,308.218,170.667,320,170.667z" /><path d="M468.821,213.333H320c-35.346,0-64-28.654-64-64V0.512C252.565,0.277,249.131,0,245.653,0h-96.32   C90.452,0.071,42.737,47.786,42.667,106.667v298.667C42.737,464.214,90.452,511.93,149.333,512h213.333   c58.881-0.07,106.596-47.786,106.667-106.667V223.68C469.333,220.203,469.056,216.768,468.821,213.333z" /></svg></div><span className="font-bold text-sm">Notes</span></NavLink>
                    <NavLink to="/teacher/sketch" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M23.305,16.25a1.888,1.888,0,0,1-1.377,1.177,1.912,1.912,0,0,1-1.769-.521l-.1-.1a3.567,3.567,0,0,0-6.089,2.553l.04,4.516-.924.077c-.331.028-.663.05-1,.05A12,12,0,0,1,3.745,3.371,11.885,11.885,0,0,1,12.5.007,12.155,12.155,0,0,1,24.08,11.7,11.924,11.924,0,0,1,23.305,16.25Zm-6.19-8.2A1.5,1.5,0,1,0,18.95,9.115,1.5,1.5,0,0,0,17.115,8.05Zm-5-3A1.5,1.5,0,1,0,13.95,6.115,1.5,1.5,0,0,0,12.115,5.05Zm-5,3A1.5,1.5,0,1,0,8.95,9.115,1.5,1.5,0,0,0,7.115,8.05Zm0,6A1.5,1.5,0,1,0,8.95,15.115,1.5,1.5,0,0,0,7.115,14.05Z" /></svg></div><span className="font-bold text-sm">Sketch</span></NavLink>
                    <NavLink to="/teacher/calender" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M24,7v1H0v-1C0,4.239,2.239,2,5,2h1V1c0-.552,.448-1,1-1h0c.552,0,1,.448,1,1v1h8V1c0-.552,.448-1,1-1h0c.552,0,1,.448,1,1v1h1c2.761,0,5,2.239,5,5Zm0,10c0,3.86-3.141,7-7,7s-7-3.14-7-7,3.141-7,7-7,7,3.14,7,7Zm-5,.586l-1-1v-1.586c0-.552-.448-1-1-1h0c-.552,0-1,.448-1,1v2c0,.265,.105,.52,.293,.707l1.293,1.293c.39,.39,1.024,.39,1.414,0h0c.39-.39,.39-1.024,0-1.414Zm-11-.586c0-2.829,1.308-5.35,3.349-7H0v9c0,2.761,2.239,5,5,5h6.349c-2.041-1.65-3.349-4.171-3.349-7Z" /></svg></div><span className="font-bold text-sm">Calendar</span></NavLink>
                    <NavLink to="/teacher/researchbot" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="m22.5,9h-.5v-1c0-2.757-2.243-5-5-5h-4V1c0-.552-.447-1-1-1s-1,.448-1,1v2h-4c-2.757,0-5,2.243-5,5v1h-.5c-.827,0-1.5.673-1.5,1.5v3c0,.827.673,1.5,1.5,1.5h.5v1c0,2.757,2.243,5,5,5h7.697l3.963,2.642c.36.24.775.361,1.191.361.348,0,.696-.084,1.015-.255.699-.375,1.134-1.1,1.134-1.894v-6.855h.5c.827,0,1.5-.673,1.5-1.5v-3c0-.827-.673-1.5-1.5-1.5Zm-14-1c.828,0,1.5.672,1.5,1.5s-.672,1.5-1.5,1.5-1.5-.672-1.5-1.5.672-1.5,1.5-1.5Zm8.031,7.573c-1.037.651-2.666,1.427-4.531,1.427s-3.494-.776-4.531-1.427c-.468-.293-.609-.911-.315-1.378.294-.467.911-.609,1.378-.316.815.512,2.079,1.121,3.469,1.121s2.653-.609,3.469-1.121c.466-.294,1.085-.152,1.378.316.294.468.152,1.085-.315,1.378Zm-1.031-4.573c-.828,0-1.5-.672-1.5-1.5s.672-1.5,1.5-1.5,1.5.672,1.5,1.5-.672,1.5-1.5,1.5Z" /></svg></div><span className="font-bold text-sm">Research Bot</span></NavLink>
                    <NavLink to="/teacher/notif" className={({ isActive }) => `flex items-center gap-2.5 p-2.5 rounded-[14px] transition-all duration-300 ${isActive ? "bg-green-50 text-green-700 shadow-sm border border-green-100/50" : "text-gray-600 hover:bg-white/50 border border-transparent"}`}><div className="w-5 h-5 flex items-center justify-center shrink-0"><svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M4.068,18H19.724a3,3,0,0,0,2.821-4.021L19.693,6.094A8.323,8.323,0,0,0,11.675,0h0A8.321,8.321,0,0,0,3.552,6.516l-2.35,7.6A3,3,0,0,0,4.068,18Z" /><path d="M7.1,20a5,5,0,0,0,9.8,0Z" /></svg></div><span className="font-bold text-sm">Notifications</span></NavLink>
                  </>
                )}
              </nav>
            </div>
            </div>
          )}
          
          <button 
            onClick={() => {
              setMobileTab("home");
              setMobileMenuOpen(true);
            }} 
            className={`flex flex-col items-center gap-1.5 transition-colors px-5 py-1 max-[425px]:px-3 ${mobileTab === 'home' || (!mobileMenuOpen && !isCommunity) ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 max-[425px]:w-[22px] max-[425px]:h-[22px] fill-current">
              <path d="m9,9H2c-1.103,0-2-.897-2-2v-2C0,2.243,2.243,0,5,0h4c1.103,0,2,.897,2,2v5c0,1.103-.897,2-2,2Zm10,15h-4c-1.103,0-2-.897-2-2v-5c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v2c0,2.757-2.243,5-5,5Zm3-11h-7c-1.103,0-2-.897-2-2V2c0-1.103.897-2,2-2h4c2.757,0,5,2.243,5,5v6c0,1.103-.897,2-2,2Zm-13,11h-4c-2.757,0-5-2.243-5-5v-6c0-1.103.897-2,2-2h7c1.103,0,2,.897,2,2v9c0,1.103-.897,2-2,2Z" />
            </svg>
            <span className="text-[11px] max-[425px]:text-[9px] font-bold">Home</span>
          </button>
          
          <Link to="/teacher/profile" className="relative -top-1.5 max-[425px]:-top-1 glass-panel p-1.5 rounded-full shadow-md border border-gray-100 flex items-center justify-center transition-transform hover:scale-105 active:scale-95">
             <img src={avatarUrl} alt="Profile" className="w-12 h-12 max-[425px]:w-11 max-[425px]:h-11 rounded-full object-cover border-2 border-slate-700 bg-white" />
             <div className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          </Link>

          <button 
            onClick={() => {
              setMobileTab("community");
              setMobileMenuOpen(true);
            }} 
            className={`flex flex-col items-center gap-1.5 transition-colors px-5 py-1 max-[425px]:px-3 ${mobileTab === 'community' || (!mobileMenuOpen && isCommunity) ? 'text-green-600' : 'text-gray-500 hover:text-gray-800'}`}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 max-[425px]:w-[22px] max-[425px]:h-[22px] fill-current">
               <path d="m.213,9.145c-.341-.435-.264-1.063.171-1.404L8.919,1.062c1.814-1.419,4.348-1.42,6.162,0l8.535,6.679c.435.34.512.969.171,1.404-.197.252-.491.384-.788.384-.215,0-.433-.069-.615-.212L13.849,2.638c-1.088-.852-2.609-.852-3.697,0L1.616,9.316c-.436.34-1.063.262-1.403-.171Zm4.395,9.06c.247.189.393.483.393.795v4c0,.553-.447,1-1,1H1c-.553,0-1-.447-1-1,0-2.286,1.571-4.374,3.737-4.965.299-.08.622-.019.87.17Zm19.393,4.795c0,.553-.447,1-1,1h-3c-.553,0-1-.447-1-1v-4c0-.312.146-.605.393-.795.249-.188.573-.25.87-.17,2.166.591,3.737,2.679,3.737,4.965ZM4.5,11c-1.381,0-2.5,1.119-2.5,2.5s1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5-1.119-2.5-2.5-2.5Zm17.5,2.5c0-1.381-1.119-2.5-2.5-2.5s-2.5,1.119-2.5,2.5,1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5Zm-10-5.5c-1.381,0-2.5,1.119-2.5,2.5s1.119,2.5,2.5,2.5,2.5-1.119,2.5-2.5-1.119-2.5-2.5-2.5Zm5,12v3c0,.553-.447,1-1,1h-8c-.553,0-1-.447-1-1v-3c0-2.757,2.243-5,5-5s5,2.243,5,5Z" />
            </svg>
            <span className="text-[11px] max-[425px]:text-[9px] font-bold">Community</span>
          </button>
        </div>
      </div>
    </>
  );
}
