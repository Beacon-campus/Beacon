import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/apiClient";
import { clearPageCacheByPrefix, getOrFetchPageCache, setPageCache } from "../../services/pageCache.service";
import ReactMarkdown from "react-markdown";
import LoadingState from "../ui/LoadingState";

// Helper to resolve profile images
const getAvatarUrl = (id) => {
  if (!id) return null;
  return new URL(`../../assets/profile/${id}.png`, import.meta.url).href;
};

/* ================= ICONS ================= */
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-45 -translate-x-0.5">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);
const PlusIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>;
const BotAvatar = () => <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>;
const ClockIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const WarningIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5h2m-1-1v2m8.485 2.929a2 2 0 010 2.828L9 21H3v-6l11.485-11.485a2 2 0 012.828 0z" /></svg>;

export default function Bot() {
  const { user } = useAuth();

  /* ================= STATE ================= */
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Session State
  const [sessionId, setSessionId] = useState(null);
  const [history, setHistory] = useState([]);

  // Memory & Expiry Tracking
  const [docSize, setDocSize] = useState(0);
  const [lastActive, setLastActive] = useState(new Date());

  // ✅ NEW: Inline Editing State (Replaces prompt)
  const [editingId, setEditingId] = useState(null); // Which chat ID is being edited?
  const [editValue, setEditValue] = useState("");   // The text being typed

  const bottomRef = useRef(null);
  const WARNING_THRESHOLD = 14 * 1024 * 1024; // 14 MB

  const botType = user?.role === "teacher" ? "teacher" : "student";
  const botName = botType === "teacher" ? "Research Assistant" : "Study Bot";
  const userCacheKey = user?.uid || "guest";

  /* ================= HELPERS ================= */
  const getDaysRemaining = () => {
    const expiryTime = new Date(lastActive).getTime() + (7 * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();
    const diffTime = expiryTime - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    if (bottomRef.current?.parentElement) {
      bottomRef.current.parentElement.scrollTo({
        top: bottomRef.current.parentElement.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [messages, loading]);

  /* ================= LOAD HISTORY ================= */
  const fetchHistory = async (force = false) => {
    if (!user) return;
    try {
      const data = await getOrFetchPageCache(
        `bot:history:${botType}`,
        userCacheKey,
        async () => (await apiClient.get(`/bot/history`)).data || [],
        { force, ttlMs: 60_000 }
      );
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user, botType, userCacheKey]);

  /* ================= LOAD SESSION ================= */
  const loadSession = async (id) => {
    // Prevent loading if we are currently renaming that session
    if (editingId === id) return;

    setLoading(true);
    try {
      const data = await getOrFetchPageCache(
        `bot:session:${id}`,
        userCacheKey,
        async () => (await apiClient.get(`/bot/session/${id}`)).data,
        { ttlMs: 60_000 }
      );

      setMessages(data.messages || []);
      setSessionId(data._id);

      setDocSize(data.docSizeBytes || 0);
      setLastActive(data.lastActive || new Date());

    } catch (err) {
      console.error("Error loading session", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= DELETE SESSION ================= */
  const deleteSession = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this chat?")) return;

    try {
      await apiClient.delete(`/bot/session/${id}`);
      clearPageCacheByPrefix(`bot:session:${id}`, userCacheKey);
      clearPageCacheByPrefix(`bot:history:${botType}`, userCacheKey);
      setHistory(prev => prev.filter(h => h._id !== id));
      if (sessionId === id) {
        setMessages([]);
        setSessionId(null);
        setDocSize(0);
        setLastActive(new Date());
      }
    } catch (err) {
      console.error(err);
    }
  };

  /* ================= RENAME LOGIC (UPDATED) ================= */

  // 1. Start Editing
  const startEditing = (e, chat) => {
    e.stopPropagation(); // Stop chat from loading when clicking pencil
    setEditingId(chat._id);
    setEditValue(chat.title);
  };

  // 2. Save Editing
  const saveTitle = async (id) => {
    if (!editValue.trim() || editValue === history.find(h => h._id === id)?.title) {
      setEditingId(null); // Cancel if empty or no change
      return;
    }

    // Optimistic UI Update (Instant feedback)
    setHistory(prev => {
      const next = prev.map(h => h._id === id ? { ...h, title: editValue } : h);
      setPageCache(`bot:history:${botType}`, userCacheKey, next, 60_000);
      return next;
    });
    setEditingId(null);

    try {
      await apiClient.patch(`/bot/session/${id}/title`, { title: editValue });
    } catch (err) {
      console.error("Failed to rename", err);
      fetchHistory(true); // Revert on error
    }
  };

  // 3. Handle Enter Key
  const handleEditKeyDown = (e, id) => {
    if (e.key === "Enter") saveTitle(id);
    if (e.key === "Escape") setEditingId(null);
  };


  /* ================= SEND MESSAGE ================= */
  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => {
      const next = [...prev, userMessage];
      if (sessionId) {
        setPageCache(`bot:session:${sessionId}`, userCacheKey, { _id: sessionId, messages: next }, 60_000);
      }
      return next;
    });
    setInput("");
    setLoading(true);

    try {
      const { data } = await apiClient.post(`/bot/chat`, {
        message: userMessage.text,
        botType,
        sessionId
      });

      setMessages((prev) => {
        const next = [...prev, { role: "bot", text: data.reply }];
        const resolvedSessionId = sessionId || data.sessionId;
        if (resolvedSessionId) {
          setPageCache(
            `bot:session:${resolvedSessionId}`,
            userCacheKey,
            {
              _id: resolvedSessionId,
              messages: next,
              docSizeBytes: data.docSize || docSize,
              lastActive: new Date().toISOString(),
            },
            60_000
          );
        }
        return next;
      });

      if (data.docSize) setDocSize(data.docSize);
      setLastActive(new Date());

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
        setHistory(prev => {
          const next = [{ _id: data.sessionId, title: data.title }, ...prev];
          setPageCache(`bot:history:${botType}`, userCacheKey, next, 60_000);
          return next;
        });
      } else {
        fetchHistory(true);
      }

    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "I'm having trouble connecting right now." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */
  return (
    <>

    <div className="relative w-full h-full">
      <div className="absolute inset-0 premium-card flex overflow-hidden">

        {/* ================= LEFT PANEL ================= */}
        <div className="w-64 bg-gray-50 p-5 flex flex-col gap-6 border-r border-gray-100">

          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
              <BotAvatar />
            </div>
            <div className="font-bold text-primary">{botName}</div>
          </div>

          <button
            onClick={() => {
              setMessages([]);
              setSessionId(null);
              setDocSize(0);
              setLastActive(new Date());
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1e293b] transition-all shadow-sm active:scale-95"
          >
            <PlusIcon /> New Chat
          </button>

          {/* History List */}
          <div className="flex-1 overflow-y-auto soft-scrollbar pr-1">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Recent</p>
            <div className="space-y-1">
              {history.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => loadSession(chat._id)}
                  className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm truncate transition-colors ${sessionId === chat._id ? "bg-white shadow-sm text-primary font-medium" : "text-gray-600 hover:bg-gray-200"
                    }`}
                >
                  {/* ✅ CONDITIONAL RENDER: Input box OR Title */}
                  {editingId === chat._id ? (
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveTitle(chat._id)} // Save when clicking away
                      onKeyDown={(e) => handleEditKeyDown(e, chat._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-white border border-gray-300 rounded px-1 py-0.5 text-xs outline-none focus:border-gray-500 text-primary"
                    />
                  ) : (
                    <>
                      <span className="truncate flex-1">{chat.title}</span>

                      {/* Action Buttons Container */}
                      <div className="flex items-center gap-1">
                        {/* ✅ PENCIL ICON: Matches Trash Icon Styling */}
                        <button
                          onClick={(e) => startEditing(e, chat)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-primary transition-all hover:bg-gray-100 rounded"
                          title="Rename"
                        >
                          <EditIcon />
                        </button>

                        {/* Trash Icon */}
                        <button
                          onClick={(e) => deleteSession(e, chat._id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="flex-1 flex flex-col bg-white relative">

          {/* Chat Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
            <h2 className="text-lg font-bold text-gray-800">
              {sessionId ? (history.find(h => h._id === sessionId)?.title || "Chat Session") : "New Conversation"}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
              <ClockIcon />
              <span>Deletes in {getDaysRemaining()} days</span>
            </div>
          </div>

          {/* Warning */}
          {docSize > WARNING_THRESHOLD && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-amber-50 border border-amber-200 shadow-lg text-amber-800 px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2">
                <div className="p-1 bg-amber-100 rounded-full">
                  <WarningIcon />
                </div>
                <span>Memory nearly full ({((docSize / 1024) / 1024).toFixed(1)}MB). Please start a new chat soon.</span>
              </div>
            </div>
          )}

          {/* Chat Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 soft-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 opacity-60">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                  <BotAvatar />
                </div>
                <p className="font-medium text-primary mb-1 text-lg">
                  Hey, I'm {botName}
                </p>
                <p className="text-sm">How can I help you today?</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 max-w-[70%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ${msg.role === "user" ? "border-2 border-white shadow-sm" : "bg-gray-100 border border-gray-200"
                  }`}>
                  {msg.role === "user" ? (
                    <img
                      src={getAvatarUrl(user?.profile?.avatar || (user?.role === 'teacher' ? 1 : 11))}
                      alt="Me"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BotAvatar />
                  )}
                </div>

                <div
                  className={`px-4 py-3 rounded-2xl text-[15px] leading-[1.6] shadow-sm overflow-hidden ${msg.role === "user"
                    ? "bg-[#F0FDF4] text-[#0F172A] rounded-br-[4px]"
                    : "bg-[#F3F4F6] text-gray-800 border-none rounded-bl-[4px] prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-1"
                    }`}
                >
                  <ReactMarkdown
                    components={{
                      ul: ({ node, ...props }) => <ul style={{ listStyleType: 'disc', paddingLeft: '2.5em', marginBottom: '0.75em' }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '2.5em', marginBottom: '0.75em' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '0.75em', lineHeight: '1.6' }} {...props} />,
                      p: ({ node, ...props }) => <p style={{ marginBottom: '0.75em', lineHeight: '1.6' }} {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 mr-auto max-w-2xl items-start">
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                  <BotAvatar />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 rounded-tl-none">
                  <LoadingState size="xs" align="start" className="items-start" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100 shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="relative flex items-center bg-gray-50 rounded-2xl focus-within:ring-2 focus-within:ring-[#0F172A]/20 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask your question here..."
                  className="flex-1 bg-transparent pl-5 pr-14 py-4 outline-none text-[15px] text-gray-800 placeholder-gray-400"
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={`absolute right-2 px-4 py-2 rounded-xl transition-all duration-300 flex items-center justify-center ${
                    input.trim() && !loading
                      ? "bg-[#0F172A] text-white shadow-lg shadow-[#0F172A]/20 hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <SendIcon />
                </button>
              </div>

              <div className="text-center mt-3">
                <p className="text-[11px] text-gray-400 font-medium">
                  AI can make mistakes. Please double-check important information. 
                  <span className="mx-2 opacity-50">•</span> 
                  Chat history deletes automatically after 7 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
