import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '20mb' }));

// CORS headers for local/cross-origin development
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Helper for Gemini AI instance
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') return null;
  try {
    return new GoogleGenAI({ apiKey });
  } catch {
    return null;
  }
}

// 1. Connection Test Endpoint
app.post('/api/ai/test-connection', async (req: Request, res: Response) => {
  const { type, baseUrl, apiKey, model } = req.body;
  const startTime = Date.now();

  try {
    if (type === 'gemini') {
      const gemini = getGeminiClient();
      if (!gemini) {
        return res.status(400).json({
          success: false,
          latencyMs: Date.now() - startTime,
          message: 'GEMINI_API_KEY belum dikonfigurasi di server environment.'
        });
      }
      const response = await gemini.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: 'Ping test. Reply with word OK.'
      });
      return res.json({
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Koneksi Gemini AI Berhasil!',
        details: { response: response.text }
      });
    }

    if (type === 'ollama') {
      const targetUrl = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}/api/tags`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const resp = await fetch(targetUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        throw new Error(`Ollama returned status ${resp.status}: ${resp.statusText}`);
      }

      const data = await resp.json();
      return res.json({
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'Koneksi ke Ollama Local LLM Berhasil!',
        details: { models: data.models?.map((m: any) => m.name) || [] }
      });
    }

    if (type === 'omniroute' || type === 'custom') {
      const targetUrl = `${(baseUrl || 'https://api.openrouter.ai/v1').replace(/\/$/, '')}/models`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const resp = await fetch(targetUrl, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      return res.json({
        success: resp.ok,
        latencyMs: Date.now() - startTime,
        message: resp.ok ? 'Koneksi ke OmniRoute/OpenAI Endpoint Berhasil!' : `Server merespon dengan status ${resp.status}`,
        status: resp.status
      });
    }

    if (type === 'mcp') {
      const targetUrl = `${(baseUrl || 'http://localhost:8000/mcp').replace(/\/$/, '')}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // JSON-RPC ping
      const resp = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
          params: {}
        }),
        signal: controller.signal
      }).catch(err => {
        throw new Error(`MCP Bridge gagal dihubungi: ${err.message}`);
      });
      clearTimeout(timeout);

      const data = await resp.json().catch(() => ({}));
      return res.json({
        success: true,
        latencyMs: Date.now() - startTime,
        message: 'MCP (Model Context Protocol) Bridge Terhubung!',
        details: data
      });
    }

    return res.json({
      success: true,
      latencyMs: Date.now() - startTime,
      message: 'Provider terverifikasi.'
    });
  } catch (err: any) {
    const isConnRefused = err.message?.includes('ECONNREFUSED') || err.message?.includes('fetch failed');
    return res.json({
      success: false,
      latencyMs: Date.now() - startTime,
      message: isConnRefused 
        ? `${type === 'ollama' ? 'Ollama' : type === 'mcp' ? 'MCP Bridge' : 'Service'} belum aktif di host tersebut`
        : (err.message || 'Koneksi gagal diperiksa.'),
      hint: type === 'ollama' 
        ? 'Buka terminal lokal Anda lalu jalankan: OLLAMA_ORIGINS="*" ollama serve' 
        : type === 'mcp'
        ? 'Pastikan MCP Bridge daemon berjalan di port 8000.'
        : 'Periksa URL host dan status jaringan Anda.'
    });
  }
});

// 2. Proxy to Ollama
app.post('/api/proxy/ollama', async (req: Request, res: Response) => {
  const { baseUrl, endpoint = '/api/generate', payload } = req.body;
  const targetUrl = `${(baseUrl || 'http://localhost:11434').replace(/\/$/, '')}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      return res.status(resp.status).json({ error: errText });
    }

    const data = await resp.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({
      error: `Gagal menghubungi Ollama di ${targetUrl}: ${err.message}`,
      isLocalOffline: true
    });
  }
});

// 3. Proxy to Custom / OmniRoute
app.post('/api/proxy/custom', async (req: Request, res: Response) => {
  const { baseUrl, endpoint = '/chat/completions', apiKey, payload, headers: customHeaders } = req.body;
  const targetUrl = `${baseUrl.replace(/\/$/, '')}${endpoint}`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const resp = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: `Gagal memanggil endpoint kustom: ${err.message}` });
  }
});

// 4. Gemini Generation & Evaluation Endpoint
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  const { prompt, resolution, paletteName, archetype } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    return res.json({
      success: false,
      useFallback: true,
      message: 'GEMINI_API_KEY tidak tersedia di backend server. Menggunakan neural procedural parser.'
    });
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an expert retro pixel artist. Analyze this character sprite request:
Prompt: "${prompt}"
Resolution: ${resolution}x${resolution}
Archetype: ${archetype}
Palette: ${paletteName}

Provide a JSON object with:
{
  "characterName": "creative short name",
  "archetype": "knight | mage | cyberpunk | rogue | mecha | archer | monster | paladin",
  "direction": "front | side | isometric",
  "dominantColors": ["#hex1", "#hex2"],
  "anatomy": {
    "head": "description of headgear/hair/eyes",
    "torso": "description of clothing/armor",
    "weapon": "description of weapon in hand",
    "accessory": "description of cloak, wings, shield, or cybernetics"
  },
  "visualAdvice": "concise tip for pixel clustering and readability"
}
Output pure JSON only without markdown formatting.`
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ success: true, analysis: parsed });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, useFallback: true });
  }
});

// 5. Gemini Visual Evaluation & Critique Endpoint
app.post('/api/gemini/evaluate', async (req: Request, res: Response) => {
  const { prompt, resolution, critiqueSummary, detectedFeatures } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    return res.json({ success: false, error: 'GEMINI_API_KEY tidak ditemukan', useFallback: true });
  }

  try {
    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a senior pixel art art director.
Review this generated ${resolution}x${resolution} sprite based on the prompt: "${prompt}".
Detected Features: ${JSON.stringify(detectedFeatures)}
Technical Density Critique: "${critiqueSummary}"

Evaluate if the sprite adheres accurately to the user prompt and pixel art aesthetics.
Output a JSON response in Indonesian:
{
  "adherenceScore": number (60-98),
  "silhouetteScore": number (60-98),
  "paletteHarmonyScore": number (60-98),
  "overallQuality": "exceptional" | "approved" | "needs_refinement",
  "verdict": "kalimat penilaian komprehensif apakah sprite ini sesuai dengan prompt",
  "critique": "ulasan detail tentang anatomi, proporsi, pencahayaan, dan kontras",
  "suggestedFixes": ["rekomendasi perbaikan konkret 1", "rekomendasi 2"]
}
Output pure JSON only.`
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return res.json({ success: true, evaluation: parsed });
  } catch (err: any) {
    return res.json({ success: false, error: err.message, useFallback: true });
  }
});

// Serve Vite frontend
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PixelForge AI Studio Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
