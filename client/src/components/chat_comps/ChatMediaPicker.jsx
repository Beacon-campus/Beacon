import React, { useState, useEffect } from "react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { ALLOWED_EMOJIS } from "../../utils/chatConstants";

// Initialize GiphyFetch with the API Key from environment variables
// IMPORTANT: This key must be in .env as VITE_GIPHY_API_KEY
const giphyFetch = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY || "YOUR_API_KEY_HERE");

export default function ChatMediaPicker({ onGifSelect, onEmojiSelect, onClose, hideGifs }) {
  const [activeTab, setActiveTab] = useState("emoji"); // Default to Emoji as per user preference likely
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");

  // Debounce search input for GIF
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchGifs = (offset) => {
    // CRITICAL: Force rating 'g' for safety
    if (!debouncedTerm) {
      return giphyFetch.trending({ offset, limit: 10, rating: 'g' });
    }
    return giphyFetch.search(debouncedTerm, { offset, limit: 10, rating: 'g' });
  };

  return (
    <div className="w-[calc(100vw-2rem)] max-w-[280px] min-[426px]:w-72 h-80 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header / Search */}
      <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
        <h3 className="font-bold text-xs text-gray-500 uppercase tracking-wider">
            {activeTab === 'gif' ? "GIFs via Giphy" : "Select Emoji"}
        </h3>
        <button 
           onClick={onClose}
           className="text-gray-400 hover:text-black font-bold text-lg leading-none"
        >
          &times;
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white p-2 relative">
          {activeTab === 'gif' && !hideGifs ? (
              <>
                <div className="mb-2 shrink-0">
                    <input
                    type="text"
                    placeholder="Search safe GIFs..."
                    className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                    />
                </div>
                <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                    <Grid 
                        width={270} 
                        columns={2} 
                        fetchGifs={fetchGifs} 
                        key={debouncedTerm} 
                        onGifClick={(gif, e) => {
                            e.preventDefault();
                            onGifSelect(gif.images.fixed_height.url);
                        }}
                        noLink={true}
                        hideAttribution={true}
                    />
                </div>
              </>
          ) : (
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
                  <div className="grid grid-cols-6 gap-2 p-1">
                  {ALLOWED_EMOJIS.map((emoji, idx) => (
                      <button
                          key={idx}
                          onClick={() => onEmojiSelect(emoji)}
                          className="text-xl p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                          {emoji}
                      </button>
                  ))}
                  </div>
              </div>
          )}
      </div>

      {/* Bottom Switch Pill */}
      {/* Only render the toggle if GIFs are allowed */}
      {!hideGifs && (
          <div className="p-2 border-t border-gray-100 bg-gray-50 flex justify-center shrink-0">
            <div className="flex bg-gray-200/50 p-1 rounded-full gap-1">
                <button
                    onClick={() => setActiveTab('emoji')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeTab === 'emoji' 
                        ? "bg-white text-black shadow-sm" 
                        : "text-gray-500 hover:bg-gray-200"
                    }`}
                >
                    Emoji
                </button>
                <button
                    onClick={() => setActiveTab('gif')}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeTab === 'gif' 
                        ? "bg-white text-black shadow-sm" 
                        : "text-gray-500 hover:bg-gray-200"
                    }`}
                >
                    GIF
                </button>
            </div>
          </div>
      )}

      {/* API Key Warning (Dev only) */}
      {!import.meta.env.VITE_GIPHY_API_KEY && activeTab === 'gif' && !hideGifs && (
          <div className="bg-red-100 text-red-800 text-[10px] p-1 text-center font-bold">
              Missing VITE_GIPHY_API_KEY
          </div>
      )}
    </div>
  );
}