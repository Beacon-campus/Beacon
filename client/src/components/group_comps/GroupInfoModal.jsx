import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "../ui/Modal";
import { getAvatarUrl } from "../../utils/avatarUtils";
import UserListItem from "../shared/UserListItem";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import { toast } from "react-hot-toast";

export default function GroupInfoModal({ isOpen, onClose, group }) {
  const { user: currentUser } = useAuth();
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fullData, setFullData] = useState(null);

  const normalizeId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return String(value._id || value.id || "");
    return String(value);
  };

  const adminId = normalizeId(fullData?.admin?._id || fullData?.admin || group?.admin);
  const isAdmin = normalizeId(currentUser?._id) === adminId;

  useEffect(() => {
    if (isOpen && group?._id) fetchDetails();
  }, [isOpen, group]);

  useEffect(() => {
    if (!isAdmin && isEditing) {
      setIsEditing(false);
    }
  }, [isAdmin, isEditing]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const token = await auth.currentUser.getIdToken();
      const { data } = await axios.get(`${server}/chat/group/details/${group._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFullData(data);
      setDescription(data.description || "Project collaboration space.");
      setDeadline(data.deadline || "");
    } catch (error) {
      console.error("Failed to fetch group details", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransferAdmin = async (targetUserId) => {
    if (!isAdmin) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.put(`${server}/chat/group/admin`,
        { groupId: group._id, userId: targetUserId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Admin ownership transferred");
      setIsEditing(false);
      fetchDetails();
    } catch (err) {
      toast.error("Transfer failed");
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) return;
    try {
      const token = await auth.currentUser.getIdToken();
      await axios.put(`${server}/chat/group/settings`,
        { channelId: group._id, description, deadline },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEditing(false);
      toast.success("Project updated");
    } catch (err) {
      toast.error("Update failed");
    }
  };

  if (!group) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full bg-white !rounded-[30px] overflow-hidden flex flex-col max-h-[90vh]">
      <div className="h-24 w-full bg-indigo-50 relative shrink-0">
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 p-1.5 bg-white rounded-full shadow-md">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
            <span className="font-black text-indigo-400 text-xl uppercase">{group.name?.[0]}</span>
          </div>
        </div>
      </div>

      <div className="pt-10 pb-4 px-6 text-center shrink-0">
        <h2 className="text-lg font-black text-gray-800 tracking-tight leading-tight">{group.name}</h2>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Project Group • {fullData?.participants?.length || 0} Members</p>
      </div>

      <div className="px-6 mb-4 shrink-0">
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Goal & Deadline</h3>
            {isAdmin && !isEditing && (
              <button onClick={() => setIsEditing(true)} className="text-[10px] font-black text-indigo-600 uppercase">Edit</button>
            )}
          </div>

          {isEditing && isAdmin ? (
            <div className="space-y-3">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl p-3 text-xs focus:outline-none focus:ring-4 focus:ring-black/5 resize-none" rows={2} />
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full bg-white border border-gray-100 rounded-xl p-3 text-xs focus:outline-none" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="text-[10px] font-bold text-gray-400">Cancel</button>
                <button onClick={handleSaveSettings} className="bg-black text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase shadow-lg">Save</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600 leading-relaxed font-medium mb-3">{description}</p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Target:</span>
                <span className="text-[10px] font-black text-red-500 uppercase tracking-tighter">{deadline || "No Date Set"}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 mb-4 custom-scrollbar">
        <h3 className="text-[10px] font-black text-gray-400 uppercase mb-3 sticky top-0 bg-white py-2 z-10 border-b border-gray-50">Team Members</h3>
        <div className="space-y-3">
          {fullData?.participants?.map(member => (
            <UserListItem
              key={member._id}
              user={member}
              badgeText={normalizeId(member._id) === adminId ? "Admin" : null}
              badgeColor="gray"
              actionLabel={isAdmin && normalizeId(member._id) !== adminId ? "Promote" : null}
              onActionClick={isAdmin && normalizeId(member._id) !== adminId ? () => handleTransferAdmin(member._id) : null}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}
