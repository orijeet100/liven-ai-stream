import express from "express";
import cors from "cors";
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { fileURLToPath } from "url";

loadEnv();

// __dirname shim for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load voice configuration
const voiceConfigPath = path.join(__dirname, "..", "voice-config.json");
let voiceConfig: Record<string, any> = {};
try {
  const configData = fs.readFileSync(voiceConfigPath, "utf-8");
  voiceConfig = JSON.parse(configData);
} catch (e) {
  console.warn("Failed to load voice-config.json, using defaults:", (e as Error).message);
  // Fallback defaults
  voiceConfig = {
    eleven_v3: {
      stability: 0.5,
      similarity_boost: 0.70,
      speed: 1,
      style_exaggeration: 0,
      output_format: "mp3_44100_128"
    },
    eleven_turbo_v2_5: {
      stability: 0.70,
      similarity_boost: 0.7,
      speed: 1,
      output_format: "mp3_22050_32"
    }
  };
}

function getVoiceSettings(modelId: string) {
  const config = voiceConfig[modelId] || voiceConfig.eleven_turbo_v2_5;
  return {
    stability: config.stability,
    similarity_boost: config.similarity_boost,
    speed: config.speed,
    ...(config.style_exaggeration !== undefined && { style_exaggeration: config.style_exaggeration })
  };
}

function getOutputFormat(modelId: string) {
  const config = voiceConfig[modelId] || voiceConfig.eleven_turbo_v2_5;
  return config.output_format || "mp3_22050_32";
}

const app = express();

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL 
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:8080']);

console.log('CORS allowed origins:', allowedOrigins);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
    if (allowedOrigins.length === 0) {
      console.warn('No FRONTEND_URL set! Allowing all origins (not secure for production)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`CORS blocked origin: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

type ChatRow = { username: string; message: string; time_counter: number };

let csvData: ChatRow[] = [];
let previousAIReplies: string[] = [];
let previousWindows: string[] = [];

function loadCSVOnce() {
  if (csvData.length > 0) return;
  const csvPath = path.resolve(process.cwd(), "data_stream_regular.csv");
  if (!fs.existsSync(csvPath)) {
    console.warn(`CSV not found at ${csvPath}`);
    csvData = [];
    return;
  }
  const text = fs.readFileSync(csvPath, "utf-8").trim();
  const lines = text.split(/\r?\n/);
  const headers = lines[0].split(",");
  const idxUser = headers.indexOf("username");
  const idxMessage = headers.indexOf("message");
  const idxTime = headers.indexOf("time_counter");
  csvData = lines.slice(1).map((line) => {
    const values = line.split(",");
    return {
      username: values[idxUser],
      message: values[idxMessage],
      time_counter: parseInt(values[idxTime], 10),
    };
  });
}

function getWindow(start: number, windowSize = 4) {
  return csvData.filter(
    (row) => row.time_counter >= start && row.time_counter < start + windowSize
  );
}

function getLast3PerUser(beforeTime: number) {
  const userMessages: Record<string, string[]> = {};
  csvData
    .filter((row) => row.time_counter < beforeTime)
    .forEach((row) => {
      if (!userMessages[row.username]) userMessages[row.username] = [];
      userMessages[row.username].push(row.message);
    });
  const result: string[] = [];
  Object.entries(userMessages).forEach(([user, messages]) => {
    const last3 = messages.slice(-3);
    result.push(`${user}: ${last3.join("; ")}`);
  });
  return result.join("\n");
}

function getSystemPersona(voiceModel: string) {
  const basePersona = `You are **Liven**, a warm, lightly humorous livestream host.

GOALS
- Respond naturally to the current chat window in 1–2 sentences with short humourous replies.
- Maintain tone/continuity with prior replies.`;

  const audioTagsSection = `- Add some **audio tags** to enhance delivery maybe 1-2 in every sentence.
  [happy], [sad], [excited], [angry], [whisper], [annoyed], [appalled], [thoughtful], [surprised],
  [laughing], [chuckles], [sighs], [clears throat], [short pause], [long pause], [exhales sharply], [inhales deeply]

AUDIO-TAG RULES
- Tags must describe **voice** only (no actions like [walking], no music/sfx).
- Place tags at natural spots: before/after the phrase they affect.
- Keep tags tasteful and sparse (max 2 per reply).
- Do not contradict meaning; do not introduce sensitive/NSFW content.`;

  const styleSection = `STYLE
- Spoken-aloud, concise, subtly witty (never cringe).
- Acknowledge users by name when appropriate (avoid robotic name lists).
- If messages relate to prior replies, continue the thread smoothly; otherwise, transition briefly.
- Do not repeat points already covered recently.`;

  if (voiceModel === 'eleven_v3') {
    return `${basePersona}
${audioTagsSection}
${styleSection}
- Output ONLY the final spoken line(s); no meta text, no brackets except audio tags.`;
  } else {
    // eleven_turbo_v2_5 - no audio tags
    return `${basePersona}
${styleSection}
- Output ONLY the final spoken line(s); no meta text, no brackets.`;
  }
}

function buildUserPrompt(topic: string, currentWindow: ChatRow[]) {
  const prevAI = previousAIReplies.slice(-2).join("\n") || "(none yet)";
  const prevWindowsText = previousWindows.slice(-2).join("\n\n") || "(none yet)";
  const perUserLast3 = getLast3PerUser(currentWindow[0]?.time_counter ?? 1);
  const currentWindowText = currentWindow
    .map((m) => `${m.username}: ${m.message}`)
    .join("\n");
  return `You are mid-stream. Use prior context ONLY for continuity—your answer must be driven by the CURRENT WINDOW.

Previous AI replies (last 2):
${prevAI}

Recent chat windows (last 2):
${prevWindowsText}

Recent 3 messages per user (memory):
${perUserLast3 || "(n/a)"}

CURRENT LIVE CHAT WINDOW (respond to THESE now; avoid repeating already-covered points):
${currentWindowText}

Now reply in 1-2 sentences, conversational, flowing naturally from prior replies if related.`;
}

app.get("/api/llm-stream", async (req, res) => {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) {
    return res.status(500).json({ error: "XAI_API_KEY not configured" });
  }
  loadCSVOnce();
  const start = parseInt((req.query.start as string) || "1", 10);
  const topic = (req.query.topic as string) || "Exploring AI Streamers & Agent Personalities";
  const currentWindow = getWindow(start);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event: string, data: string) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${data}\n\n`);
  };

  if (currentWindow.length === 0) {
    res.write("data: [DONE]\n\n");
    return res.end();
  }

  // send window first
  sendEvent("window", JSON.stringify(currentWindow));

  const userPrompt = buildUserPrompt(topic, currentWindow);
  const voiceModel = (req.query.voiceModel as string) || "eleven_turbo_v2_5";
  const systemPersona = getSystemPersona(voiceModel);
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: [
          { role: "system", content: systemPersona },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      res.write(`event: error\n`);
      res.write(`data: Failed upstream: ${response.status}\n\n`);
      return res.end();
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((l) => l.trim());
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              sendEvent("token", content);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      // ignore mid-stream errors and close
    }

    const sentences = fullText
      .split(/[.!?]+/)
      .filter((s) => s.trim())
      .slice(0, 3);
    const finalText = sentences.join(". ").trim() + (sentences.length > 0 ? "." : "");
    sendEvent("final", finalText);

    previousAIReplies.push(finalText);
    if (previousAIReplies.length > 2) previousAIReplies.shift();
    const windowText = currentWindow.map((m) => `${m.username}: ${m.message}`).join("\n");
    previousWindows.push(windowText);
    if (previousWindows.length > 2) previousWindows.shift();

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e) {
    res.write(`event: error\n`);
    res.write(`data: ${(e as Error).message}\n\n`);
    res.end();
  }
});

app.get("/api/llm-generate", async (req, res) => {
  const XAI_API_KEY = process.env.XAI_API_KEY;
  if (!XAI_API_KEY) {
    return res.status(500).json({ error: "XAI_API_KEY not configured" });
  }
  loadCSVOnce();
  const start = parseInt((req.query.start as string) || "1", 10);
  const topic = (req.query.topic as string) || "Exploring AI Streamers & Agent Personalities";
  const voiceModel = (req.query.voiceModel as string) || "eleven_turbo_v2_5";
  const currentWindow = getWindow(start);
  if (currentWindow.length === 0) {
    return res.json({ window: [], finalText: "" });
  }

  const userPrompt = buildUserPrompt(topic, currentWindow);
  const systemPersona = getSystemPersona(voiceModel);
  try {
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-4-fast-non-reasoning",
        messages: [
          { role: "system", content: systemPersona },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        stream: false,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({ error: `xAI error ${response.status}: ${errorText}` });
    }
    const json = await response.json();
    const full = json?.choices?.[0]?.message?.content?.trim() || "";
    // Trim to <= 3 sentences for safety
    const sentences = full.split(/[.!?]+/).filter((s: string) => s.trim()).slice(0, 3);
    const finalText = sentences.join('. ').trim() + (sentences.length > 0 ? '.' : '');

    // Update memory
    previousAIReplies.push(finalText);
    if (previousAIReplies.length > 2) previousAIReplies.shift();
    const windowText = currentWindow.map((m) => `${m.username}: ${m.message}`).join("\n");
    previousWindows.push(windowText);
    if (previousWindows.length > 2) previousWindows.shift();

    return res.json({ window: currentWindow, finalText });
  } catch (e) {
    return res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/api/tts", async (req, res) => {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
  }
  const { text, voiceId, model_id = "eleven_v3" } = req.body || {};
  if (!text || !voiceId) return res.status(400).json({ error: "text and voiceId required" });

  try {
    // Get settings from config file
    const voiceSettings = getVoiceSettings(model_id);
    const output_format = getOutputFormat(model_id);
    
    // For eleven_v3, use non-streaming endpoint
    // For eleven_turbo_v2_5, use streaming endpoint
    const useStreaming = model_id !== "eleven_v3";
    const url = useStreaming
      ? `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream`
      : `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`;
    
    const body = {
      text,
      model_id,
      output_format,
      voice_settings: voiceSettings,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unable to read error');
      console.error(`TTS failed for ${model_id}:`, response.status, errText);
      return res.status(500).json({ error: `TTS failed: ${response.status} ${errText}` });
    }
    
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    
    if (model_id === "eleven_v3") {
      // For v3, get full response as buffer (non-streaming)
      const audioBuffer = await response.arrayBuffer();
      if (audioBuffer.byteLength === 0) {
        return res.status(500).json({ error: "Empty audio response from ElevenLabs" });
      }
      const buffer = Buffer.from(audioBuffer);
      res.write(buffer);
      res.end();
    } else {
      // For turbo, stream the response
      if (!response.body) {
        return res.status(500).json({ error: "No response body" });
      }
      const reader = response.body.getReader();
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) return res.end();
        res.write(value);
        return pump();
      };
      await pump();
    }
  } catch (e) {
    console.error("TTS error:", e);
    res.status(500).json({ error: (e as Error).message });
  }
});

app.get("/api/tts-play", async (req, res) => {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
  }
  const text = (req.query.text as string) || "";
  const voiceId = (req.query.voiceId as string) || "";
  const model_id = (req.query.model_id as string) || "eleven_turbo_v2_5";
  if (!text || !voiceId) return res.status(400).json({ error: "text and voiceId required" });

  try {
    // Get settings from config file
    const voiceSettings = getVoiceSettings(model_id);
    const output_format = getOutputFormat(model_id);
    
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(
      voiceId
    )}/stream?output_format=${encodeURIComponent(output_format)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id,
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text();
      return res.status(500).json({ error: `TTS failed: ${response.status} ${errText}` });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    const reader = response.body.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) return res.end();
      res.write(value);
      return pump();
    };
    await pump();
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const PORT = Number(process.env.PORT || 5174);
const serverHttp = http.createServer(app);

// WebSocket proxy to ElevenLabs stream-input API
(() => {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVENLABS_API_KEY) return;
  const wss = new WebSocketServer({ server: serverHttp, path: "/api/tts-ws" });
  wss.on("connection", async (client, req) => {
    try {
      const url = new URL(req.url || "http://localhost");
      const voiceId = url.searchParams.get("voiceId") || "";
      const modelId = url.searchParams.get("model_id") || "eleven_v3";
      if (!voiceId) {
        client.close(1008, "voiceId required");
        return;
      }
      const upstream = new WebSocket(
        `wss://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream-input`,
        {
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Accept": "*/*",
          },
        }
      );
      upstream.on("open", () => {
        // Optionally send initial session config
        const voiceSettings = getVoiceSettings(modelId);
        const init = {
          text: "", // no immediate text
          voice_settings: voiceSettings,
          model_id: modelId,
        };
        upstream.send(JSON.stringify(init));
      });
      upstream.on("message", (data, isBinary) => {
        // Forward binary audio frames or any control messages directly
        client.send(data, { binary: isBinary });
      });
      upstream.on("close", () => client.close());
      upstream.on("error", () => client.close());

      client.on("message", (data, isBinary) => {
        if (isBinary) return; // ignore binary from client
        upstream.send(data.toString());
      });
      client.on("close", () => upstream.close());
      client.on("error", () => upstream.close());
    } catch {
      try { client.close(); } catch {}
    }
  });
})();

serverHttp.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});


