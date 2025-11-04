import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Play, Square } from "lucide-react";

interface TopBarProps {
  running: boolean;
  onStartStop: () => void;
  voiceModel: string;
  onVoiceModelChange: (voiceModel: string) => void;
  voiceId: string;
  onVoiceIdChange: (voiceId: string) => void;
  topic: string;
  onTopicChange: (topic: string) => void;
  windowInfo: string;
}

export const TopBar = ({
  running,
  onStartStop,
  voiceModel,
  onVoiceModelChange,
  voiceId,
  onVoiceIdChange,
  topic,
  onTopicChange,
  windowInfo,
}: TopBarProps) => {
  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button
          onClick={onStartStop}
          variant={running ? "destructive" : "default"}
          size="sm"
          className="font-semibold"
        >
          {running ? (
            <>
              <Square className="mr-2 h-4 w-4" />
              Stop
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start Simulation
            </>
          )}
        </Button>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="voiceModel" className="text-xs">Voice Model</Label>
          <Select value={voiceModel} onValueChange={onVoiceModelChange} disabled={running}>
            <SelectTrigger id="voiceModel" className="w-[180px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eleven_turbo_v2_5">eleven_turbo_v2_5 (Streaming)</SelectItem>
              <SelectItem value="eleven_v3">eleven_v3 (Buffered)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="voice" className="text-xs">Voice ID</Label>
          <Input
            id="voice"
            value={voiceId}
            onChange={(e) => onVoiceIdChange(e.target.value)}
            disabled={true}
            className="w-[180px] h-8 text-xs font-mono"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Label htmlFor="topic" className="text-xs">Theme</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => onTopicChange(e.target.value)}
            disabled={running}
            className="w-[200px] h-8 text-xs"
            placeholder="Stream topic..."
          />
        </div>
        
        <div className="ml-auto text-xs text-muted-foreground">
          {windowInfo}
        </div>
      </div>
    </div>
  );
};
