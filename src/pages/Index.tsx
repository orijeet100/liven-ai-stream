import { useState, useEffect, useRef } from "react";
import { TopBar } from "@/components/TopBar";
import { ChatList } from "@/components/ChatList";
import { NowSpeaking } from "@/components/NowSpeaking";
import { StageBackground } from "@/components/StageBackground";
import { ChatMessageData } from "@/components/ChatMessage";
import { toast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5174' : '');

const Index = () => {
  const [running, setRunning] = useState(false);
  const [windowStart, setWindowStart] = useState(1);
  const [voiceModel, setVoiceModel] = useState("eleven_turbo_v2_5");
  const [voiceId, setVoiceId] = useState("1SM7GgM6IMuvQlz2BwM3");
  const [speakEnabled, setSpeakEnabled] = useState(true);
  const [topic, setTopic] = useState("Exploring AI Streamers & Agent Personalities");
  
  const [streamText, setStreamText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([]);
  const [windowInfo, setWindowInfo] = useState("Ready");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [openingText, setOpeningText] = useState("");
  
  const processingRef = useRef(false);
  const runningRef = useRef(false);
  const prefetchRef = useRef<{ start: number; window: ChatMessageData[]; finalText: string; audioUrl?: string | null } | null>(null);
  const prefetchingRef = useRef(false);
  const countdownRef = useRef<number>(0);
  const openingAudioUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    setStreamText("");
  }, []);

  
  const startSimulation = () => {
    setRunning(true);
    runningRef.current = true;
    setWindowStart(1);
    setChatMessages([]);
    setStreamText("");
    processingRef.current = false;
    countdownRef.current = 3;
    setCountdown(3);
    setOpeningText("");
    // reset any previous opening audio URL
    if (openingAudioUrlRef.current) {
      try { URL.revokeObjectURL(openingAudioUrlRef.current); } catch {}
      openingAudioUrlRef.current = null;
    }
    // Kick off prefetch for the first window immediately
    void prefetchWindow(1, voiceModel);
    // Play opening line first, then begin pipeline at start=1
    void (async () => {
      try {
        const opening = voiceModel === 'eleven_v3' 
          ? "[Excited] Hi this liven your AI livestreaming host, ready to take the day. [Chuckles] Hope you're having a great day lovely folks!"
          : "Hi this liven your AI livestreaming host, ready to take the day. Hope you're having a great day lovely folks!";
        // Begin prefetching opening audio immediately so it's instant after countdown
        let openingPrefetchPromise: Promise<void> | null = null;
        if (speakEnabled) {
          openingPrefetchPromise = (async () => {
            try {
              const resp = await fetch(`${API_URL}/api/tts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: opening, voiceId, model_id: voiceModel })
              });
              if (resp.ok) {
                const blob = await resp.blob();
                openingAudioUrlRef.current = URL.createObjectURL(blob);
              }
            } catch (e: any) {
              console.error('Opening audio prefetch error:', e.message || e);
            }
          })();
        }
        // Start countdown UI and wait for it to complete
        await (async () => {
          while (runningRef.current && countdownRef.current > 0) {
            await new Promise(r => setTimeout(r, 1000));
            countdownRef.current -= 1;
            setCountdown(countdownRef.current);
          }
          setCountdown(null);
        })();

        // For v3, wait for prefetch to complete before playing (v3 takes longer)
        if (speakEnabled && voiceModel === 'eleven_v3' && openingPrefetchPromise) {
          await openingPrefetchPromise;
        }

        // Wait for countdown to fully finish before starting audio
        // Play prefetched opening audio instantly if available
        if (speakEnabled) {
          if (openingAudioUrlRef.current) {
            setOpeningText(opening);
            await playAudioUrl(openingAudioUrlRef.current);
            try { URL.revokeObjectURL(openingAudioUrlRef.current); } catch {}
            openingAudioUrlRef.current = null;
            setOpeningText("");
          } else {
            // fallback if prefetch failed
            await playOpeningTTS(opening, voiceId, voiceModel);
          }
        }
        if (!runningRef.current) return;
        processingRef.current = false;
        await runLoop(1, voiceModel);
      } catch (e) {
        // fallthrough to stop on error
      }
    })();
  };
  
  const stopSimulation = () => {
    setRunning(false);
    runningRef.current = false;
    setWindowInfo("Stopped");
    setCountdown(null);
    setOpeningText("");
  };
  
  const prefetchWindow = async (start: number, model: string = voiceModel) => {
    if (prefetchingRef.current) {
      return;
    }
    prefetchingRef.current = true;
    try {
      const url = `/api/llm-generate?start=${start}&voiceModel=${encodeURIComponent(model)}&topic=${encodeURIComponent(topic)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`LLM error ${resp.status}`);
      const data = await resp.json();
      
      // For eleven_v3, prefetch audio as well
      let audioUrl: string | null = null;
      if (model === 'eleven_v3' && data.finalText) {
        try {
          const ttsResp = await fetch(`${API_URL}/api/tts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data.finalText, voiceId, model_id: 'eleven_v3' })
          });
          if (ttsResp.ok) {
            const blob = await ttsResp.blob();
            audioUrl = URL.createObjectURL(blob);
          }
        } catch (e: any) {
          console.error('Audio prefetch error:', e.message || e);
        }
      }
      
      prefetchRef.current = {
        start,
        window: Array.isArray(data.window) ? data.window : [],
        finalText: data.finalText || "",
        audioUrl,
      };
    } catch (e: any) {
      console.error('Prefetch error:', e);
      toast({ title: 'Error', description: e.message || 'Prefetch failed', variant: 'destructive' });
      // don't clear existing prefetch on failure to avoid losing current
    } finally {
      prefetchingRef.current = false;
    }
  };

  const wait = (ms: number) => new Promise(res => setTimeout(res, ms));

  const ensurePrefetched = async (start: number) => {
    const deadline = Date.now() + 10000; // 10s safety
    while (true) {
      if (prefetchRef.current && prefetchRef.current.start === start) {
        return;
      }
      if (!prefetchingRef.current) {
        await prefetchWindow(start, voiceModel);
        if (prefetchRef.current && prefetchRef.current.start === start) {
          return;
        }
      }
      if (Date.now() > deadline) throw new Error('Prefetch timeout');
      await wait(50);
    }
  };

  const speakWindow = async (start: number, model: string = voiceModel) => {
    if (!runningRef.current) return;
    if (processingRef.current) return;
    processingRef.current = true;
    try {
    setWindowStart(start);
    setStreamText("");
      setWindowInfo(`Window: [${start}, ${start + 4})`);

      // Ensure we have prefetched content for this start
      await ensurePrefetched(start);
      const buf = prefetchRef.current;
      if (!buf || buf.start !== start) throw new Error('Missing prefetched data');

      // If window is empty (CSV ended), loop back to start=1
      if (!buf.window.length && !buf.finalText) {
        if (!runningRef.current) return;
        processingRef.current = false;
        // Reset and restart
        setChatMessages([]);
        setWindowStart(1);
        setWindowInfo("Ready");
        await new Promise(r => setTimeout(r, 2000));
        if (!runningRef.current) return;
        // Restart from beginning
        countdownRef.current = 3;
        setCountdown(3);
        setOpeningText("");
        void prefetchWindow(1, voiceModel);
        void (async () => {
          try {
            const opening = voiceModel === 'eleven_v3'
              ? "[Excited] Hi this liven your AI livestreaming host, ready to take the day. [Chuckles] Hope you're having a great day lovely folks!"
              : "Hi this liven your AI livestreaming host, ready to take the day. Hope you're having a great day lovely folks!";
            // Wait for countdown to complete first
            await (async () => {
              while (runningRef.current && countdownRef.current > 0) {
                await new Promise(r => setTimeout(r, 1000));
                countdownRef.current -= 1;
                setCountdown(countdownRef.current);
              }
              setCountdown(null);
            })();
            // Now start TTS (text appears exactly when audio starts)
            if (speakEnabled) {
              await playOpeningTTS(opening, voiceId, voiceModel);
            }
            if (!runningRef.current) return;
            processingRef.current = false;
            await runLoop(1, voiceModel);
          } catch (e) {}
        })();
        return;
      }

      // Update chat with current window only now
      if (buf.window.length) {
        setChatMessages(prev => [...prev, ...buf.window]);
      }
      setStreamText(buf.finalText || "");

      // Kick off prefetch for the next window while we speak this one
      const nextStart = start + 4;
      void prefetchWindow(nextStart, model);

      // Only speak if we have text and it's enabled
      if (speakEnabled && buf.finalText && buf.finalText.trim()) {
        await playTTSStream(buf.finalText, voiceId, model, buf.audioUrl || null);
      } else if (!buf.finalText || !buf.finalText.trim()) {
        // No text to speak - wait a moment before advancing to avoid rapid-fire
        await new Promise(r => setTimeout(r, 1500));
      }

      // no pacing gap between responses for snappier transitions

      if (!runningRef.current) return;
      processingRef.current = false;
      // Move to next window
      await runLoop(nextStart, model);
    } catch (e: any) {
      processingRef.current = false;
      console.error('Queue error:', e);
      toast({ title: 'Error', description: e.message || 'Processing failed', variant: 'destructive' });
      setRunning(false);
      runningRef.current = false;
    }
  };

  const runLoop = async (start: number, model: string = voiceModel) => {
    if (!runningRef.current) {
      return;
    }
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;
    try {
      let current = start;
      while (runningRef.current) {
        setWindowStart(current);
        setStreamText("");
        setWindowInfo(`Window: [${current}, ${current + 4})`);

        await ensurePrefetched(current);
        const buf = prefetchRef.current;
        if (!buf || buf.start !== current) throw new Error('Missing prefetched data');

        if (!buf.window.length && !buf.finalText) {
          break;
        }

        if (buf.window.length) setChatMessages(prev => [...prev, ...buf.window]);
        setStreamText(buf.finalText || "");

        const nextStart = current + 4;
        void prefetchWindow(nextStart, model);

        if (speakEnabled && buf.finalText && buf.finalText.trim()) {
          await playTTSStream(buf.finalText, voiceId, model, buf.audioUrl || null);
        } else if (!buf.finalText || !buf.finalText.trim()) {
          await new Promise(r => setTimeout(r, 1500));
        }

        if (!runningRef.current) {
          break;
        }
        current = nextStart;
      }
    } catch (e: any) {
      console.error('Loop error:', e);
      toast({ title: 'Error', description: e.message || 'Processing failed', variant: 'destructive' });
      setRunning(false);
      runningRef.current = false;
    } finally {
      processingRef.current = false;
    }
  };

  const playAudioUrl = async (url: string) => {
    const audio = new Audio(url);
    const started = await waitForPlay(audio, 1200);
    if (!started) {
      // try a direct play once more
      try { await audio.play(); } catch {}
    }
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
    });
  };

  const playTTS = async (text: string, voiceId: string) => {
    const resp = await fetch('http://localhost:5174/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || 'TTS failed');
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    try {
      const audio = new Audio(url);
      const started = await waitForPlay(audio, 1200);
      if (!started) {
        try { await audio.play(); } catch {}
      }
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const playOpeningTTS = async (text: string, voiceId: string, model: string) => {
    const resp = await fetch('http://localhost:5174/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId, model_id: model })
    });
    if (!resp.ok) {
      const msg = await resp.text();
      throw new Error(msg || 'TTS failed');
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    try {
      const audio = new Audio(url);
      setOpeningText(text); // show only when we are about to start playback
      const started = await waitForPlay(audio, 1200);
      if (!started) {
        try { await audio.play(); } catch {}
      }
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
      });
    } finally {
      setOpeningText("");
      URL.revokeObjectURL(url);
    }
  };

  const playTTSStream = async (text: string, voiceId: string, model: string, prefetchedAudioUrl: string | null = null) => {
    setStreamText(text);
    
    // For eleven_v3, use prefetched audio buffer
    if (model === 'eleven_v3' && prefetchedAudioUrl) {
      const audio = new Audio(prefetchedAudioUrl);
      const started = await waitForPlay(audio, 1200);
      if (!started) {
        try { await audio.play(); } catch {}
      }
      await new Promise<void>((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(prefetchedAudioUrl);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(prefetchedAudioUrl);
          resolve();
        };
      });
      return;
    }
    
    // For eleven_turbo_v2_5, use streaming
    await new Promise<void>((resolve) => {
      const params = new URLSearchParams({ text, voiceId, model_id: model, output_format: 'mp3_22050_32' });
      const audio = new Audio(`${API_URL}/api/tts-play?${params.toString()}`);
      audio.onloadeddata = () => {
        audio.play().catch(() => {});
      };
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      // Fallback kick if onloadeddata not firing quickly
      setTimeout(() => { if (audio.paused) { audio.play().catch(() => {}); } }, 200);
    });
  };

  const waitForPlay = (audio: HTMLAudioElement, timeoutMs: number): Promise<boolean> => {
    return new Promise((resolve) => {
      let settled = false;
      const onPlay = () => { if (!settled) { settled = true; resolve(true); } };
      const onError = () => { if (!settled) { settled = true; resolve(false); } };
      audio.onplay = onPlay;
      audio.onerror = onError;
      audio.play().catch(() => {});
      setTimeout(() => { if (!settled) { settled = true; resolve(false); } }, timeoutMs);
    });
  };
  
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar
        running={running}
        onStartStop={running ? stopSimulation : startSimulation}
        voiceModel={voiceModel}
        onVoiceModelChange={setVoiceModel}
        voiceId={voiceId}
        onVoiceIdChange={setVoiceId}
        speakEnabled={speakEnabled}
        onSpeakToggle={setSpeakEnabled}
        topic={topic}
        onTopicChange={setTopic}
        windowInfo={windowInfo}
      />
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Stage - Left Panel */}
        <div className="flex-1 relative overflow-hidden">
          <StageBackground windowStart={windowStart} />
          {countdown !== null ? (
            <div className="absolute inset-0 flex items-center justify-center z-50">
              <div className="text-white text-9xl font-bold drop-shadow-2xl">{countdown}</div>
            </div>
          ) : null}
          <NowSpeaking text={openingText || streamText} voiceId={voiceId} modelId={voiceModel} />
        </div>
        
        {/* Chat - Right Panel */}
        <div className="w-full md:w-[400px] lg:w-[500px] border-l border-border bg-card/30 backdrop-blur-sm">
          <ChatList messages={chatMessages} />
        </div>
      </div>
      
      {/* TTS handled inline (non-streaming) */}
    </div>
  );
};

export default Index;
