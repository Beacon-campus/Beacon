import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useChat } from "../../context/ChatContext";
import { useProject } from "../../context/ProjectContext";
import GroupChatWindow from "./GroupChatWindow";
import GroupInfoModal from "./GroupInfoModal";
import CreateGroupModal from "./CreateGroupModal";

export default function Groups() {
    const { secondaryChats } = useChat();
    const { groupMessages, groupPages, fetchGroupMessages, loadOlderGroupMessages } = useProject();

    const [activeGroupId, setActiveGroupId] = useState(null);
    const [showInfo, setShowInfo] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [isCompactView, setIsCompactView] = useState(() => window.innerWidth < 769);

    const projects = useMemo(() =>
        (secondaryChats || []).filter(c => c.type === 'project_group'),
        [secondaryChats]);

    const activeGroup = useMemo(() =>
        projects.find(p => p._id === activeGroupId),
        [projects, activeGroupId]);

    useEffect(() => {
        if (activeGroupId) fetchGroupMessages(activeGroupId);
    }, [activeGroupId, fetchGroupMessages]);

    // --- OPTIMIZATION: Real-time Timer Tick ---
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsCompactView(window.innerWidth < 769);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const getDeadlineStatus = useCallback((deadlineStr) => {
        if (!deadlineStr) return null;
        const now = new Date();
        const end = new Date(deadlineStr);
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { label: "⚠️ Expired", color: "text-red-500 font-black" };
        if (diffDays === 0) return { label: "🔥 Expires Today", color: "text-red-600 animate-pulse font-black" };
        if (diffDays === 1) return { label: "⏰ Tomorrow", color: "text-orange-600 font-black" };

        return {
            label: `${diffDays} days left`,
            color: diffDays <= 3 ? "text-orange-500 font-bold" : "text-gray-400 font-medium"
        };
    }, [tick]);

    const showListPane = !isCompactView || !activeGroupId;
    const showChatPane = !isCompactView || !!activeGroupId;

    return (
        <div className="flex w-full h-full bg-white overflow-hidden min-[769px]:rounded-2xl min-[769px]:border min-[769px]:border-gray-100 min-[769px]:shadow-sm">

            {/* SIDEBAR: Project List */}
            <div className={`${showListPane ? "flex" : "hidden"} ${isCompactView ? "w-full" : "w-80"} border-r border-gray-100 flex-col bg-gray-50/20`}>
                <div className="px-4 py-4 min-[426px]:px-5 min-[426px]:py-5 min-[769px]:p-6 border-b border-gray-100 flex justify-between items-center bg-white">
                    <h2 className="text-[24px] min-[769px]:text-lg font-black text-[#0F172A] min-[769px]:text-gray-800 tracking-tight min-[769px]:uppercase min-[769px]:tracking-tighter">Groups</h2>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="group/plus w-9 h-9 bg-transparent border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover/plus:rotate-90"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 min-[426px]:px-5 min-[426px]:py-5 min-[769px]:p-4 space-y-2 no-scrollbar">
                    {projects.length === 0 ? (
                        <div className="text-center py-12 opacity-30">
                            <div className="w-12 h-12 rounded-full bg-gray-200 mx-auto mb-3 flex items-center justify-center text-xl">📁</div>
                            <p className="text-[10px] font-bold uppercase tracking-widest">No active projects</p>
                        </div>
                    ) : (
                        projects.map(p => {
                            const status = getDeadlineStatus(p.deadline);
                            const hasFaculty = p.participants?.some(part => part.role === 'teacher');
                            const isSelected = activeGroupId === p._id;

                            return (
                                <div
                                    key={p._id}
                                    onClick={() => setActiveGroupId(p._id)}
                                    className={`p-4 cursor-pointer transition-all border border-transparent rounded-2xl ${isSelected
                                            ? "bg-[#F0FDF4] border-[#059669] shadow-sm font-medium"
                                            : "hover:bg-gray-50 border-b border-b-gray-100"
                                        }`}
                                >
                                    <div className="flex justify-start items-center mb-1.5 gap-2">
                                        <h4 className={`text-sm font-[600] truncate ${isSelected ? "text-[#1F2937]" : "text-gray-700"}`}>
                                            {p.name}
                                        </h4>
                                        {hasFaculty && (
                                            <span className="shrink-0 text-[7px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-md font-black tracking-widest border border-indigo-100">
                                                FACULTY
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-medium text-gray-500 uppercase tracking-widest truncate">
                                        Goal: {p.goal}
                                    </p>

                                    {/* Real-time Status/Timer Badge */}
                                    {status && (
                                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-1.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${status.color.split(' ')[0].replace('text', 'bg')}`} />
                                            <span className={`text-[9px] uppercase tracking-tighter ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* MAIN CONTENT: Chat Area */}
            <div className={`${showChatPane ? "flex" : "hidden"} flex-1 flex-col bg-white`}>
                {!activeGroupId ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center select-none gap-6">
                        <div className="text-[80px] opacity-60 hover:opacity-100 hover:scale-110 transition-all duration-500 cursor-default">
                            🚀
                        </div>
                        <div className="flex flex-col items-center gap-2">
                            <h2 className="text-2xl font-[600] text-gray-500 uppercase tracking-tighter">Mission Control</h2>
                            <p className="text-sm font-[500] text-gray-400 uppercase tracking-widest max-w-[250px] leading-relaxed">
                                Pick a project to sync with your team.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <div
                            className="shrink-0 h-[72px] min-[769px]:h-[76px] bg-white border-b border-gray-100 flex items-center px-4 min-[426px]:px-5 min-[769px]:px-6 cursor-pointer group"
                            onClick={() => setShowInfo(true)}
                        >
                            {isCompactView && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setActiveGroupId(null); }}
                                    className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100 transition-colors shrink-0"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                </button>
                            )}
                            <div className="w-11 h-11 rounded-2xl bg-gray-50 flex items-center justify-center border-2 border-black/5 shadow-inner shrink-0 transition-transform group-hover:scale-105">
                                <span className="font-black text-black/30 text-sm uppercase">
                                    {activeGroup?.name?.[0]}
                                </span>
                            </div>
                            <div className="flex flex-col ml-4 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h2 className="text-sm font-black text-gray-800 leading-tight truncate group-hover:text-black transition-colors">
                                        {activeGroup?.name}
                                    </h2>
                                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[9px] text-gray-400 font-serif font-bold italic shrink-0 transition-all group-hover:border-black group-hover:text-black">i</div>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider group-hover:text-gray-700 transition-colors">
                                        {activeGroup?.participants?.length} Members
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider truncate group-hover:text-gray-700 transition-colors">
                                        Goal: {activeGroup?.goal}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <GroupChatWindow
                            messages={groupMessages[activeGroupId] || []}
                            groupId={activeGroupId}
                            group={activeGroup}
                            hasMoreOlder={Boolean(groupPages[activeGroupId]?.hasMore)}
                            isLoadingOlder={Boolean(groupPages[activeGroupId]?.loadingOlder)}
                            onLoadOlder={() => loadOlderGroupMessages(activeGroupId)}
                        />
                    </>
                )}
            </div>

            {/* MODALS */}
            {showCreate && (
                <CreateGroupModal
                    isOpen={showCreate}
                    onClose={() => setShowCreate(false)}
                />
            )}
            {showInfo && activeGroup && (
                <GroupInfoModal
                    isOpen={showInfo}
                    onClose={() => setShowInfo(false)}
                    group={activeGroup}
                />
            )}
        </div>
    );
}
