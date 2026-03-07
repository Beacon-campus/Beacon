import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import apiClient from "../../services/apiClient";
import ReactMarkdown from "react-markdown";

// Helper to resolve profile images
const getAvatarUrl = (id) => {
  if (!id) return null;
  return new URL(`../../assets/profile/${id}.png`, import.meta.url).href;
};

/* ================= ICONS ================= */
const SendIcon = () => <svg className="w-5 h-5 translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>;
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
  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data } = await apiClient.get(`/bot/history`);
      if (Array.isArray(data)) {
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  /* ================= LOAD SESSION ================= */
  const loadSession = async (id) => {
    // Prevent loading if we are currently renaming that session
    if (editingId === id) return;

    setLoading(true);
    try {
      const { data } = await apiClient.get(`/bot/session/${id}`);

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
    setHistory(prev => prev.map(h => h._id === id ? { ...h, title: editValue } : h));
    setEditingId(null);

    try {
      await apiClient.patch(`/bot/session/${id}/title`, { title: editValue });
    } catch (err) {
      console.error("Failed to rename", err);
      fetchHistory(); // Revert on error
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
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await apiClient.post(`/bot/chat`, {
        message: userMessage.text,
        botType,
        sessionId
      });

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply },
      ]);

      if (data.docSize) setDocSize(data.docSize);
      setLastActive(new Date());

      if (!sessionId && data.sessionId) {
        setSessionId(data.sessionId);
        setHistory(prev => [{ _id: data.sessionId, title: data.title }, ...prev]);
      } else {
        fetchHistory();
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
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }
      `}</style>
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
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-medium hover:bg-black transition-all shadow-sm active:scale-95"
          >
            <PlusIcon /> New Chat
          </button>

          {/* History List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
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

          {/* User Info */}
          <div className="pt-4 border-t border-gray-200 px-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-gray-300 overflow-hidden flex-shrink-0">
              <img
                src={getAvatarUrl(user?.profile?.avatar || (user?.role === 'teacher' ? 1 : 11))}
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs text-gray-500 truncate max-w-[120px]">
              {user?.email}
            </div>
          </div>
        </div>

        {/* ================= RIGHT PANEL ================= */}
        <div className="flex-1 flex flex-col bg-white relative">

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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
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
                className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
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
                  className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm overflow-hidden ${msg.role === "user"
                    ? "bg-primary text-white rounded-tr-none"
                    : "bg-gray-50 border border-gray-200 text-primary rounded-tl-none prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                    }`}
                >
                  <ReactMarkdown
                    components={{
                      ul: ({ node, ...props }) => <ul style={{ listStyleType: 'disc', paddingLeft: '1.5em', marginBottom: '0.5em' }} {...props} />,
                      ol: ({ node, ...props }) => <ol style={{ listStyleType: 'decimal', paddingLeft: '1.5em', marginBottom: '0.5em' }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ marginBottom: '0.25em' }} {...props} />,
                      p: ({ node, ...props }) => <p style={{ marginBottom: '0.5em' }} {...props} />,
                      strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 mr-auto max-w-2xl">
                <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex-shrink-0 flex items-center justify-center">
                  <BotAvatar />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-gray-50 border border-gray-200 rounded-tl-none flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="max-w-4xl mx-auto">
              <div className="relative flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask your question here..."
                  className="flex-1 pl-5 pr-14 py-4 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-gray-300 focus:ring-4 focus:ring-gray-100 transition-all outline-none text-sm font-medium text-primary placeholder-gray-400"
                />

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className={`absolute right-2 p-2 rounded-lg transition-all duration-200 ${input.trim() && !loading
                    ? "bg-primary text-white hover:bg-black shadow-md"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                >
                  <SendIcon />
                </button>
              </div>

              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-gray-400">AI can make mistakes. Please Double check important information on the Internet.</p>

                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  <ClockIcon />
                  <span>
                    Chat deletes in <span className="text-gray-600">{getDaysRemaining()} days</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}