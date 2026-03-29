import LoadingState from "../../ui/LoadingState";

export default function WelcomeCard({ user, quote, theme = "green", roleLabel = "Student", loadingQuote = false }) {
    // Generate background color class dynamically but explicitly to avoiding purging
    const getBgColorClass = () => {
        if (theme === "blue") return "bg-blue-50";
        if (theme === "purple") return "bg-purple-50";
        return "bg-green-50";
    };

    const getTextColorClass = () => {
        if (theme === "blue") return "text-blue-600";
        if (theme === "purple") return "text-purple-600";
        return "text-green-600";
    };

    return (
        <div className="premium-card p-6 sm:p-10 flex-[3] flex flex-col justify-center items-start text-left relative overflow-hidden group">
            {/* The Aurora background behind the premium-card will automatically shine through the blur */}
            
            <div className="z-10 w-full max-w-2xl space-y-2 sm:space-y-3 relative">
                <h1 className="text-3xl sm:text-5xl font-black text-primary tracking-tight mt-2 sm:mt-0">
                    Welcome, <span className={`font-medium ${getTextColorClass()}`}>{user?.profile?.displayName || roleLabel}</span>
                </h1>

                <div className="pt-4 sm:pt-6 relative max-w-xl">
                    {loadingQuote ? (
                        <LoadingState size="sm" align="start" className="items-start" />
                    ) : (
                        <>
                            <span className="absolute -top-4 sm:-top-6 -left-4 sm:-left-8 text-6xl sm:text-8xl text-slate-100 font-serif font-black opacity-80 select-none">"</span>
                            <p className="text-lg sm:text-xl text-slate-600 font-medium italic leading-relaxed relative z-10 pl-2">{quote.text}</p>
                            {quote.author && (
                                <p className="text-sm text-slate-400 font-bold mt-4 uppercase tracking-widest relative z-10 pl-2">— {quote.author}</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
