export default function EventWidget({ nextEvent, loadingEvent, relativeTime, widgetHeader, onClickRoute, navigate }) {
    const getBadgeColors = () => {
        if (relativeTime === "Today") return "bg-red-50 text-red-600 border-red-100 animate-pulse";
        if (relativeTime === "Tomorrow") return "bg-amber-50 text-amber-600 border-amber-100";
        return "bg-blue-50 text-blue-600 border-blue-100";
    };

    return (
        <div onClick={() => navigate(onClickRoute)} className="premium-card p-6 flex-1 flex flex-col items-center justify-center gap-2 relative overflow-hidden cursor-pointer">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest z-10">
                {nextEvent ? widgetHeader : "Upcoming Event"}
            </h3>

            {loadingEvent ? (
                <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
            ) : nextEvent ? (
                <div className="text-center z-10">
                    <p className="text-lg font-bold text-primary line-clamp-1">{nextEvent.title}</p>

                    {/* Badge */}
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-bold border ${getBadgeColors()}`}>
                        {relativeTime}
                    </span>
                </div>
            ) : (
                <p className="text-gray-500 font-medium italic">No active events</p>
            )}

        </div>
    );
}
