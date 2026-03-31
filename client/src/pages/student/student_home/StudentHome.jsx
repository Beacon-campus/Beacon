import { useEffect, useMemo, useState } from "react";
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

// Helper for relative time
const getRelativeTime = (targetDateStr) => {
    // --- TEST MODE: Force "Today" to match Server (Jan 26) ---
    //const today = new Date("2026-01-26T00:00:00"); 
    const today = new Date(); // Use this for production

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

export default function StudentHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [quote, setQuote] = useState({ text: "", author: "" });
    const [quoteLoading, setQuoteLoading] = useState(true);
    const [nextEvent, setNextEvent] = useState(null);
    const [loadingEvent, setLoadingEvent] = useState(true);
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

    // Carousel State
    const [activeNotif, setActiveNotif] = useState(0);
    const [activeAnnounce, setActiveAnnounce] = useState(0);

    // Todo Animation State
    const [animatingIds, setAnimatingIds] = useState([]);
    const userCacheKey = user?.uid || "guest";

    const homeNotifications = useMemo(() => {
        const pendingFriendCount = user?.friendRequests?.received?.length || 0;
        const friendRequestCard = pendingFriendCount > 0
            ? [{
                id: "home-friend-requests",
                title: "Friend requests pending",
                desc: pendingFriendCount === 1 ? "You have 1 pending friend request." : `You have ${pendingFriendCount} pending friend requests.`,
                type: "friend_req",
            }]
            : [];

        return [...friendRequestCard, ...notifications].slice(0, 3);
    }, [notifications, user?.friendRequests?.received?.length]);

    // Auto-Scroll Notifications
    useEffect(() => {
        if (homeNotifications.length <= 1) return;
        const interval = setInterval(() => {
            setActiveNotif((prev) => (prev + 1) % homeNotifications.length);
        }, 5200);
        return () => clearInterval(interval);
    }, [homeNotifications.length]);

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
        if (activeNotif >= homeNotifications.length && homeNotifications.length > 0) {
            setActiveNotif(0);
        }
    }, [activeNotif, homeNotifications.length]);


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
        if (!homeNotifications.length) return;
        setActiveNotif(prev => (prev + 1) % homeNotifications.length);
    };
    const prevNotif = (e) => {
        e.stopPropagation();
        if (!homeNotifications.length) return;
        setActiveNotif(prev => (prev - 1 + homeNotifications.length) % homeNotifications.length);
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
                    "student:home:quote",
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
                    text: "Education is the passport to the future.",
                    author: "Malcolm X"
                });
            } finally {
                setQuoteLoading(false);
            }
        };
        fetchQuote();
    }, [userCacheKey]);

    // 2. Fetch Upcoming Event
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

    // Logic for Header & Badge
    const relativeTime = nextEvent ? getRelativeTime(nextEvent.date) : "";

    // DYNAMIC HEADER LOGIC
    let widgetHeader = "Upcoming Event";
    if (relativeTime === "Today") widgetHeader = "Today's Event";
    if (relativeTime === "Tomorrow") widgetHeader = "Tomorrow's Event";

    return (
        <div className="min-h-full h-auto w-full px-4 max-[425px]:px-3 pt-0 pb-0 animate-fade-in-up min-[769px]:h-full min-[769px]:px-0 min-[769px]:pt-1 min-[769px]:pb-2">
            <div className="flex flex-col gap-4 min-h-full min-[769px]:h-full">

                {/* MOBILE + TABLET */}
                <div className="flex flex-col gap-4 min-[769px]:hidden">
                    <WelcomeCard
                        user={user}
                        quote={quote}
                        theme="green"
                        roleLabel="Student"
                        loadingQuote={quoteLoading}
                    />

                    <div className="hidden min-[426px]:grid min-[426px]:grid-cols-2 gap-4">
                        <EventWidget
                            nextEvent={nextEvent}
                            loadingEvent={loadingEvent}
                            relativeTime={relativeTime}
                            widgetHeader={widgetHeader}
                            onClickRoute="/student/calender"
                            navigate={navigate}
                        />

                        <NotificationsWidget
                            activeNotif={activeNotif}
                            notifications={homeNotifications}
                            setActiveNotif={setActiveNotif}
                            prevNotif={prevNotif}
                            nextNotif={nextNotif}
                            onClickRoute="/student/notif"
                            navigate={navigate}
                        />
                    </div>

                    <div className="flex flex-col gap-4 min-[426px]:hidden">
                        <EventWidget
                            nextEvent={nextEvent}
                            loadingEvent={loadingEvent}
                            relativeTime={relativeTime}
                            widgetHeader={widgetHeader}
                            onClickRoute="/student/calender"
                            navigate={navigate}
                        />

                        <NotificationsWidget
                            activeNotif={activeNotif}
                            notifications={homeNotifications}
                            setActiveNotif={setActiveNotif}
                            prevNotif={prevNotif}
                            nextNotif={nextNotif}
                            onClickRoute="/student/notif"
                            navigate={navigate}
                        />
                    </div>

                    <QuickTodosWidget
                        quickTodos={quickTodos}
                        animatingIds={animatingIds}
                        handleComplete={handleComplete}
                        getTodoDateInfo={getTodoDateInfo}
                        navigate={navigate}
                        themeColor="red"
                        navigateTo="/student/todo"
                    />

                    <AnnouncementsWidget
                        activeAnnounce={activeAnnounce}
                        announcements={universityAnnouncements}
                        setActiveAnnounce={setActiveAnnounce}
                        prevAnnounce={prevAnnounce}
                        nextAnnounce={nextAnnounce}
                        navigate={navigate}
                        navigateTo="/student/community"
                        enableAdvancedPreview={true}
                    />
                </div>

                {/* DESKTOP */}
                <div className="hidden min-[769px]:flex min-[769px]:flex-col min-[769px]:h-full min-[769px]:gap-4">
                    <div className="flex-[3] flex gap-4 min-h-0">
                        <WelcomeCard
                            user={user}
                            quote={quote}
                            theme="green"
                            roleLabel="Student"
                            loadingQuote={quoteLoading}
                        />

                        <div className="flex-[2] flex flex-col gap-4">
                            <EventWidget
                                nextEvent={nextEvent}
                                loadingEvent={loadingEvent}
                                relativeTime={relativeTime}
                                widgetHeader={widgetHeader}
                                onClickRoute="/student/calender"
                                navigate={navigate}
                            />

                            <NotificationsWidget
                                activeNotif={activeNotif}
                                notifications={homeNotifications}
                                setActiveNotif={setActiveNotif}
                                prevNotif={prevNotif}
                                nextNotif={nextNotif}
                                onClickRoute="/student/notif"
                                navigate={navigate}
                            />
                        </div>
                    </div>

                    <div className="flex-[2] flex gap-4 min-h-0">
                        <QuickTodosWidget
                            quickTodos={quickTodos}
                            animatingIds={animatingIds}
                            handleComplete={handleComplete}
                            getTodoDateInfo={getTodoDateInfo}
                            navigate={navigate}
                            themeColor="red"
                            navigateTo="/student/todo"
                        />

                        <AnnouncementsWidget
                            activeAnnounce={activeAnnounce}
                            announcements={universityAnnouncements}
                            setActiveAnnounce={setActiveAnnounce}
                            prevAnnounce={prevAnnounce}
                            nextAnnounce={nextAnnounce}
                            navigate={navigate}
                            navigateTo="/student/community"
                            enableAdvancedPreview={true}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
