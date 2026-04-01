import React from "react";
import ChatInterface from "../../../components/chat_comps/ChatMain";
import { useAuth } from "../../../context/AuthContext";
import LoadingState from "../../../components/ui/LoadingState";

export default function StudentCommunity() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 min-[769px]:rounded-2xl">
        <LoadingState size="md" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50 text-red-500 min-[769px]:rounded-2xl">
        Error loading profile. Please refresh.
      </div>
    );
  }

  return (
    <div className="w-full h-full px-0 pt-0 pb-0">
      <ChatInterface user={user} role="student" />
    </div>
  );
}
