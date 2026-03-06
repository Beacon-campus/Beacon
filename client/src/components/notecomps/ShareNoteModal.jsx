import React, { useEffect, useMemo, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatarUtils';
import socket from '../../services/socket.service';
import { auth } from '../../firebase/firebase';
import { toast } from 'react-hot-toast';

export default function ShareNoteModal({ note, onClose }) {
    const { user } = useAuth();
    const { secondaryChats, classmates, chats } = useChat();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTargets, setSelectedTargets] = useState([]);
    const [loading, setLoading] = useState(false);

    const isTeacher = user?.role === 'teacher';
    const [activeCategory, setActiveCategory] = useState('friends');

    useEffect(() => {
        setActiveCategory(isTeacher ? 'peers' : 'friends');
    }, [isTeacher]);

    // 1) Peer/Friend recipients using same role split as chat
    const peerUsers = useMemo(() => {
        if (!user || !Array.isArray(classmates)) return [];

        if (isTeacher) {
            return classmates.filter((c) => c.role === 'teacher' && String(c._id) !== String(user._id));
        }

        const friendIds = (user.friends || []).map((id) => String(id));
        return classmates.filter((c) => friendIds.includes(String(c._id)));
    }, [classmates, isTeacher, user]);

    // 2) Classroom channels aligned to community logic
    const communityChannels = useMemo(() => {
        if (!Array.isArray(secondaryChats)) return [];

        if (isTeacher) {
            const uniqueByClassroom = new Map();
            secondaryChats
                .filter((c) => c.type === 'classroom' && c.classroomMode === 'official' && c.classroomId)
                .forEach((channel) => {
                    const key = String(channel.classroomId);
                    if (!uniqueByClassroom.has(key)) uniqueByClassroom.set(key, channel);
                });
            return Array.from(uniqueByClassroom.values());
        }

        const primaryEnrolledClassroomId = user?.enrolledClassroomIds?.[0];
        const resolvedPrimaryId = primaryEnrolledClassroomId
            ? String(typeof primaryEnrolledClassroomId === 'object' && primaryEnrolledClassroomId?._id
                ? primaryEnrolledClassroomId._id
                : primaryEnrolledClassroomId)
            : null;

        const raw = secondaryChats.filter(
            (c) =>
                c.type === 'classroom' &&
                c.classroomMode === 'unofficial' &&
                c.classroomId &&
                (!resolvedPrimaryId || String(c.classroomId) === resolvedPrimaryId)
        );

        const uniqueByClassroom = new Map();
        raw.forEach((channel) => {
            const key = String(channel.classroomId);
            if (!uniqueByClassroom.has(key)) uniqueByClassroom.set(key, channel);
        });

        return Array.from(uniqueByClassroom.values());
    }, [isTeacher, secondaryChats, user]);

    // 3) Groups
    const groupChannels = useMemo(() => {
        if (!Array.isArray(secondaryChats)) return [];
        return secondaryChats.filter((c) => c.type === 'project_group');
    }, [secondaryChats]);

    const filteredItems = useMemo(() => {
        let items = [];
        if (activeCategory === 'friends' || activeCategory === 'peers') items = peerUsers;
        if (activeCategory === 'official') items = communityChannels;
        if (activeCategory === 'groups') items = groupChannels;

        if (!searchTerm) return items;
        const lower = searchTerm.toLowerCase();
        return items.filter((i) => {
            const name = i.name || i.profile?.name || '';
            const regno = i.profile?.regno || '';
            return name.toLowerCase().includes(lower) || regno.toLowerCase().includes(lower);
        });
    }, [activeCategory, communityChannels, groupChannels, peerUsers, searchTerm]);

    const toggleSelection = (item) => {
        setSelectedTargets((prev) => {
            const itemId = item._id;
            const isSelected = prev.some((t) => t.id === itemId);

            if (isSelected) {
                return prev.filter((t) => t.id !== itemId);
            }
            return [
                ...prev,
                {
                    id: itemId,
                    type: activeCategory === 'friends' || activeCategory === 'peers' ? 'dm' : 'channel',
                    name: item.name || item.profile?.name,
                    data: item,
                },
            ];
        });
    };

    const handleShare = async () => {
        if (selectedTargets.length === 0) return;
        setLoading(true);

        try {
            const promises = selectedTargets.map(async (target) => {
                let channelId = target.id;

                if (target.type === 'dm') {
                    const existingChat = (chats || []).find((c) => c.participants.some((p) => String(p._id) === String(target.id)));

                    if (existingChat) {
                        channelId = existingChat._id;
                    } else {
                        return;
                    }
                }

                const payload = {
                    channelId,
                    text: 'Shared a note: ' + note.title,
                    type: 'note',
                    noteData: {
                        id: note.id,
                        title: note.title,
                        content: note.content,
                        color: note.color,
                        sharedBy: user.profile?.name || 'User',
                        sharedById: user._id,
                        sharedByUid: auth.currentUser?.uid,
                        watermark: note.watermark || null,
                    },
                    senderId: user._id,
                    senderProfile: user.profile,
                    firebaseUid: auth.currentUser?.uid,
                    time: new Date().toISOString(),
                };

                socket.emit('send_message', payload);
            });

            await Promise.all(promises);
            toast.success(`Shared with ${selectedTargets.length} recipients`);
            onClose();
        } catch (e) {
            console.error('Share failed:', e);
            toast.error('Failed to share');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight">Share Note</h3>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider line-clamp-1">{note.title || 'Untitled Note'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="flex p-2 bg-gray-50/50 gap-1 overflow-x-auto border-b border-gray-100">
                    {[
                        { id: isTeacher ? 'peers' : 'friends', label: isTeacher ? 'Peers' : 'Friends' },
                        { id: 'official', label: isTeacher ? 'Official' : 'Student Hub' },
                        { id: 'groups', label: 'Groups' },
                    ].map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                activeCategory === cat.id ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    <div className="relative group">
                        <input
                            className="w-full bg-gray-100 border-2 border-transparent rounded-xl px-4 py-3 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:border-black/5 focus:bg-white transition-all"
                            placeholder="Search by name or reg no..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5 custom-scrollbar">
                    {filteredItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-300">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-20"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                            <p className="text-[10px] font-bold uppercase tracking-widest">No results found</p>
                        </div>
                    ) : (
                        filteredItems.map((item) => {
                            const itemId = item._id;
                            const isSelected = selectedTargets.some((t) => t.id === itemId);
                            const name = item.name || item.profile?.name;
                            const subtitle = item.type === 'project_group' ? 'Group' : item.profile?.regno || 'Channel';
                            const avatar = item.profile?.avatar || 11;

                            return (
                                <div
                                    key={itemId}
                                    onClick={() => toggleSelection(item)}
                                    className={`flex items-center gap-4 p-3 rounded-2xl cursor-pointer transition-all border-2 ${
                                        isSelected ? 'bg-black/5 border-black/10' : 'hover:bg-gray-50 border-transparent'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                        isSelected ? 'bg-black border-black scale-110' : 'border-gray-200 group-hover:border-gray-300'
                                    }`}>
                                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>

                                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                                        {item.profile ? (
                                            <img src={getAvatarUrl(avatar)} className="w-full h-full object-cover" alt={name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-white font-black text-xs">
                                                {name?.[0]}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-gray-800 text-sm truncate leading-tight">{name}</h4>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate mt-0.5">{subtitle}</p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-white rounded-b-2xl">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">
                            {selectedTargets.length} Selected
                        </span>
                    </div>
                    <button
                        onClick={handleShare}
                        disabled={selectedTargets.length === 0 || loading}
                        className="bg-black text-white px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 shadow-xl shadow-black/10"
                    >
                        {loading ? 'Sending...' : 'Confirm Share'}
                    </button>
                </div>
            </div>
        </div>
    );
}
