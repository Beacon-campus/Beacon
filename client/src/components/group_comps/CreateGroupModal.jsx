import React, { useState, useMemo, useEffect } from "react";
import Modal from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";
import { useChat } from "../../context/ChatContext";
import { getAvatarUrl } from "../../utils/avatarUtils";
import UserListItem from "../shared/UserListItem";
import axios from "axios";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import { toast } from "react-hot-toast";

export default function CreateGroupModal({ isOpen, onClose }) {
    const { user: currentUser } = useAuth();
    const { fetchChats, classmates, fetchClassmates } = useChat();

    const [name, setName] = useState("");
    const [goal, setGoal] = useState("");
    const [deadline, setDeadline] = useState("");
    const [regnoInput, setRegnoInput] = useState("");
    const [listSearch, setListSearch] = useState("");
    const [teammates, setTeammates] = useState([]); // Stores RegNos
    const [loading, setLoading] = useState(false);

    // Ensure classmates are loaded when modal opens
    useEffect(() => {
        if (isOpen) fetchClassmates(true);
    }, [isOpen, fetchClassmates]);

    // 1. FILTER QUICK-ADD LIST
    const filteredQuickAdd = useMemo(() => {
        if (!classmates) return [];
        return classmates.filter(item => {
            const search = listSearch.toLowerCase();
            const matchesSearch = item.profile.name.toLowerCase().includes(search) ||
                item.profile.regno.toLowerCase().includes(search);
            return matchesSearch;
        });
    }, [classmates, listSearch]);

    // 2. TOGGLE TEAMMATE LOGIC
    const toggleTeammate = (regno) => {
        const upperReg = regno.toUpperCase();
        if (teammates.includes(upperReg)) {
            setTeammates(teammates.filter(t => t !== upperReg));
        } else {
            setTeammates([...teammates, upperReg]);
        }
    };

    const handleManualAdd = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            e.preventDefault();
            if (!regnoInput.trim()) return;
            toggleTeammate(regnoInput.trim());
            setRegnoInput("");
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name || !goal || !deadline) return toast.error("Please fill all group details");

        setLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const payload = { name, goal, deadline, regnos: teammates };

            await axios.post(`${server}/chat/create-group`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success("Project Group Created!");
            fetchChats();
            onClose();
        } catch (err) {
            toast.error("Failed to create group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full !rounded-[30px] bg-white overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 pb-4 shrink-0">
                <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">Launch Project Team</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Project Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Final Year App" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Project Deadline</label>
                        <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none" />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Mission Goal</label>
                    <input type="text" value={goal} onChange={e => setGoal(e.target.value)} placeholder="What is the final result?" className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm focus:outline-none mb-4" />
                </div>
            </div>

            {/* SELECTION AREA */}
            <div className="flex-1 overflow-hidden flex flex-col px-8">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Add Teammates ({teammates.length})</label>
                    <div className="flex gap-2 w-1/2">
                        <input type="text" value={regnoInput} onKeyDown={handleManualAdd} onChange={e => setRegnoInput(e.target.value)} placeholder="Manual Reg No." className="flex-1 bg-gray-100 border-none rounded-xl px-3 py-2 text-xs focus:ring-0" />
                        <button onClick={handleManualAdd} className="bg-[#0F172A] text-white px-3 py-2 rounded-xl text-xs font-black">+</button>
                    </div>
                </div>

                {/* Search Quick List */}
                <div className="mb-4">
                    <input type="text" value={listSearch} onChange={e => setListSearch(e.target.value)} placeholder="Search faculty or peers..." className="w-full bg-gray-50 border-b border-gray-100 p-2 text-sm focus:outline-none" />
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto space-y-1 mb-4 custom-scrollbar">
                    {filteredQuickAdd.map(item => {
                        const isSelected = teammates.includes(item.profile.regno.toUpperCase());
                        return (
                            <UserListItem
                                key={item._id}
                                user={item}
                                isSelected={isSelected}
                                onClick={() => toggleTeammate(item.profile.regno)}
                            />
                        );
                    })}
                </div>
            </div>

            <div className="p-8 pt-4 shrink-0 bg-gray-50/50">
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-800 transition-colors">Discard</button>
                    <button type="button" onClick={handleCreate} disabled={loading || teammates.length === 0} className="flex-1 py-4 bg-[#0F172A] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-[#0F172A]/10 transition-all hover:scale-[1.02] disabled:opacity-20 disabled:hover:scale-100">
                        {loading ? "Launching..." : "Confirm Group"}
                    </button>
                </div>
            </div>
        </Modal>
    );
}