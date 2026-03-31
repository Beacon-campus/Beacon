import LoadingState from "../../ui/LoadingState";

export default function WelcomeCard({ user, quote, theme = "green", roleLabel = "Student", loadingQuote = false }) {
    const getTextColorClass = () => {
        if (theme === "blue") return "text-blue-600";
        if (theme === "purple") return "text-purple-600";
        return "text-green-600";
    };

    return (
        <div className="premium-card min-h-[180px] min-[426px]:min-h-[200px] min-[769px]:min-h-[320px] min-[769px]:flex-[3] p-5 min-[426px]:p-6 min-[769px]:p-10 flex flex-col justify-center items-start text-left relative overflow-hidden group">
            <div className="z-10 w-full max-w-2xl space-y-2 min-[769px]:space-y-3 relative">
                <h1 className="text-[1.75rem] min-[426px]:text-3xl min-[769px]:text-5xl font-black text-primary tracking-tight leading-tight">
                    Welcome, <span className={`font-medium ${getTextColorClass()}`}>{user?.profile?.displayName || roleLabel}</span>
                </h1>

                <div className="pt-2 min-[426px]:pt-3 min-[769px]:pt-6 relative max-w-xl">
                    {loadingQuote ? (
                        <LoadingState size="sm" align="start" className="items-start" />
                    ) : (
                        <>
                            <span className="absolute -top-3 -left-2 text-5xl min-[426px]:-top-4 min-[426px]:-left-3 min-[426px]:text-6xl min-[769px]:-top-6 min-[769px]:-left-8 min-[769px]:text-8xl text-slate-100 font-serif font-black opacity-80 select-none">"</span>
                            <p className="text-[15px] min-[426px]:text-base min-[769px]:text-xl text-slate-600 font-medium italic leading-relaxed relative z-10 pl-2">
                                {quote.text}
                            </p>
                            {quote.author && (
                                <p className="text-xs min-[769px]:text-sm text-slate-400 font-bold mt-2 min-[769px]:mt-4 uppercase tracking-widest relative z-10 pl-2">
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
