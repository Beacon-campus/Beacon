import LoadingState from "../../ui/LoadingState";

export default function WelcomeCard({ user, quote, theme = "green", roleLabel = "Student", loadingQuote = false }) {
    const getTextColorClass = () => {
        if (theme === "blue") return "text-blue-600";
        if (theme === "purple") return "text-purple-600";
        return "text-green-600";
    };

    return (
        <div className="premium-card min-h-[220px] min-[426px]:min-h-[260px] min-[1025px]:min-h-[320px] p-4 min-[426px]:p-6 min-[1025px]:p-10 flex flex-col justify-center items-start text-left relative overflow-hidden group">
            <div className="z-10 w-full max-w-2xl space-y-3 relative">
                <h1 className="text-[1.7rem] min-[426px]:text-[2.6rem] min-[1025px]:text-5xl font-black text-primary tracking-tight leading-tight">
                    Welcome, <span className={`font-medium ${getTextColorClass()}`}>{user?.profile?.displayName || roleLabel}</span>
                </h1>

                <div className="pt-3 min-[426px]:pt-4 min-[1025px]:pt-6 relative max-w-xl">
                    {loadingQuote ? (
                        <LoadingState size="sm" align="start" className="items-start" />
                    ) : (
                        <>
                            <span className="absolute -top-4 -left-3 text-6xl min-[426px]:-top-5 min-[426px]:-left-6 min-[426px]:text-7xl min-[1025px]:-top-6 min-[1025px]:-left-8 min-[1025px]:text-8xl text-slate-100 font-serif font-black opacity-80 select-none">"</span>
                            <p className="text-[15px] min-[426px]:text-[1.15rem] min-[1025px]:text-xl text-slate-600 font-medium italic leading-relaxed relative z-10 pl-1 min-[426px]:pl-2">
                                {quote.text}
                            </p>
                            {quote.author && (
                                <p className="text-xs min-[426px]:text-[15px] min-[1025px]:text-sm text-slate-400 font-bold mt-3 min-[1025px]:mt-4 uppercase tracking-widest relative z-10 pl-1 min-[426px]:pl-2">
                                    - {quote.author}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
