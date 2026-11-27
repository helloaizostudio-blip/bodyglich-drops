#!/usr/bin/env node
/**
 * Reference live bridge for Aiko Studio.
 *
 * - WebSocket server that avatar windows (browser / OBS browser source) connect to.
 * - Tiny HTTP API so any tool (Stream Deck, bots, scripts, an AI backend)
 *   can control the avatar:
 *
 *     curl -X POST localhost:8787/command -H 'content-type: application/json' \
 *          -d '{"type":"expression","name":"happy"}'
 *
 *     curl -X POST localhost:8787/command -d '{"type":"speak","text":"Hello chat!"}'
 *     curl -X POST localhost:8787/command -d '{"type":"stats","viewers":42,"subscribers":1300}'
 *
 * This is where secrets belong. To add an AI voice, implement `generateReply`
 * below with your LLM + TTS provider, reading API keys from environment
 * variables (never ship them to the browser), then broadcast
 * { type: "speak", audio: <base64 audio> } and an { type: "expression" }.
 */
import http from 'node:http';
import { WebSocketServer } from 'ws';

const PORT = Number(process.env.BRIDGE_PORT || 8787);
const ALLOWED_ORIGINS = (process.env.BRIDGE_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173')
  .split(',')
  .map((s) => s.trim());
const TOKEN = process.env.BRIDGE_TOKEN || ''; // optional shared secret for the HTTP API

const server = http.createServer(async (req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type, authorization');
  if (req.method === 'OPTIONS') return res.end();
  if (req.method === 'GET' && req.url === '/health') {
    res.setHeader('content-type', 'application/json');
    return res.end(JSON.stringify({ ok: true, clients: wss.clients.size }));
  }
  if (req.method === 'POST' && req.url === '/command') {
    if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
      res.statusCode = 401;
      return res.end('unauthorized');
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 20 * 1024 * 1024) {
        res.statusCode = 413;
        return res.end('too large');
      }
    }
    try {
      const msg = JSON.parse(body);
      if (!msg || typeof msg.type !== 'string') throw new Error('missing type');
      if (msg.type === 'ask' && typeof msg.text === 'string') {
        await generateReply(msg.text);
      } else {
        broadcast(msg);
      }
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ ok: true, delivered: wss.clients.size }));
    } catch (e) {
      res.statusCode = 400;
      return res.end(`bad request: ${e.message}`);
    }
  }
  res.statusCode = 404;
  res.end('not found');
});

const wss = new WebSocketServer({
  server,
  verifyClient: ({ origin }) => !origin || ALLOWED_ORIGINS.includes(origin) || origin === 'null',
});

wss.on('connection', (ws, req) => {
  console.log(`[bridge] avatar connected from ${req.headers.origin ?? 'unknown'} (${wss.clients.size} total)`);
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(String(data));
      if (msg.type === 'hello') return;
      console.log('[bridge] from avatar:', msg);
    } catch {
      /* ignore */
    }
  });
  ws.on('close', () => console.log(`[bridge] avatar disconnected (${wss.clients.size} total)`));
});

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(data);
}

/**
 * Plug your AI assistant in here. Example outline (pseudo-code):
 *
 *   const reply = await llm.chat({ apiKey: process.env.LLM_API_KEY, prompt: text });
 *   const audio = await tts.synthesize({ apiKey: process.env.TTS_API_KEY, text: reply.text }); // mp3/wav bytes
 *   broadcast({ type: 'expression', name: reply.emotion ?? 'happy' });
 *   broadcast({ type: 'speak', audio: Buffer.from(audio).toString('base64') });
 *
 * Without a provider configured we fall back to the browser's built-in TTS.
 */
async function generateReply(text) {
  broadcast({ type: 'expression', name: 'happy' });
  broadcast({ type: 'speak', text: `You said: ${text}. Connect an AI provider in server/bridge.mjs to give me a real brain!` });
}

server.listen(PORT, () => {
  console.log(`[bridge] ws://localhost:${PORT}  ·  POST http://localhost:${PORT}/command`);
  console.log(`[bridge] allowed origins: ${ALLOWED_ORIGINS.join(', ')}`);
});
