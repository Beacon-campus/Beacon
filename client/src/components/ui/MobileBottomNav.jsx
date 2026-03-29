import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const role = user.role;
  const isStudent = role === "student";
  const isTeacher = role === "teacher";
  const isAdmin = role === "admin";

  let navItems = [];

  if (isStudent) {
    navItems = [
      { 
        name: "Dashboard", 
        path: "/student/home", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        ) 
      },
      { 
        name: "To-dos", 
        path: "/student/todo", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        ) 
      },
      { 
        name: "Notes", 
        path: "/student/notes", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
          </svg>
        ) 
      },
      { 
        name: "Study Bot", 
        path: "/student/bot", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"></rect>
            <circle cx="12" cy="5" r="2"></circle>
            <path d="M12 7v4"></path>
            <line x1="8" y1="16" x2="8" y2="16"></line>
            <line x1="16" y1="16" x2="16" y2="16"></line>
          </svg>
        ) 
      },
    ];
  } else if (isTeacher) {
    navItems = [
      { 
        name: "Dashboard", 
        path: "/teacher/home", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        ) 
      },
      { 
        name: "To-dos", 
        path: "/teacher/todo", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4"></path>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
          </svg>
        ) 
      },
      { 
        name: "Calendar", 
        path: "/teacher/calender", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        ) 
      },
      { 
        name: "Community", 
        path: "/teacher/community", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        ) 
      },
    ];
  } else {
    navItems = [
      { 
        name: "Dashboard", 
        path: "/admin/home", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          </svg>
        ) 
      },
      { 
        name: "Users", 
        path: "/admin/users", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        ) 
      },
      { 
        name: "Server", 
        path: "/admin/server", 
        icon: (
          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
            <line x1="6" y1="6" x2="6.01" y2="6"></line>
            <line x1="6" y1="18" x2="6.01" y2="18"></line>
          </svg>
        ) 
      },
    ];
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-around items-center bg-white/80 backdrop-blur-lg border border-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl py-3 px-4 md:hidden">
      {navItems.map((item) => {
        const isActive = location.pathname.startsWith(item.path);
        
        return (
          <Link
            key={item.name}
            to={item.path}
            className={`flex flex-col items-center justify-center gap-1 min-w-[64px] transition-all duration-300 active:scale-95 ${
              isActive ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive ? "bg-slate-100" : "bg-transparent"}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold tracking-wide transition-all ${isActive ? "opacity-100" : "opacity-80"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
