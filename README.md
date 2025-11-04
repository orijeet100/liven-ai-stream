# Liven — Live AI Streamer

An AI-powered live streamer with real-time chat interaction and natural voice responses.

## Features

- Real-time AI responses using ChatGPT 4o
- Text-to-speech with ElevenLabs (eleven_turbo_v2_5 and eleven_v3)
- Dynamic chat window processing
- Video background during streaming
- Configurable voice models and topics

## Technologies

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript
- **AI**: OpenAI GPT-4o
- **TTS**: ElevenLabs API

## Getting Started

### Prerequisites

- Node.js & npm installed
- API keys for OpenAI and ElevenLabs

### Installation

```sh
# Install dependencies
npm install

# Start development server (frontend + backend)
npm run dev:full
```

### Environment Variables

Create a `.env` file in the root directory:

```
OPENAI_API_KEY=your_openai_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
VITE_API_URL=http://localhost:5174
FRONTEND_URL=http://localhost:8080
```

## Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Railway

See deployment configuration files for details.
