export default function NotificationsWidget({
    activeNotif,
    notifications = [],
    setActiveNotif,
    prevNotif,
    nextNotif,
    onClickRoute,
    navigate
}) {
    const items = notifications || [];
    const activeItem = items[activeNotif] || null;

    const getTypePalette = (item) => {
        const raw = String(item?.rawType || "").toUpperCase();
        const normalized = String(item?.type || "").toUpperCase();

        if (raw.startsWith("FRIEND_") || normalized === "FRIEND_REQ") return { text: "text-violet-600", fill: "bg-violet-500" };
        if (raw === "ASSIGNMENT_PUBLISHED") return { text: "text-indigo-600", fill: "bg-indigo-500" };
        if (raw === "ASSIGNMENT_SUBMITTED") return { text: "text-emerald-600", fill: "bg-emerald-500" };
        if (raw === "ASSIGNMENT_DOUBT") return { text: "text-amber-600", fill: "bg-amber-500" };
        if (raw === "ASSIGNMENT_DOUBT_REPLY") return { text: "text-cyan-600", fill: "bg-cyan-500" };
        if (raw.startsWith("ASSIGNMENT")) return { text: "text-indigo-600", fill: "bg-indigo-500" };
        if (normalized === "GROUPED" || normalized === "ASSIGNMENT_GROUPED") return { text: "text-slate-600", fill: "bg-slate-500" };
        if (normalized === "URGENT") return { text: "text-red-600", fill: "bg-red-500" };
        if (normalized === "ALERT") return { text: "text-amber-600", fill: "bg-amber-500" };
        if (normalized === "UNIVERSITY") return { text: "text-cyan-600", fill: "bg-cyan-500" };
        if (normalized === "ASSIGNMENT") return { text: "text-indigo-600", fill: "bg-indigo-500" };
        return { text: "text-blue-600", fill: "bg-blue-500" };
    };
    const activePalette = getTypePalette(activeItem);

    return (
        <div className="premium-card p-6 flex-1 flex flex-col items-center justify-center gap-2 relative min-h-[180px] sm:min-h-[250px]">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest w-full text-center z-10 mb-1">
                Notifications
            </h3>

            <div className="flex-1 w-full flex items-center gap-3 px-2 z-10">
                <div className="flex flex-col items-center gap-1 z-20 shrink-0">
                    {/* Up Arrow */}
                    <button
                        onClick={prevNotif}
                        className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-200 transition-transform active:scale-95 mb-1"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                    </button>

                    <div className="flex flex-col gap-1.5 justify-center">
                        {items.map((_, idx) => (
                            <div
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setActiveNotif(idx); }}
                                className={`rounded-full transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-gray-300 bg-gray-200 ${activeNotif === idx ? 'h-8 w-1.5' : 'h-1.5 w-1.5'}`}
                            >
                                {activeNotif === idx && (
                                    <div
                                        key={`anim-${idx}-${activeNotif}`}
                                        className={`absolute top-0 left-0 w-full ${activePalette.fill} animate-[fillHeight_5.2s_linear_forwards]`}
                                    ></div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Down Arrow */}
                    <button
                        onClick={nextNotif}
                        className="w-6 h-6 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-100 border border-gray-200 transition-transform active:scale-95 mt-1"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-hidden h-full flex flex-col justify-center">
                    {activeItem ? (
                        <div
                            className="cursor-pointer group pl-2"
                            onClick={() => navigate(onClickRoute)}
                        >
                            <div key={activeNotif} className="animate-fade-in-up">
                                <p className={`text-xs font-bold uppercase mb-1 ${activePalette.text}`}>
                                    {String(activeItem?.type || "info").replace('_', ' ')}
                                </p>
                                <p className="text-sm font-bold text-gray-800 line-clamp-1">{activeItem?.title || "Notification"}</p>
                                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{activeItem?.desc || ""}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="pl-2 text-xs text-gray-400 font-medium">No notifications yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
