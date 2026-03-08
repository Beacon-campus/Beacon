import { useState, useEffect } from "react";
import { Outlet, Link, useLocation, Navigate, NavLink } from "react-router-dom";
import Navbar from "../../components/ui/Navbar";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import UpdateEmailModal from "../../components/UpdateEmailModal";
import Breadcrumb from "../../components/ui/Breadcrumb";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

// SVG Imports removed (using inline)
import flameGif from "../../assets/flame.gif";

export default function TeacherLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const { user, loading } = useAuth();

  const isCommunity = location.pathname.startsWith("/teacher/community");

  const getLinkClass = ({ isActive }) => {
    const base = `flex items-center ${collapsed ? "justify-center w-10 h-10 p-0 mx-auto" : "gap-3 px-3.5 py-2.5 mx-3"} text-sm font-medium transition-all duration-200 group relative rounded-[12px] border-l-[3px]`;

    if (isActive) {
      return `${base} bg-transparent text-[#15803D] border-l-[#15803D] font-bold`;
    }

    return `${base} bg-transparent text-gray-500 border-l-transparent hover:bg-gray-50`;
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
                          <span className={`whitespace-nowrap transition-all duration-200 ${collapsed ? "hidden opacity-0 w-0" : "block opacity-100"}`}>Publish Assignment</span>
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
          <div className={`relative z-10 flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 ${collapsed ? "ml-28" : "ml-64"}`}>
            <div className="px-6 pt-4 pb-0">
              <Navbar />
            </div>

            <div className="flex-1 px-6 pb-6 overflow-hidden flex flex-col">
              <div className="shrink-0 mb-3 pb-0">
                <Breadcrumb />
              </div>
              
              <div className="flex-1 min-h-0 overflow-y-auto w-full no-scrollbar flex flex-col">
                <Outlet />
              </div>
            </div>
          </div>
      </div>
    </>
  );
}