import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import socket from "../services/socket.service";
import axios from "axios";
import { server } from "../main";
import { auth } from "../firebase/firebase";
import { getOrFetchPageCache } from "../services/pageCache.service";
import notifSound from "../assets/sounds/notif.mp3";
import ChatContext from "./ChatContext"; 

export function ChatProvider({ children }) {
  const { user } = useAuth();
  
  // MAIN STATE
  const [chats, setChats] = useState([]); 
  const [secondaryChats, setSecondaryChats] = useState([]); 
  
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classmates, setClassmates] = useState([]); 
  const [messageCache, setMessageCache] = useState({}); 
  const [onlineUsers, setOnlineUsers] = useState([]); 
  const [typingUsers, setTypingUsers] = useState([]); 
  
  const activeChatRef = useRef(activeChat);

  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // --- HELPERS ---
  const getMessagePreview = useCallback((msg) => {
    if (msg.isDeleted) return "🚫 This message was deleted";
    if (msg.gif) return "📷 GIF";
    if (msg.noteTitle) return `📝 ${msg.noteTitle}`;
    return msg.text || "Message";
  }, []);

  const resolveChatChannelId = useCallback((chat) => {
    if (!chat) return null;
    if (chat.isTeacherChat && chat.channelId) return chat.channelId;
    return chat._id || null;
  }, []);

  const chatMatchesChannelId = useCallback((chat, channelId) => {
    if (!chat || !channelId) return false;
    return chat._id === channelId || chat.channelId === channelId;
  }, []);

  const normalizeId = useCallback((value) => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value._id) return String(value._id);
      if (value.id) return String(value.id);
    }
    return String(value);
  }, []);

  // --- ACTIONS ---
  const fetchChats = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return; 
      const token = await currentUser.getIdToken();
      const userKey = currentUser.uid || user?.uid || "guest";

      const data = await getOrFetchPageCache(
        "chat:my-channels",
        userKey,
        async () => {
          const response = await axios.get(`${server}/chat/my-channels`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          return response.data;
        },
        { ttlMs: 60_000 }
      );

      setChats([...(data?.peers || []), ...(data?.teacherChats || [])]);
      setSecondaryChats(data?.secondary || []);
      
      return [...(data?.peers || []), ...(data?.teacherChats || [])];
    } catch (error) {
      console.error("ChatContext: Error fetching chats", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (channelId, forceSidebarUpdate = false) => {
      if (!user || !channelId) return;
      
      if (!forceSidebarUpdate && messageCache[channelId]) return;

      try {
          const token = await auth.currentUser.getIdToken();
          const { data } = await axios.get(`${server}/chat/messages/${channelId}`, {
              headers: { Authorization: `Bearer ${token}` }
          });

          const currentUserId = auth.currentUser.uid; 
          
          const filteredData = data.filter(msg => {
               if (!msg.deletedFor || msg.deletedFor.length === 0) return true;
               const deletedForIds = msg.deletedFor.map(id => typeof id === 'string' ? id : id.toString());
               return !deletedForIds.includes(user._id.toString());
          });

          const processed = filteredData.map(msg => {
              let isMe = false;
              if (msg.sender?.firebaseUid && currentUserId) {
                  isMe = msg.sender.firebaseUid === currentUserId;
              } else if (msg.sender?._id && user._id) {
                  isMe = msg.sender._id.toString() === user._id.toString();
              } else if (typeof msg.sender === 'string' && user._id) {
                  isMe = msg.sender === user._id.toString();
              }
              
              const senderProfile = msg.sender?.profile || {};
              const senderName = senderProfile.name || "User";
              
              return {
                  ...msg,
                  isMe,
                  sender: {
                      ...msg.sender,
                      profile: {
                          ...senderProfile,
                          name: senderName
                      }
                  },
                  text: msg.isDeleted ? "🚫 This message was deleted" : msg.text
              };
          });

          setMessageCache(prev => ({
              ...prev,
              [channelId]: processed
          }));

          if (processed.length > 0) {
              const lastMsg = processed[processed.length - 1];
              
              if (lastMsg.isDeleted || forceSidebarUpdate) {
                   let previewText = lastMsg.text || "Message";
                   if (lastMsg.isDeleted) previewText = "🚫 This message was deleted";
                   else if (lastMsg.noteTitle) previewText = `📝 ${lastMsg.noteTitle}`;
                   else if (lastMsg.gif) previewText = "🎬 GIF";

                   const updateSidebarArray = (prevChats) => {
                       const idx = prevChats.findIndex(c => chatMatchesChannelId(c, channelId));
                       if (idx === -1) return prevChats;
                       
                       const updatedChat = {
                           ...prevChats[idx],
                           lastMessage: {
                               ...prevChats[idx].lastMessage,
                               text: previewText,
                               isDeleted: lastMsg.isDeleted || false,
                               sender: lastMsg.sender?._id || lastMsg.sender,
                               sentAt: lastMsg.sentAt,
                               gif: lastMsg.gif || null,
                               noteTitle: lastMsg.noteTitle || null
                           }
                       };
                       
                       const newArray = [...prevChats];
                       newArray[idx] = updatedChat;
                       return newArray;
                   };
                   
                   setChats(prev => updateSidebarArray(prev));
                   setSecondaryChats(prev => updateSidebarArray(prev));
              }
          } else if (forceSidebarUpdate && processed.length === 0) {
                 const updateSidebarArray = (prevChats) => {
                     const idx = prevChats.findIndex(c => chatMatchesChannelId(c, channelId));
                     if (idx === -1) return prevChats;
                     
                     const updatedChat = {
                         ...prevChats[idx],
                         lastMessage: {
                             text: "No messages yet",
                             sender: null,
                             sentAt: null
                         }
                     };
                     
                     const newArray = [...prevChats];
                     newArray[idx] = updatedChat;
                     return newArray;
                 };
                 setChats(prev => updateSidebarArray(prev));
                 setSecondaryChats(prev => updateSidebarArray(prev));
          }

      } catch (error) {
          console.error("ChatContext: Error fetching messages", error);
      }
  }, [user, messageCache, chatMatchesChannelId]);

  const markAsRead = useCallback(async (channelId) => {
      try {
          const currentUser = auth.currentUser;
          if (!currentUser) return;
          const token = await currentUser.getIdToken();
          await axios.post(`${server}/chat/mark-read`, 
              { channelId },
              { headers: { Authorization: `Bearer ${token}` } }
          );
          
          setChats(prev => prev.map(c => 
              chatMatchesChannelId(c, channelId) ? { ...c, unreadCount: 0 } : c
          ));
          setSecondaryChats(prev => prev.map(c => 
              chatMatchesChannelId(c, channelId) ? { ...c, unreadCount: 0 } : c
          ));
          
      } catch (e) {
          console.error("ChatContext: Failed to mark read", e);
      }
  }, [chatMatchesChannelId]);

  const emitTypingStart = useCallback((channelId) => {
      if (!user || !channelId) return;
      socket.emit("typing_start", { 
          channelId, 
          userId: user._id,
          userName: user.profile?.name 
      });
  }, [user]);

  const emitTypingEnd = useCallback((channelId) => {
      if (!user || !channelId) return;
      socket.emit("typing_end", { 
          channelId, 
          userId: user._id 
      });
  }, [user]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!user) return;

    const updateUnread = (prevChats, incomingMsg, isChatActive, isWindowActive) => {
        const incomingSenderId = normalizeId(incomingMsg.sender?._id || incomingMsg.sender);

        let chatIndex = -1;
        if (incomingMsg.type === "assignment" && incomingSenderId) {
            chatIndex = prevChats.findIndex((c) =>
                c?.isTeacherChat &&
                c?.channelId === incomingMsg.channelId &&
                normalizeId(c?.participant?._id) === incomingSenderId
            );
        }
        if (chatIndex === -1) {
            chatIndex = prevChats.findIndex(c => chatMatchesChannelId(c, incomingMsg.channelId));
        }
        if (chatIndex === -1) return prevChats;

        const isReadByMe = Array.isArray(incomingMsg.readBy)
            ? incomingMsg.readBy.map((id) => normalizeId(id)).includes(normalizeId(user._id))
            : false;
        let shouldIncrement = false;
        
        if (!isReadByMe) {
             shouldIncrement = !isChatActive || !isWindowActive;
        }

        const updatedChat = {
            ...prevChats[chatIndex],
            unreadCount: shouldIncrement ? (prevChats[chatIndex].unreadCount || 0) + 1 : (prevChats[chatIndex].unreadCount || 0),
            lastMessage: {
                text: getMessagePreview(incomingMsg),
                sender: incomingMsg.sender?._id || incomingMsg.sender,
                sentAt: incomingMsg.sentAt || new Date().toISOString(),
                isDeleted: incomingMsg.isDeleted || false,
                gif: incomingMsg.gif || null,
                noteTitle: incomingMsg.noteTitle || null
            }
        };
        
        return [updatedChat, ...prevChats.slice(0, chatIndex), ...prevChats.slice(chatIndex + 1)];
    };

    const handleReceiveMessage = (incomingMsg) => {
       const currentActive = activeChatRef.current;
       const activeChannelId = resolveChatChannelId(currentActive);
       const incomingSenderId = normalizeId(incomingMsg.sender?._id || incomingMsg.sender);
       const activeTeacherId = normalizeId(currentActive?.participant?._id);
       const isSameTeacherVirtualStream = !(
           currentActive?.isTeacherChat &&
           incomingMsg.type === "assignment" &&
           activeTeacherId &&
           incomingSenderId &&
           incomingSenderId !== activeTeacherId
       );
       const isChatActive = Boolean(activeChannelId && incomingMsg.channelId === activeChannelId && isSameTeacherVirtualStream);
       const isWindowActive = !document.hidden && document.hasFocus();

       if (document.hidden || !document.hasFocus()) {
           const audio = new Audio(notifSound);
           audio.play().catch(e => console.log("Audio play failed:", e));
       } else if (isChatActive && isWindowActive) {
           markAsRead(incomingMsg.channelId);
       }

       let isMe = false;
       const currentUserId = auth.currentUser?.uid;
       if (incomingMsg.sender?.firebaseUid && currentUserId) {
           isMe = incomingMsg.sender.firebaseUid === currentUserId;
       } else if (incomingMsg.sender?._id && user?._id) {
           isMe = incomingMsg.sender._id.toString() === user._id.toString();
       }
       
       const processedMsg = { ...incomingMsg, isMe };

       if (isChatActive) {
           setMessages(prev => {
               if (prev.find(m => m._id === incomingMsg._id)) return prev;
               if (incomingMsg.customId) {
                   const existingOptimistic = prev.find(m => m.customId === incomingMsg.customId);
                   if (existingOptimistic) {
                       return prev.map(m => m.customId === incomingMsg.customId ? processedMsg : m);
                   }
               }
               return [...prev, processedMsg];
           });
       }

       setMessageCache(prev => {
            const currentList = prev[incomingMsg.channelId] || [];
            if (currentList.find(m => m._id === incomingMsg._id)) return prev;
            if (incomingMsg.customId) {
                const existingOptimistic = currentList.find(m => m.customId === incomingMsg.customId);
                if (existingOptimistic) {
                    return {
                        ...prev,
                        [incomingMsg.channelId]: currentList.map(m => m.customId === incomingMsg.customId ? processedMsg : m)
                    };
                }
            }
            return {
                ...prev,
                [incomingMsg.channelId]: [...currentList, processedMsg]
            };
       });

       setChats(prev => updateUnread(prev, incomingMsg, isChatActive, isWindowActive));
       setSecondaryChats(prev => updateUnread(prev, incomingMsg, isChatActive, isWindowActive));
    };
    
    const handleUnifiedEvent = (event) => {
        if (!event) return;
        if (event.type === "CHAT_UPDATED") {
            const { channelId, lastMessage } = event.payload;
            const lastSenderId = normalizeId(lastMessage?.sender?._id || lastMessage?.sender);

            const updateList = (prevChats) => {
                let chatIndex = -1;
                if (lastMessage?.type === "assignment" && lastSenderId) {
                    chatIndex = prevChats.findIndex((c) =>
                        c?.isTeacherChat &&
                        c?.channelId === channelId &&
                        normalizeId(c?.participant?._id) === lastSenderId
                    );
                }
                if (chatIndex === -1) {
                    chatIndex = prevChats.findIndex(c => chatMatchesChannelId(c, channelId));
                }
                if (chatIndex === -1) return prevChats;

                const msgForPreview = {
                    text: lastMessage.text,
                    gif: lastMessage.gif,
                    noteTitle: lastMessage.noteTitle,
                    isDeleted: false
                };
                const previewText = getMessagePreview(msgForPreview);

                const updatedChat = {
                    ...prevChats[chatIndex],
                    lastMessage: {
                        text: previewText,
                        sender: lastMessage.sender,
                        sentAt: lastMessage.sentAt,
                        gif: lastMessage.gif,
                        noteTitle: lastMessage.noteTitle,
                        type: lastMessage.type
                    }
                };
                return [updatedChat, ...prevChats.slice(0, chatIndex), ...prevChats.slice(chatIndex + 1)];
            };

            setChats(prev => updateList(prev));
            setSecondaryChats(prev => updateList(prev));
        }
    };

    const handleMessageDeleted = ({ messageId, type, channelId }) => {
        const getUpdatedList = (list) => {
            if (!list) return [];
            const msgIdStr = messageId.toString(); 
            
            if (type === 'everyone') {
                return list.map(msg => {
                    if (msg._id.toString() === msgIdStr) {
                        return { 
                            ...msg, 
                            isDeleted: true, 
                            text: "🚫 This message was deleted",
                            gif: null,        
                            noteTitle: null 
                        };
                    }
                    return msg;
                });
            } else if (type === 'me') {
                return list.filter(msg => msg._id.toString() !== msgIdStr);
            }
            return list;
        };

        if (resolveChatChannelId(activeChatRef.current) === channelId) {
            setMessages(prev => getUpdatedList(prev));
        }

        setMessageCache(prevCache => {
            const currentMessages = prevCache[channelId];
            
            if (!currentMessages) {
                fetchMessages(channelId, true); 
                return prevCache; 
            }

            const updatedMessages = getUpdatedList(currentMessages);
            
            const updateSidebar = (prevChats) => {
                const chatIndex = prevChats.findIndex(c => chatMatchesChannelId(c, channelId));
                if (chatIndex === -1) return prevChats;

                const existingChat = prevChats[chatIndex];
                let socketLastMessage;

                if (updatedMessages.length > 0) {
                    const lastMsg = updatedMessages[updatedMessages.length - 1]; 
                    
                    let previewText = lastMsg.text || "Message";
                    if (lastMsg.isDeleted) previewText = "🚫 This message was deleted";
                    else if (lastMsg.noteTitle) previewText = `📝 ${lastMsg.noteTitle}`;
                    else if (lastMsg.gif) previewText = "🎬 GIF";

                    socketLastMessage = {
                        text: previewText,
                        sender: lastMsg.sender?._id || lastMsg.sender,
                        sentAt: lastMsg.sentAt,
                        isDeleted: lastMsg.isDeleted || false,
                        gif: lastMsg.gif || null,
                        noteTitle: lastMsg.noteTitle || null
                    };
                } else {
                     fetchMessages(channelId, true);

                     socketLastMessage = {
                        text: "No messages yet", 
                        sender: null,
                        sentAt: null
                    };
                }

                const updatedChat = {
                    ...existingChat,
                    lastMessage: socketLastMessage
                };

                const newChats = [...prevChats];
                newChats[chatIndex] = updatedChat;
                return newChats;
            };

            setChats(prev => updateSidebar(prev));
            setSecondaryChats(prev => updateSidebar(prev));

            return {
                ...prevCache,
                [channelId]: updatedMessages
            };
        });
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("event", handleUnifiedEvent);
    socket.on("message_deleted", handleMessageDeleted);

    const handleMessagesSeen = ({ channelId, userId }) => {
        const updateReadBy = (list) => list.map(msg => {
            const currentReadBy = msg.readBy || [];
            if (!currentReadBy.includes(userId)) {
                return { ...msg, readBy: [...currentReadBy, userId] };
            }
            return msg;
        });

        const activeChannelId = resolveChatChannelId(activeChatRef.current);
        if (activeChannelId && activeChannelId === channelId) {
            setMessages(prev => updateReadBy(prev));
        }

        setMessageCache(prev => {
            if (!prev[channelId]) return prev;
            return {
                ...prev,
                [channelId]: updateReadBy(prev[channelId])
            };
        });
    };

    socket.on("messages_seen", handleMessagesSeen);
    
    socket.on("user_typing_start", ({ userId, userName, channelId }) => {
        if (resolveChatChannelId(activeChatRef.current) === channelId) {
             setTypingUsers(prev => {
                 if (prev.find(u => u.userId === userId)) return prev;
                 return [...prev, { userId, userName }];
             });
        }
    });

    socket.on("user_typing_end", ({ userId, channelId }) => {
        if (resolveChatChannelId(activeChatRef.current) === channelId) {
             setTypingUsers(prev => prev.filter(u => u.userId !== userId));
        }
    });

    const handleFriendAccepted = (event) => {
        if (!event?.type || user?.role !== "student") return;

        if (event.type === "FRIEND_REQUEST_ACCEPTED") {
            const accepterId = event.payload?.accepterId?.toString();
            const sent = (user.friendRequests?.sent || []).map((id) => id.toString());
            const friends = (user.friends || []).map((id) => id.toString());
            if (accepterId && (sent.includes(accepterId) || friends.includes(accepterId))) {
                fetchChats();
            }
        }

        if (event.type === "FRIEND_REMOVED") {
            const removerId = event.payload?.removerId?.toString();
            const friends = (user.friends || []).map((id) => id.toString());
            if (removerId && friends.includes(removerId)) {
                fetchChats();
            }
        }
    };
    socket.on("event", handleFriendAccepted);

    return () => {
        socket.off("receive_message", handleReceiveMessage);
        socket.off("event", handleUnifiedEvent);
        socket.off("message_deleted", handleMessageDeleted);
        socket.off("event", handleFriendAccepted);
        socket.off("user_typing_start");
        socket.off("user_typing_end");
        socket.off("messages_seen", handleMessagesSeen);
    };
  }, [user, fetchChats, markAsRead, getMessagePreview, resolveChatChannelId, chatMatchesChannelId, normalizeId]);

    const fetchClassmates = useCallback(async (includeTeachers = false) => {
      try {
        const token = await auth.currentUser.getIdToken();
        const url = includeTeachers 
          ? `${server}/chat/classmates?includeTeachers=true` 
          : `${server}/chat/classmates`;
          
        const { data } = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClassmates(data);
      } catch (err) {
        console.error("Error fetching classmates:", err);
      }
    }, []);

  const addMessage = useCallback((channelId, msg) => {
      setMessageCache(prev => ({
          ...prev,
          [channelId]: [...(prev[channelId] || []), msg]
      }));
      if (resolveChatChannelId(activeChatRef.current) === channelId) {
          setMessages(prev => [...prev, msg]);
      }
  }, [resolveChatChannelId]);

  const deleteMessage = useCallback((channelId, messageId) => {
      const filterFunc = (list) => list.filter(m => m._id !== messageId);

      const currentMessages = messageCache[channelId] || [];
      const updatedMessages = filterFunc(currentMessages);

      setMessageCache(prev => {
          if (!prev[channelId]) return prev;
          return {
              ...prev,
              [channelId]: filterFunc(prev[channelId])
          };
      });
      
      if (resolveChatChannelId(activeChatRef.current) === channelId) {
          setMessages(prev => filterFunc(prev));
      }

      const updateSidebarAfterDelete = (prevChats) => {
          const chatIndex = prevChats.findIndex(c => chatMatchesChannelId(c, channelId));
          if (chatIndex === -1) return prevChats;

          const chat = prevChats[chatIndex];
          
          let newLastMessage = null;
          if (updatedMessages.length > 0) {
              const lastMsg = updatedMessages[updatedMessages.length - 1];
              newLastMessage = {
                  text: getMessagePreview(lastMsg),
                  sender: lastMsg.sender?._id || lastMsg.sender,
                  sentAt: lastMsg.sentAt,
                  isDeleted: lastMsg.isDeleted || false,
                  gif: lastMsg.gif || null,
                  noteTitle: lastMsg.noteTitle || null
              };
          } else {
              newLastMessage = {
                  text: "No messages yet",
                  sender: null,
                  sentAt: null
              };
          }

          const updatedChat = {
              ...chat,
              lastMessage: newLastMessage
          };

          return [
              ...prevChats.slice(0, chatIndex),
              updatedChat,
              ...prevChats.slice(chatIndex + 1)
          ];
      };

      setChats(prev => updateSidebarAfterDelete(prev));
      setSecondaryChats(prev => updateSidebarAfterDelete(prev));
  }, [messageCache, getMessagePreview, chatMatchesChannelId, resolveChatChannelId]);

  useEffect(() => {
      if (user) {
          fetchChats();
          fetchClassmates();
      } else {
          setChats([]);
          setSecondaryChats([]);
          setActiveChat(null);
          setMessages([]);
          setTypingUsers([]);
          setClassmates([]);
      }
  }, [user, fetchChats, fetchClassmates]);

  // --- OPTIMIZATION: Memoize Context Value ---
  const value = useMemo(() => ({
      chats,
      secondaryChats,
      activeChat,
      setActiveChat,
      messages,
      setMessages,
      loading,
      fetchChats,
      markAsRead,
      classmates,
      fetchClassmates,
      messageCache,
      fetchMessages,
      addMessage,
      deleteMessage,
      onlineUsers,
      setOnlineUsers,
      typingUsers,
      emitTypingStart,
      emitTypingEnd
  }), [
      chats, secondaryChats, activeChat, messages, loading, classmates, messageCache, onlineUsers, typingUsers,
      fetchChats, fetchClassmates, fetchMessages, markAsRead, addMessage, deleteMessage, emitTypingStart, emitTypingEnd
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

