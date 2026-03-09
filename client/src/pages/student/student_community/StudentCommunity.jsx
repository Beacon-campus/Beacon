import React from "react";
import ChatInterface from "../../../components/chat_comps/ChatMain";
import { useAuth } from "../../../context/AuthContext";

export default function StudentCommunity() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-2xl">
        <p className="text-gray-400 animate-pulse">Loading Community...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 rounded-2xl">
        Error loading profile. Please refresh.
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ChatInterface user={user} role="student" />
    </div>
  );
}
