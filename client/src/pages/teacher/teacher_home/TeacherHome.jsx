import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useHomeData } from "../../../context/HomeDataContext";
import { useNavigate } from "react-router-dom";
import socket from "../../../services/socket.service";
import apiClient from "../../../services/apiClient";
import { getOrFetchPageCache } from "../../../services/pageCache.service";
import WelcomeCard from "../../../components/shared/home_widgets/WelcomeCard";
import EventWidget from "../../../components/shared/home_widgets/EventWidget";
import NotificationsWidget from "../../../components/shared/home_widgets/NotificationsWidget";
import QuickTodosWidget from "../../../components/shared/home_widgets/QuickTodosWidget";
import AnnouncementsWidget from "../../../components/shared/home_widgets/AnnouncementsWidget";

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
    const userCacheKey = user?.uid || "guest";
    const navigate = useNavigate();
    const [quote, setQuote] = useState({ text: "", author: "" });
    const [quoteLoading, setQuoteLoading] = useState(true);
    const {
        todos,
        notifications,
        universityAnnouncements,
        calendarCurrent,
        fetchNotifications,
        toggleTodoComplete,
        setUniversityAnnouncements,
        homeLoading,
    } = useHomeData();

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
        if (universityAnnouncements.length <= 1) return;
        const interval = setInterval(() => {
            setActiveAnnounce((prev) => (prev + 1) % universityAnnouncements.length);
        }, 5200);
        return () => clearInterval(interval);
    }, [universityAnnouncements.length]);

    useEffect(() => {
        if (activeAnnounce >= universityAnnouncements.length && universityAnnouncements.length > 0) {
            setActiveAnnounce(0);
        }
    }, [activeAnnounce, universityAnnouncements.length]);

    useEffect(() => {
        if (activeNotif >= notifications.length && notifications.length > 0) {
            setActiveNotif(0);
        }
    }, [activeNotif, notifications.length]);

    // Animation State for Todos
    const [animatingIds, setAnimatingIds] = useState([]);


    const handleComplete = (id) => {
        if (animatingIds.includes(id)) return;
        setAnimatingIds(prev => [...prev, id]);

        // Wait for animation to finish before actual toggle
        setTimeout(() => {
            toggleTodoComplete(id, true);
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
        if (!universityAnnouncements.length) return;
        setActiveAnnounce(prev => (prev + 1) % universityAnnouncements.length);
    };
    const prevAnnounce = (e) => {
        e.stopPropagation();
        if (!universityAnnouncements.length) return;
        setActiveAnnounce(prev => (prev - 1 + universityAnnouncements.length) % universityAnnouncements.length);
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
            setQuoteLoading(true);
            try {
                const data = await getOrFetchPageCache(
                    "teacher:home:quote",
                    userCacheKey,
                    async () => {
                        const response = await apiClient.get("/quotes/random");
                        return response.data;
                    }
                );
                setQuote(data);
            } catch (err) {
                console.error("Failed to fetch quote:", err);
                setQuote({
                    text: "Education is not the filling of a pail, but the lighting of a fire.",
                    author: "W.B. Yeats"
                });
            } finally {
                setQuoteLoading(false);
            }
        };
        fetchQuote();
    }, [userCacheKey]);

    // 2. Fetch Upcoming Event (Same logic as Student)
    useEffect(() => {
        if (!calendarCurrent) return;
        setNextEvent(calendarCurrent?.upcomingEvents?.[0] || null);
        setLoadingEvent(false);
    }, [calendarCurrent]);

    useEffect(() => {
        if (!homeLoading && !calendarCurrent) {
            setLoadingEvent(false);
        }
    }, [homeLoading, calendarCurrent]);

    useEffect(() => {
        const onNewAnnouncement = (item) => {
            const normalized = {
                ...item,
                text: item.message,
                sender: item.createdBy?.name || "Admin",
            };
            setUniversityAnnouncements((prev) => {
                if (prev.some((a) => a._id === normalized._id)) return prev;
                return [normalized, ...prev].slice(0, 8);
            });
        };
        socket.on("university_announcement_new", onNewAnnouncement);
        return () => socket.off("university_announcement_new", onNewAnnouncement);
    }, [setUniversityAnnouncements]);

    useEffect(() => {
        const onNewNotification = async () => {
            if (!user) return;
            try {
                await fetchNotifications(true, 8);
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
    }, [user, fetchNotifications]);

    // --- Logic for Header & Badge ---
    const relativeTime = nextEvent ? getRelativeTime(nextEvent.date) : "";

    let widgetHeader = "Upcoming Event";
    if (relativeTime === "Today") widgetHeader = "Today's Event";
    if (relativeTime === "Tomorrow") widgetHeader = "Tomorrow's Event";

    return (
        <div className="h-auto md:h-full w-full pt-1 pb-4 md:pb-0 animate-fade-in-up">
            <div className="flex flex-col md:h-full gap-4">

                {/* ================= TOP SECTION ================= */}
                <div className="flex-none md:flex-[3] flex flex-col md:flex-row gap-4 md:min-h-0">
                    <WelcomeCard
                        user={user}
                        quote={quote}
                        theme="blue"
                        roleLabel="Teacher"
                        loadingQuote={quoteLoading}
                    />

                    <div className="flex-none md:flex-[2] flex flex-col gap-4">
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
                <div className="flex-none md:flex-[2] flex flex-col md:flex-row gap-4 md:min-h-0">
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
                        announcements={universityAnnouncements}
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
