// Edge runtime for Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are **Liven**, a warm, lightly humorous livestream host.

GOALS
- Respond naturally to the current chat window in 1–2 sentences with short humourous replies.
- Maintain tone/continuity with prior replies.
- Add some **audio tags** to enhance delivery maybe 1-2 in every sentence.
  [happy], [sad], [excited], [angry], [whisper], [annoyed], [appalled], [thoughtful], [surprised],
  [laughing], [chuckles], [sighs], [clears throat], [short pause], [long pause], [exhales sharply], [inhales deeply]

AUDIO-TAG RULES
- Tags must describe **voice** only (no actions like [walking], no music/sfx).
- Place tags at natural spots: before/after the phrase they affect.
- Keep tags tasteful and sparse (max 2 per reply).
- Do not contradict meaning; do not introduce sensitive/NSFW content.

STYLE
- Spoken-aloud, concise, subtly witty (never cringe).
- Acknowledge users by name when appropriate (avoid robotic name lists).
- If messages relate to prior replies, continue the thread smoothly; otherwise, transition briefly.
- Do not repeat points already covered recently.
- Output ONLY the final spoken line(s); no meta text, no brackets except audio tags.`;


// In-memory storage
let csvData: any[] = [];
let previousAIReplies: string[] = [];
let previousWindows: string[] = [];

// Load CSV on cold start
async function loadCSV() {
  if (csvData.length > 0) return;
  
  try {
    const csvText = await Deno.readTextFile('/var/task/data/data_stream_regular.csv');
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    csvData = lines.slice(1).map(line => {
      const values = line.split(',');
      return {
        username: values[0],
        message: values[1],
        time_counter: parseInt(values[2]),
      };
    });
  } catch (error) {
    console.error('Failed to load CSV:', error);
    csvData = [];
  }
}

function getWindow(start: number, windowSize = 4) {
  return csvData.filter(row => 
    row.time_counter >= start && row.time_counter < start + windowSize
  );
}

function getLast3PerUser(beforeTime: number) {
  const userMessages: Record<string, string[]> = {};
  
  csvData
    .filter(row => row.time_counter < beforeTime)
    .forEach(row => {
      if (!userMessages[row.username]) {
        userMessages[row.username] = [];
      }
      userMessages[row.username].push(row.message);
    });
  
  const result: string[] = [];
  Object.entries(userMessages).forEach(([user, messages]) => {
    const last3 = messages.slice(-3);
    result.push(`${user}: ${last3.join('; ')}`);
  });
  
  return result.join('\n');
}

function buildUserPrompt(params: {
  topic: string;
  currentWindow: any[];
}) {
  const prevAI = previousAIReplies.slice(-2).join('\n') || '(none yet)';
  const prevWindows = previousWindows.slice(-2).join('\n\n') || '(none yet)';
  const perUserLast3 = getLast3PerUser(params.currentWindow[0]?.time_counter || 1);
  const currentWindowText = params.currentWindow
    .map(m => `${m.username}: ${m.message}`)
    .join('\n');
  
  return `You are mid-stream. Use prior context ONLY for continuity—your answer must be driven by the CURRENT WINDOW.

Previous AI replies (last 2):
${prevAI}

Recent chat windows (last 2):
${prevWindows}

Recent 3 messages per user (memory):
${perUserLast3 || '(n/a)'}

CURRENT LIVE CHAT WINDOW (respond to THESE now; avoid repeating already-covered points):
${currentWindowText}

Now reply in 1-2 sentences, conversational, flowing naturally from prior replies if related.`;
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    await loadCSV();
    
    const url = new URL(req.url);
    const start = parseInt(url.searchParams.get('start') || '1');
    const topic = url.searchParams.get('topic') || 'General Discussion';
    const model = url.searchParams.get('model') || 'grok-2';
    
    const currentWindow = getWindow(start);
    
    if (currentWindow.length === 0) {
      return new Response('data: [DONE]\n\n', {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }
    
    const userPrompt = buildUserPrompt({ topic, currentWindow });
    
    const XAI_API_KEY = Deno.env.get('XAI_API_KEY');
    if (!XAI_API_KEY) {
      throw new Error('XAI_API_KEY not configured');
    }
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-4-fast-non-reasoning',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI API error:', response.status, errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send window data first
        const windowEvent = `event: window\ndata: ${JSON.stringify(currentWindow)}\n\n`;
        controller.enqueue(encoder.encode(windowEvent));
        
        let fullText = '';
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  
                  if (content) {
                    fullText += content;
                    const tokenEvent = `event: token\ndata: ${content}\n\n`;
                    controller.enqueue(encoder.encode(tokenEvent));
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (e) {
          console.error('Stream error:', e);
        }
        
        // Send final event - trim to max 3 sentences
        const sentences = fullText.split(/[.!?]+/).filter(s => s.trim()).slice(0, 3);
        const finalText = sentences.join('. ').trim() + (sentences.length > 0 ? '.' : '');
        const finalEvent = `event: final\ndata: ${finalText}\n\n`;
        controller.enqueue(encoder.encode(finalEvent));

        // Update memory
        previousAIReplies.push(finalText);
        if (previousAIReplies.length > 2) previousAIReplies.shift();
        
        const windowText = currentWindow.map(m => `${m.username}: ${m.message}`).join('\n');
        previousWindows.push(windowText);
        if (previousWindows.length > 2) previousWindows.shift();
        
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });
    
  } catch (error: any) {
    console.error('llm-stream error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
