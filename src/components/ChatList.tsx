import { useEffect, useRef } from "react";
import { ChatMessage, ChatMessageData } from "./ChatMessage";
import { ScrollArea } from "./ui/scroll-area";

interface ChatListProps {
  messages: ChatMessageData[];
}

export const ChatList = ({ messages }: ChatListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-lg font-bold text-gradient">Live Chat</h2>
        <p className="text-xs text-muted-foreground">{messages.length} messages</p>
      </div>
      
      <ScrollArea className="flex-1 px-4 py-3">
        <div ref={scrollRef} className="space-y-1">
          {messages.map((msg, idx) => (
            <ChatMessage key={`${msg.username}-${msg.time_counter}-${idx}`} {...msg} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
