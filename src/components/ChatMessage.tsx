import { usernameToColor } from "@/lib/color";

export interface ChatMessageData {
  username: string;
  message: string;
  time_counter: number;
}

export const ChatMessage = ({ username, message, time_counter }: ChatMessageData) => {
  const userColor = usernameToColor(username);
  
  return (
    <div className="mb-3 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: userColor, color: '#0a0a0a' }}
        >
          {username}
        </div>
        <span className="text-xs text-muted-foreground">
          {time_counter}s
        </span>
      </div>
      <div className="bg-[hsl(var(--chat-bubble))] backdrop-blur-sm rounded-lg px-3 py-2 text-sm">
        {message}
      </div>
    </div>
  );
};
