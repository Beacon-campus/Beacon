import LoadingState from "../../ui/LoadingState";

export default function EventWidget({ nextEvent, loadingEvent, relativeTime, widgetHeader, onClickRoute, navigate }) {
    const getBadgeColors = () => {
        if (relativeTime === "Today") return "bg-red-50 text-red-600 border-red-100 animate-pulse";
        if (relativeTime === "Tomorrow") return "bg-amber-50 text-amber-600 border-amber-100";
        return "bg-blue-50 text-blue-600 border-blue-100";
    };

    return (
        <div onClick={() => navigate(onClickRoute)} className="premium-card min-h-[138px] min-[426px]:min-h-[150px] min-[769px]:min-h-[180px] p-4 min-[769px]:p-6 flex flex-col items-center justify-center gap-2 relative overflow-hidden cursor-pointer">
            <h3 className="text-[11px] min-[426px]:text-xs min-[769px]:text-xs font-black text-gray-500 uppercase tracking-widest z-10 text-center">
                {nextEvent ? widgetHeader : "Upcoming Event"}
            </h3>

            {loadingEvent ? (
                <LoadingState size="xs" />
            ) : nextEvent ? (
                <div className="text-center z-10">
                    <p className="text-base min-[426px]:text-[1.05rem] min-[769px]:text-lg font-bold text-primary line-clamp-2">{nextEvent.title}</p>

                    {/* Badge */}
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-[11px] min-[426px]:text-[11px] min-[769px]:text-xs font-bold border ${getBadgeColors()}`}>
                        {relativeTime}
                    </span>
                </div>
            ) : (
                <p className="text-sm min-[426px]:text-sm min-[769px]:text-sm text-gray-500 font-medium italic text-center">No active events</p>
            )}

        </div>
    );
}
