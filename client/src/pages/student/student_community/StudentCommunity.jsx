import React from "react";
// 1. Remove axios and server imports
import ChatInterface from "../../../components/chat_comps/ChatMain";
import { useAuth } from "../../../context/AuthContext"; // 2. Import Auth Context

export default function StudentCommunity() {
  // 3. Get user and loading directly from context
  // This bypasses the need for a second API call that was failing
  const { user, loading } = useAuth();

  // 4. Show a loading state (handled by context now)
  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-2xl">
        <p className="text-gray-400 animate-pulse">Loading Community...</p>
      </div>
    );
  }

  // 5. Render the Chat ONLY if we have a user
  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 rounded-2xl">
        Error loading profile. Please refresh.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* 6. Pass the context user to the chat */}
      <ChatInterface user={user} role="student" />
    </div>
  );
}
