import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { server } from "../../main";
import { auth } from "../../firebase/firebase";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { useAuth } from "../../context/AuthContext";
import socket from "../../services/socket.service";

// Icons
import AddIcon from "../../assets/add.svg";

import { useChat } from "../../context/ChatContext";

// ...

export default function AddChat({ 
  onChatAdded, 
  userRole, 
  onFriendAction, 
  highlightUserId, 
  isOpen,       // Controlled mode
  onClose,      // Controlled mode
  hideTrigger   // Option to hide default button
}) {
  const [internalShowModal, setInternalShowModal] = useState(false);
  
  // derived state
  const showModal = isOpen !== undefined ? isOpen : internalShowModal;
  const setShowModal = (val) => {
    if (onClose && !val) onClose();
    if (isOpen === undefined) setInternalShowModal(val);
  };
  
  // ... (rest of state)
  const { user: currentUserInfo, refreshUser } = useAuth();
  const { classmates, fetchClassmates, fetchChats } = useChat(); // Use Context
  
  const [searchTerm, setSearchTerm] = useState("");
  const [manualRegno, setManualRegno] = useState("");
  const [loading, setLoading] = useState(false);
  // Removed local currentUserInfo state which was shadowing auth user

  const syncFriendRelatedState = useCallback(async () => {
    await refreshUser();
    await fetchClassmates();
    await fetchChats();
  }, [refreshUser, fetchClassmates, fetchChats]);

  // ...

  // --- 1. FETCH CLASSMATES ---
  useEffect(() => {
    if (showModal) {
      fetchClassmates(); // Fetch from context (cached)
    }
  }, [showModal, fetchClassmates]);

  useEffect(() => {
    if (!showModal || userRole !== "student") return;

    const handleFriendRealtimeSync = async (event) => {
      if (!event?.type) return;
      if (
        [
          "FRIEND_REQUEST_RECEIVED",
          "FRIEND_REQUEST_ACCEPTED",
          "FRIEND_REQUEST_DECLINED",
          "FRIEND_REMOVED",
        ].includes(event.type)
      ) {
        await syncFriendRelatedState();
      }
    };

    socket.on("event", handleFriendRealtimeSync);
    return () => socket.off("event", handleFriendRealtimeSync);
  }, [showModal, userRole, syncFriendRelatedState]);

  // --- 1.5 FETCH OTHER CONNECTIONS (Cross-Class) ---
  const [otherConnections, setOtherConnections] = useState([]);
  
  useEffect(() => {
      const fetchOtherConnections = async () => {
          if (!currentUserInfo || !showModal) return;

          const { friends = [], friendRequests = {} } = currentUserInfo;
          const { sent = [], received = [] } = friendRequests;

          // 1. Collect all "connection" IDs
          const allConnectionIds = [...new Set([
              ...friends,
              ...sent,
              ...received
          ])];

          // 2. Filter out those who are already Classmates
          // (Classmates are already shown in the top list)
          const classmateIds = classmates.map(c => c._id.toString());
          const otherIds = allConnectionIds.filter(id => !classmateIds.includes(id.toString()));

          if (otherIds.length === 0) {
              setOtherConnections([]);
              return;
          }

          // 3. Fetch Profiles for "Other" IDs
          try {
              const token = await auth.currentUser.getIdToken();
              const { data } = await axios.post(
                  `${server}/friends/get-users`,
                  { userIds: otherIds },
                  { headers: { Authorization: `Bearer ${token}` } }
              );
              setOtherConnections(data);
          } catch (error) {
              console.error("Failed to fetch other connections:", error);
          }
      };

      fetchOtherConnections();
  }, [currentUserInfo, classmates, showModal]);

  // --- 2. START CHAT ---
  const handleStartChat = async (regno) => {
    if (!regno) return;
    setLoading(true);

    try {
      const user = auth.currentUser;
      const token = await user.getIdToken();

      // Refresh user data to ensure friends array is current
      await refreshUser();

      const { data } = await axios.post(
        `${server}/chat/create-by-regno`,
        { regno: regno },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onChatAdded(data);
      setShowModal(false);
      toast.success(`Chat started with ${regno}`);
      setManualRegno("");
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to start chat");
    } finally {
      setLoading(false);
    }
  };

  // --- 4. FRIEND REQUEST ACTIONS ---
  const [friendToRemove, setFriendToRemove] = useState(null);

  const handleSendRequest = async (targetId) => {
      try {
          const user = auth.currentUser;
          const token = await user.getIdToken();
          await axios.post(`${server}/friends/request`, { targetUserId: targetId }, {
               headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Friend request sent!");
          await syncFriendRelatedState();
          setSearchedUser((prev) => (prev && prev._id === targetId ? { ...prev, isSent: true, isReceived: false, isFriend: false } : prev));
      } catch (error) {
          toast.error(error.response?.data?.message || "Failed to send request");
      }
  };

  const handleAcceptRequest = async (senderId) => {
      try {
          const user = auth.currentUser;
          const token = await user.getIdToken();
          await axios.post(`${server}/friends/accept`, { requesterId: senderId }, {
               headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Friend request accepted!");
          await syncFriendRelatedState();
          setSearchedUser((prev) => (prev && prev._id === senderId ? { ...prev, isFriend: true, isSent: false, isReceived: false } : prev));
          onFriendAction && onFriendAction(senderId); // Refresh Parent
      } catch (error) {
          toast.error(error.response?.data?.message || "Failed to accept request");
      }
  };

  const confirmRemoveFriend = async () => {
      if (!friendToRemove) return;
      try {
          const user = auth.currentUser;
          const token = await user.getIdToken();
          await axios.post(`${server}/friends/remove`, { targetId: friendToRemove._id }, {
               headers: { Authorization: `Bearer ${token}` }
          });
          toast.success("Friend removed.");
          await syncFriendRelatedState();
          setSearchedUser((prev) => (prev && prev._id === friendToRemove._id ? { ...prev, isFriend: false, isSent: false, isReceived: false } : prev));
          onFriendAction && onFriendAction(friendToRemove._id); // Refresh Parent
          setFriendToRemove(null);
      } catch (error) {
          toast.error(error.response?.data?.message || "Failed to remove friend");
      }
  };

  // --- 3. FILTER LOGIC ---
  const filteredClassmates = classmates.filter(
    (s) =>
      s.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.profile.regno.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- 5. SEARCH USER (CROSS-CLASS) ---
  const [searchedUser, setSearchedUser] = useState(null);

  const handleSearchUser = async (regno) => {
      if (!regno) return;
      setLoading(true);
      setSearchedUser(null); // Clear previous

      try {
          const user = auth.currentUser;
          const token = await user.getIdToken();
          
          const { data } = await axios.post(`${server}/friends/search`, { regno }, {
              headers: { Authorization: `Bearer ${token}` }
          });
          
          setSearchedUser(data);
      } catch (error) {
          console.error(error);
          toast.error(error.response?.data?.message || "User not found");
      } finally {
          setLoading(false);
      }
  };

  const isTeacher = userRole === 'teacher';

  return (
    <>
      {/* --- TRIGGER BUTTON --- */}
      {/* --- FLOATING ACTION BUTTON (Conditionally Rendered) --- */}
      {!hideTrigger && (
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-3 bg-black text-white rounded-xl flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-sm mb-4">
          <img src={AddIcon} className="w-5 h-5 invert" alt="+" />
          <span className="text-sm font-semibold">New Message</span>
        </button>
      )}

      {/* --- POP-UP MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800">Start a Conversation</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-red-500 text-2xl leading-none">
                &times;
              </button>
            </div>

            <div className="p-4 flex flex-col space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder={isTeacher ? "Search teachers..." : "Search classmates..."}
                  className="w-full bg-gray-100 rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="absolute left-3 top-2.5 opacity-40">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>

              {/* Classmates List (LIMITED HEIGHT NOW) */}
              {/* Classmates List (LIMITED HEIGHT NOW) */}
              <div className="max-h-80 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block px-2">
                   {isTeacher ? "Your Department" : "Your Class"}
                </label>

                {filteredClassmates.length === 0 ? (
                  <div className="text-center text-gray-400 text-xs py-8">
                    {searchTerm ? "No results found." : (isTeacher ? "No other teachers found." : "No classmates found.")}
                  </div>
                ) : (
                  filteredClassmates.map((student) => {
                    // FRIENDSHIP LOGIC - Robust String Comparison
                    const sId = student._id.toString(); // Ensure string
                    
                    const isFriend = currentUserInfo?.friends?.some(id => id.toString() === sId);
                    const isSent = currentUserInfo?.friendRequests?.sent?.some(id => id.toString() === sId);
                    const isReceived = currentUserInfo?.friendRequests?.received?.some(id => id.toString() === sId);
                    
                    const showChatButton = isTeacher || userRole === 'teacher'; 

                    const isHighlighted = highlightUserId === student._id;
                    return (
                      <div
                        key={student._id}
                        id={`user-${student._id}`}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group justify-between ${
                          isHighlighted 
                            ? 'bg-green-100 border-2 border-green-500 shadow-xl scale-105' 
                            : 'hover:bg-blue-50'
                        }`}>
                        
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-700 overflow-hidden border border-gray-100 shrink-0">
                            <img 
                              src={getAvatarUrl(student.profile.avatar || 11)} 
                              className="w-full h-full object-cover" 
                              alt={student.profile.name}
                              onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerText=student.profile.name?.[0]}}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-800 truncate">
                              {student.profile.name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">
                              {student.profile.regno}
                            </p>
                          </div>
                        </div>

                        {/* ACTION BUTTONS */}
                        {showChatButton ? (
                             <button
                               onClick={() => handleStartChat(student.profile.regno)}
                               disabled={loading}
                               className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors shrink-0">
                               Chat
                             </button>
                        ) : (
                            /* STUDENT FRIEND LOGIC */
                            <div className="shrink-0">
                                {isFriend ? (
                                     <div className="flex gap-2">
                                        <button
                                          onClick={() => handleStartChat(student.profile.regno)}
                                          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                                          Chat
                                        </button>
                                        <button
                                          onClick={() => setFriendToRemove(student)}
                                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                                          Unfriend
                                        </button>
                                     </div>
                                ) : isSent ? (
                                    <button
                                      disabled
                                      className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 cursor-not-allowed">
                                      Requested
                                    </button>
                                ) : isReceived ? (
                                     <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAcceptRequest(student._id)}
                                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                                          Accept
                                        </button>
                                     </div>
                                ) : (
                                    <button
                                      onClick={() => handleSendRequest(student._id)}
                                      className="text-xs bg-white border border-black text-black px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                      Add Friend
                                    </button>
                                )}
                            </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* OTHER CONNECTIONS (Cross-Class) - STUDENTS ONLY */}
              {!isTeacher && otherConnections.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2 mt-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block px-2">
                       Other Connections
                    </label>
                    {otherConnections.map((student) => {
                         const isFriend = student.isFriend;
                         const isSent = student.isSent;
                         const isReceived = student.isReceived;
                         const isHighlighted = highlightUserId === student._id;

                         return (
                           <div
                             key={student._id}
                             id={`user-${student._id}`}
                             className={`w-full flex items-center gap-3 p-2 rounded-lg transition-all text-left group justify-between ${
                               isHighlighted 
                                 ? 'bg-green-100 border-2 border-green-500 shadow-xl scale-105' 
                                 : 'hover:bg-blue-50'
                             }`}>
                             
                             <div className="flex items-center gap-3 overflow-hidden">
                               <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-700 overflow-hidden border border-gray-100 shrink-0">
                                 <img 
                                   src={getAvatarUrl(student.profile.avatar || 11)} 
                                   className="w-full h-full object-cover" 
                                   alt={student.profile.name}
                                   onError={(e) => {e.target.style.display='none'; e.target.parentElement.innerText=student.profile.name?.[0]}}
                                 />
                               </div>
                               <div className="min-w-0">
                                 <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-800 truncate">
                                   {student.profile.name}
                                 </p>
                                 <p className="text-[10px] text-gray-400 truncate">
                                   {student.profile.regno}
                                 </p>
                               </div>
                             </div>

                             {/* ACTION BUTTONS */}
                             <div className="shrink-0">
                                {isFriend ? (
                                     <div className="flex gap-2">
                                        <button
                                          onClick={() => handleStartChat(student.profile.regno)}
                                          className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                                          Chat
                                        </button>
                                        <button
                                          onClick={() => setFriendToRemove(student)}
                                          className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-100 transition-colors">
                                          Unfriend
                                        </button>
                                     </div>
                                ) : isSent ? (
                                    <button
                                      disabled
                                      className="text-xs bg-gray-100 text-gray-400 px-3 py-1.5 rounded-lg border border-gray-200 cursor-not-allowed">
                                      Requested
                                    </button>
                                ) : isReceived ? (
                                     <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAcceptRequest(student._id)}
                                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                                          Accept
                                        </button>
                                     </div>
                                ) : (
                                    <button
                                      onClick={() => handleSendRequest(student._id)}
                                      className="text-xs bg-white border border-black text-black px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                      Add Friend
                                    </button>
                                )}
                             </div>
                           </div>
                         );
                    })}
                  </div>
              )}

{/* Manual Input Footer */}
              <div className="pt-3 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                  {isTeacher ? "Find Teacher (Other Departments)" : "Find Someone from Another Class"}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Reg No (e.g. 212BCA05)"
                    className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={manualRegno}
                    onChange={(e) => setManualRegno(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSearchUser(manualRegno);
                    }}
                  />
                  <button
                    onClick={() => handleSearchUser(manualRegno)}
                    disabled={loading || !manualRegno}
                    className="bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                    Search
                  </button>
                </div>
              
                {/* SEARCH RESULTS AREA */}
                {searchedUser && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 overflow-hidden">
                                     <img 
                                        src={getAvatarUrl(searchedUser.profile.avatar || 11)} 
                                        className="w-full h-full object-cover" 
                                        alt={searchedUser.profile.name}
                                     />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-gray-800">{searchedUser.profile.name}</h4>
                                    <p className="text-xs text-gray-500">{searchedUser.profile.regno}</p> 
                                </div>
                            </div>

                            {/* DYNAMIC ACTION BUTTON */}
                            {isTeacher || searchedUser.isFriend ? (
                                <button
                                    onClick={() => handleStartChat(searchedUser.profile.regno)}
                                    className="text-xs bg-black text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
                                    Chat
                                </button>
                            ) : searchedUser.isSent ? (
                                <button disabled className="text-xs bg-gray-200 text-gray-500 px-3 py-1.5 rounded-lg cursor-not-allowed">
                                    Requested
                                </button>
                            ) : searchedUser.isReceived ? (
                                <button 
                                    onClick={() => handleAcceptRequest(searchedUser._id)}
                                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                                    Accept
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleSendRequest(searchedUser._id)}
                                    className="text-xs bg-white border border-black text-black px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                                    Add Friend
                                </button>
                            )}
                        </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODAL (Z-INDEX 60) --- */}
      {friendToRemove && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 flex flex-col items-center text-center animate-in fade-in zoom-in duration-200">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="23" y1="11" x2="17" y2="11"></line></svg>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-2">Unfriend {friendToRemove.profile.name}?</h3>
                  <p className="text-sm text-gray-500 mb-6">Are you sure you want to remove this friend? You will need to send a request again to chat.</p>
                  
                  <div className="flex gap-3 w-full">
                      <button 
                          onClick={() => setFriendToRemove(null)}
                          className="flex-1 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                          Cancel
                      </button>
                      <button 
                          onClick={confirmRemoveFriend}
                          className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                          Yes, Unfriend
                      </button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
}
