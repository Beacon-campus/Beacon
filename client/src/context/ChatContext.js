import { createContext, useContext } from "react";

const ChatContext = createContext();

export function useChat() {
  return useContext(ChatContext);
}

export default ChatContext;
