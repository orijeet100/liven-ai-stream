interface NowSpeakingProps {
  text: string;
  voiceId: string;
  modelId: string;
}

export const NowSpeaking = ({ text, voiceId, modelId }: NowSpeakingProps) => {
  if (!text) return null;
  return (
    <div className="absolute bottom-8 left-8 right-8 bg-[hsl(var(--stage-overlay))]/90 backdrop-blur-md rounded-xl border border-border p-6 shadow-2xl">
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold text-gradient">Now Speaking</h3>
        <div className="text-xs text-muted-foreground">
          Voice: ElevenLabs · Model: {modelId}
        </div>
      </div>
      
      <div className="min-h-[80px] text-foreground leading-relaxed">
        <p className="text-lg">{text}</p>
      </div>
    </div>
  );
};
