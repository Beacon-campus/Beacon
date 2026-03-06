import React from 'react';
import ChatInterface from '../../../components/chat_comps/ChatMain'; // Adjust path as needed

export default function TeacherCommunity() {
  return (
    <div className="w-full h-full">
      {/* This renders the Chat Interface with PEERS and CLASS REP GROUPS */}
      <ChatInterface role="teacher" />
    </div>
  );
}