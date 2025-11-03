import { useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

interface TTSPlayerProps {
  sentences: string[];
  voiceId: string;
  enabled: boolean;
}

export const TTSPlayer = ({ sentences, voiceId, enabled }: TTSPlayerProps) => {
  const queueRef = useRef<string[]>([]);
  const playingRef = useRef(false);
  const [currentSentence, setCurrentSentence] = useState("");
  
  useEffect(() => {
    // Add new sentences to queue
    sentences.forEach(sentence => {
      if (!queueRef.current.includes(sentence)) {
        queueRef.current.push(sentence);
      }
    });
    
    // Start playing if not already playing
    if (!playingRef.current && enabled) {
      playNext();
    }
  }, [sentences, enabled]);
  
  const playNext = async () => {
    if (queueRef.current.length === 0 || !enabled) {
      playingRef.current = false;
      setCurrentSentence("");
      return;
    }
    
    playingRef.current = true;
    const sentence = queueRef.current.shift()!;
    setCurrentSentence(sentence);
    
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence, voiceId })
      });
      if (!resp.ok) {
        const msg = await resp.text();
        throw new Error(msg || 'TTS request failed');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('TTS error:', error);
      toast({
        title: "TTS Error",
        description: error.message || "Failed to play audio",
        variant: "destructive",
      });
    }
    
    // Play next sentence
    setTimeout(() => playNext(), 100);
  };
  
  return null;
};
