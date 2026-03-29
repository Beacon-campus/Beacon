export default function QuickTodosWidget({
    quickTodos,
    animatingIds,
    handleComplete,
    getTodoDateInfo,
    navigate,
    themeColor = "red",
    navigateTo = "/student/todo",
    emptyMessage = "Add new tasks in Todos to appear here."
}) {
    const getThemeColorClass = () => {
        if (themeColor === "red") return "bg-red-600";
        if (themeColor === "blue") return "bg-blue-600";
        return "bg-green-600"; // fallback
    };

    return (
        <div className="premium-card p-4 sm:p-6 w-full sm:w-[35%] shrink-0 flex flex-col min-h-[250px] sm:min-h-[300px]">
            <h2 className="text-xl font-black text-primary mb-3 flex items-center gap-2 tracking-tight">
                <span className={`w-2 h-6 rounded-full ${getThemeColorClass()}`}></span>
                Quick To-Dos
                {quickTodos.length > 0 && <span className="text-xs font-normal text-gray-500">(click to complete)</span>}
            </h2>

            <div className="flex-1 overflow-hidden flex flex-col gap-2">
                {quickTodos.length > 0 ? (
                    quickTodos.map(todo => {
                        const dateText = getTodoDateInfo(todo.dueDate);
                        const isAnimating = animatingIds.includes(todo.id);

                        return (
                            <div
                                key={todo.id}
                                onClick={() => handleComplete(todo.id)}
                                className={`relative flex items-center justify-between p-3 rounded-xl border border-gray-200 group cursor-pointer transition-all duration-300 ease-in-out shadow-sm overflow-hidden
                            ${isAnimating
                                        ? 'bg-green-50 border-green-200 opacity-0 max-h-0 py-0 mb-0 scale-95'
                                        : 'bg-white hover:bg-[#F0FDF4] max-h-20 mb-0'
                                    }
                        `}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors duration-300 ${isAnimating ? 'bg-green-500 border-green-500' : 'border-gray-300 group-hover:border-primary'}`}>
                                        {isAnimating && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                    </div>

                                    <span className={`text-sm font-semibold truncate max-w-[150px] transition-colors ${isAnimating ? 'text-gray-400 line-through' : 'text-[#0F172A]'}`}>
                                        {todo.title}
                                    </span>
                                </div>

                                {dateText && (
                                    <span className="shrink-0 bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
                                        {dateText}
                                    </span>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div
                        onClick={() => navigate(navigateTo)}
                        className="flex-1 flex flex-col items-center justify-center text-center p-4 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-primary/30 transition-all group"
                    >
                        <p className="text-gray-400 text-sm font-medium group-hover:text-primary transition-colors">
                            No Quick Tasks
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            {emptyMessage}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
