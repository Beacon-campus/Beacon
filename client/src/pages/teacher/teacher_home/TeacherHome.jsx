import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { auth } from "../../../firebase/firebase";
import useTodos from "../../../hooks/useTodos";
import { useNavigate } from "react-router-dom";
import socket from "../../../services/socket.service";
import WelcomeCard from "../../../components/shared/home_widgets/WelcomeCard";
import EventWidget from "../../../components/shared/home_widgets/EventWidget";
import NotificationsWidget from "../../../components/shared/home_widgets/NotificationsWidget";
import QuickTodosWidget from "../../../components/shared/home_widgets/QuickTodosWidget";
import AnnouncementsWidget from "../../../components/shared/home_widgets/AnnouncementsWidget";
import { fetchRecentUniversityAnnouncements } from "../../../services/university.service";

// --- Helper for relative time (Production Ready) ---
const getRelativeTime = (targetDateStr) => {
    const today = new Date(); // Uses real server/client time
    today.setHours(0, 0, 0, 0);

    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return "Past Event";
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    return `in ${diffDays} days`;
};

// Helper for Todo Date Badge
const getTodoDateInfo = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function TeacherHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quote, setQuote] = useState({ text: "Loading inspiration...", author: "" });
    const [announcements, setAnnouncements] = useState([]);
    const [notifications, setNotifications] = useState([]);

    // --- New Event State ---
    const [nextEvent, setNextEvent] = useState(null);
    const [loadingEvent, setLoadingEvent] = useState(true);

    // Carousel State
    const [activeNotif, setActiveNotif] = useState(0);
    const [activeAnnounce, setActiveAnnounce] = useState(0);

    // Auto-Scroll Notifications
    useEffect(() => {
        if (notifications.length <= 1) return;
        const interval = setInterval(() => {
            setActiveNotif((prev) => (prev + 1) % notifications.length);
        }, 5200);
        return () => clearInterval(interval);
    }, [notifications.length]);

    // Auto-Scroll Announcements
    useEffect(() => {
        if (announcements.length <= 1) return;
        const interval = setInterval(() => {
            setActiveAnnounce((prev) => (prev + 1) % announcements.length);
        }, 5200);
        return () => clearInterval(interval);
    }, [announcements.length]);

    useEffect(() => {
        if (activeAnnounce >= announcements.length && announcements.length > 0) {
            setActiveAnnounce(0);
        }
    }, [activeAnnounce, announcements.length]);

    useEffect(() => {
        if (activeNotif >= notifications.length && notifications.length > 0) {
            setActiveNotif(0);
        }
    }, [activeNotif, notifications.length]);

    // Animation State for Todos
    const [animatingIds, setAnimatingIds] = useState([]);

    // Todo Data
    const { todos, toggleComplete } = useTodos(); // Use the existing hook

    const handleComplete = (id) => {
        if (animatingIds.includes(id)) return;
        setAnimatingIds(prev => [...prev, id]);

        // Wait for animation to finish before actual toggle
        setTimeout(() => {
            toggleComplete(id, true);
            setAnimatingIds(prev => prev.filter(tid => tid !== id));
        }, 400);
    };

    // Navigation Helpers
    const nextNotif = (e) => {
        e.stopPropagation();
        if (!notifications.length) return;
        setActiveNotif(prev => (prev + 1) % notifications.length);
    };
    const prevNotif = (e) => {
        e.stopPropagation();
        if (!notifications.length) return;
        setActiveNotif(prev => (prev - 1 + notifications.length) % notifications.length);
    };

    const nextAnnounce = (e) => {
        e.stopPropagation();
        if (!announcements.length) return;
        setActiveAnnounce(prev => (prev + 1) % announcements.length);
    };
    const prevAnnounce = (e) => {
        e.stopPropagation();
        if (!announcements.length) return;
        setActiveAnnounce(prev => (prev - 1 + announcements.length) % announcements.length);
    };

    // Get Top 3 Upcoming Todos
    const quickTodos = todos
        .filter(t => !t.completed)
        .sort((a, b) => {
            const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
            const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
            return dateA - dateB;
        })
        .slice(0, 3);

    // 1. Fetch Random Quote (Persistent)
    useEffect(() => {
        const fetchQuote = async () => {
            // Check localStorage first
            const storedQuote = localStorage.getItem("userQuote");
            if (storedQuote) {
                try {
                    setQuote(JSON.parse(storedQuote));
                    return;
                } catch {
                    localStorage.removeItem("userQuote");
                }
            }

            try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/quotes/random`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    setQuote(data);
                    localStorage.setItem("userQuote", JSON.stringify(data));
                } else {
                    setQuote({
                        text: "The art of teaching is the art of assisting discovery.",
                        author: "Mark Van Doren"
                    });
                }
            } catch (err) {
                console.error("Failed to fetch quote:", err);
                setQuote({
                    text: "Education is not the filling of a pail, but the lighting of a fire.",
                    author: "W.B. Yeats"
                });
            }
        };
        fetchQuote();
    }, []);

    // 2. Fetch Upcoming Event (Same logic as Student)
    useEffect(() => {
        const fetchNextEvent = async () => {
            if (!user || !auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/calendar/current`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.upcomingEvents && data.upcomingEvents.length > 0) {
                        setNextEvent(data.upcomingEvents[0]);
                    } else {
                        setNextEvent(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch event:", err);
            } finally {
                setLoadingEvent(false);
            }
        };
        fetchNextEvent();
    }, [user]);

    useEffect(() => {
        const loadAnnouncements = async () => {
            if (!user || !auth.currentUser) return;
            try {
                const data = await fetchRecentUniversityAnnouncements(8);
                const normalized = (data || []).map((item) => ({
                    ...item,
                    text: item.message,
                    sender: item.createdBy?.name || "Admin",
                }));
                setAnnouncements(normalized);
            } catch (err) {
                console.error("Failed to fetch university announcements:", err);
                setAnnouncements([]);
            }
        };
        loadAnnouncements();
    }, [user]);

    useEffect(() => {
        const normalizeType = (rawType = "") => {
            const type = String(rawType || "").toUpperCase();
            if (type.includes("URGENT")) return "urgent";
            if (type.includes("UNIVERSITY") || type.includes("ANNOUNCEMENT")) return "university";
            if (type.includes("DOUBT")) return "alert";
            if (type.includes("ASSIGNMENT")) return "assignment";
            return "info";
        };

        const loadNotifications = async () => {
            if (!user || !auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch notifications");
                const data = await res.json();
                const latest = (data || [])
                    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
                    .slice(0, 3)
                    .map((n) => ({
                        id: n._id || n.id,
                        title: n.title || "Notification",
                        desc: n.content || n.description || "",
                        type: normalizeType(n.type),
                    }));
                setNotifications(latest);
            } catch (err) {
                console.error("Failed to fetch home notifications:", err);
                setNotifications([]);
            }
        };

        loadNotifications();
    }, [user]);

    useEffect(() => {
        const onNewAnnouncement = (item) => {
            const normalized = {
                ...item,
                text: item.message,
                sender: item.createdBy?.name || "Admin",
            };
            setAnnouncements((prev) => {
                if (prev.some((a) => a._id === normalized._id)) return prev;
                return [normalized, ...prev].slice(0, 8);
            });
        };
        socket.on("university_announcement_new", onNewAnnouncement);
        return () => socket.off("university_announcement_new", onNewAnnouncement);
    }, []);

    useEffect(() => {
        const normalizeType = (rawType = "") => {
            const type = String(rawType || "").toUpperCase();
            if (type.includes("URGENT")) return "urgent";
            if (type.includes("UNIVERSITY") || type.includes("ANNOUNCEMENT")) return "university";
            if (type.includes("DOUBT")) return "alert";
            if (type.includes("ASSIGNMENT")) return "assignment";
            return "info";
        };

        const onNewNotification = async () => {
            if (!user || !auth.currentUser) return;
            try {
                const token = await auth.currentUser.getIdToken();
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                const latest = (data || [])
                    .sort((a, b) => new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0))
                    .slice(0, 3)
                    .map((n) => ({
                        id: n._id || n.id,
                        title: n.title || "Notification",
                        desc: n.content || n.description || "",
                        type: normalizeType(n.type),
                    }));
                setNotifications(latest);
            } catch {
                // ignore live refresh errors
            }
        };
        socket.on("new_notification", onNewNotification);
        socket.on("event", onNewNotification);
        return () => {
            socket.off("new_notification", onNewNotification);
            socket.off("event", onNewNotification);
        };
    }, [user]);

    // --- Logic for Header & Badge ---
    const relativeTime = nextEvent ? getRelativeTime(nextEvent.date) : "";

    let widgetHeader = "Upcoming Event";
    if (relativeTime === "Today") widgetHeader = "Today's Event";
    if (relativeTime === "Tomorrow") widgetHeader = "Tomorrow's Event";

    return (
        <div className="h-full w-full pt-1 animate-fade-in-up">
            <div className="flex flex-col h-full gap-4">

                {/* ================= TOP SECTION ================= */}
                <div className="flex-[3] flex gap-4 min-h-0">
                    <WelcomeCard
                        user={user}
                        quote={quote}
                        theme="blue"
                        roleLabel="Teacher"
                    />

                    <div className="flex-[2] flex flex-col gap-4">
                        <EventWidget
                            nextEvent={nextEvent}
                            loadingEvent={loadingEvent}
                            relativeTime={relativeTime}
                            widgetHeader={widgetHeader}
                            onClickRoute="/teacher/calender"
                            navigate={navigate}
                        />

                        <NotificationsWidget
                            activeNotif={activeNotif}
                            notifications={notifications}
                            setActiveNotif={setActiveNotif}
                            prevNotif={prevNotif}
                            nextNotif={nextNotif}
                            onClickRoute="/teacher/notif"
                            navigate={navigate}
                        />
                    </div>
                </div>

                {/* ================= BOTTOM SECTION - SPLIT ================= */}
                <div className="flex-[2] flex gap-4 min-h-0">
                    <QuickTodosWidget
                        quickTodos={quickTodos}
                        animatingIds={animatingIds}
                        handleComplete={handleComplete}
                        getTodoDateInfo={getTodoDateInfo}
                        navigate={navigate}
                        themeColor="blue"
                        navigateTo="/teacher/todo"
                    />

                    <AnnouncementsWidget
                        activeAnnounce={activeAnnounce}
                        announcements={announcements}
                        setActiveAnnounce={setActiveAnnounce}
                        prevAnnounce={prevAnnounce}
                        nextAnnounce={nextAnnounce}
                        navigate={navigate}
                        navigateTo="/teacher/community"
                        enableAdvancedPreview={true}
                    />
                </div>

            </div>
        </div>
    );
}
