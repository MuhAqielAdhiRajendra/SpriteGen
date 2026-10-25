import express from 'express';
import type { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  SPRITE_SYSTEM_PROMPT,
  SPEC_JSON_SCHEMA,
  REFERENCE_ANALYSIS_SCHEMA,
  REFERENCE_ANALYSIS_PROMPT,
  validateSpec,
  DEFAULT_SPEC,
  CharacterSpec,
  countSilhouetteDifferences,
  validateReferenceImagePayload
} from './src/utils/pixelforgeSpec.ts';

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
        model: model || process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
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

// Diversity Guard memory: simpan 5 spec terakhir dan prompt terakhir
const recentSpecs: CharacterSpec[] = [];
let lastPrompt: string | null = null;

function checkDiversity(candidate: CharacterSpec, history: CharacterSpec[]): { isDiverse: boolean; minDiff: number } {
  if (history.length === 0) return { isDiverse: true, minDiff: 99 };
  let minDiff = 99;
  for (const prev of history) {
    const diff = countSilhouetteDifferences(candidate, prev);
    if (diff < minDiff) {
      minDiff = diff;
    }
  }
  return { isDiverse: minDiff >= 3, minDiff };
}

// 4. Gemini Generation & Art Director Endpoint (2-Step Vision + Spec + Diversity Guard)
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  const { prompt, referenceImage } = req.body;
  const gemini = getGeminiClient();

  if (!gemini) {
    return res.json({
      success: false,
      source: 'fallback',
      reason: 'GEMINI_API_KEY tidak dikonfigurasi di server environment (.env)',
      spec: null
    });
  }

  // Validasi server-side untuk referenceImage (Tahap 1b)
  if (referenceImage) {
    const imgValidation = validateReferenceImagePayload(referenceImage);
    if (!imgValidation.valid) {
      return res.status(400).json({
        success: false,
        source: 'fallback',
        reason: `Validasi gambar referensi gagal: ${imgValidation.error}`,
        spec: null
      });
    }
  }

  try {
    let referenceAnalysis: any = null;

    // Langkah A: Analisis Gambar Referensi (jika ada)
    if (referenceImage && referenceImage.data && referenceImage.mimeType) {
      try {
        const rawBase64 = String(referenceImage.data).replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
        const visionResp = await gemini.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
          contents: [
            {
              inlineData: {
                mimeType: referenceImage.mimeType,
                data: rawBase64
              }
            },
            {
              text: 'Analisis gambar referensi karakter pixel art ini secara presisi sesuai responseSchema.'
            }
          ],
          config: {
            systemInstruction: REFERENCE_ANALYSIS_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: REFERENCE_ANALYSIS_SCHEMA as any,
            temperature: 0.2
          }
        });

        const visionText = visionResp.text || '';
        const cleanVisionJson = visionText.replace(/```json/g, '').replace(/```/g, '').trim();
        referenceAnalysis = JSON.parse(cleanVisionJson);

        // Log JSON hasil analisis referensi di konsol server (Tahap 1d)
        console.log('[Vision Reference Analysis Result]:\n', JSON.stringify(referenceAnalysis, null, 2));
      } catch (visionErr: any) {
        console.warn('Langkah A (Vision Analysis) gagal atau dilewati:', visionErr.message);
      }
    }

    // Langkah B: Pembuatan CharacterSpec Lengkap
    let promptForSpec = prompt;
    if (referenceAnalysis) {
      promptForSpec = `${prompt}

[DATA ANALISIS REFERENSI VISUAL]:
${JSON.stringify(referenceAnalysis, null, 2)}

ATURAN PENTING:
1. Jadikan hasil analisis referensi visual di atas sebagai acuan bentuk anatomi, proporsi, gaya rambut, pakaian, dan palet warna.
2. Jika ada instruksi user di atas yang secara spesifik meminta perbedaan (misal warna lain atau senjata lain), perintah teks user MENANG dan menggantikan bagian referensi tersebut.`;
    }

    const response = await gemini.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      contents: promptForSpec,
      config: {
        systemInstruction: SPRITE_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: SPEC_JSON_SCHEMA as any,
        temperature: 0.8
      }
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      return res.json({
        success: false,
        source: 'fallback',
        reason: 'Model menghasilkan format respons yang bukan JSON valid',
        spec: null
      });
    }

    let { spec, errors } = validateSpec(parsed);

    // Retry 1x jika validasi skema gagal
    if (!spec) {
      const retryResp = await gemini.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        contents: `${promptForSpec}\n\nPERBAIKI kesalahan validasi schema berikut:\n- ${errors.join('\n- ')}`,
        config: {
          systemInstruction: SPRITE_SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: SPEC_JSON_SCHEMA as any,
          temperature: 0.3
        }
      });
      const retryText = retryResp.text || '';
      try {
        const retryParsed = JSON.parse(retryText.replace(/```json/g, '').replace(/```/g, '').trim());
        const retryValidation = validateSpec(retryParsed);
        if (retryValidation.spec) {
          spec = retryValidation.spec;
        }
      } catch {}
    }

    if (!spec) {
      return res.json({
        success: false,
        source: 'fallback',
        reason: `Validasi CharacterSpec gagal setelah retry: ${errors.join(', ')}`,
        spec: null
      });
    }

    // Diversity Guard (Tahap 1a):
    // HANYA aktif bila prompt BERBEDA dari request sebelumnya.
    // Jika prompt sama persis (regenerate yang sama), jangan dipaksa berubah siluetnya.
    const isDifferentPrompt = lastPrompt !== null && prompt.trim().toLowerCase() !== lastPrompt.trim().toLowerCase();
    const diversityCheck = checkDiversity(spec, recentSpecs);

    if (isDifferentPrompt && !diversityCheck.isDiverse) {
      try {
        const diversityRetry = await gemini.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
          contents: `${promptForSpec}

[PERINGATAN DIVERSITY GUARD]: Prompt baru ini menghasilkan siluet yang terlalu mirip dengan karakter sesi sebelumnya (hanya beda ${diversityCheck.minDiff} aspek siluet).
ATURAN RETRY DIVERSITY:
1. PENTING: JANGAN mengubah elemen yang diminta secara EKSPLISIT oleh user di prompt (misal jika user minta pedang, tetap gunakan pedang; jika user minta jubah atau helm, pertahankan).
2. UBAH MINIMAL 3 ASPEK SILUET LAINNYA yang tidak dikunci prompt, seperti:
   - proportions: height (short/normal/tall), headSize (small/normal/big), torsoWidth (1/2/3), legLength, armThickness
   - body (slim/normal/heavy), cape, traits (horns, pointy_ears, tail, hunch, wings, beard), atau accessories.`,
          config: {
            systemInstruction: SPRITE_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: SPEC_JSON_SCHEMA as any,
            temperature: 0.9
          }
        });

        const divText = diversityRetry.text || '';
        const divParsed = JSON.parse(divText.replace(/```json/g, '').replace(/```/g, '').trim());
        const divValid = validateSpec(divParsed);
        if (divValid.spec) {
          spec = divValid.spec;
        }
      } catch (divErr: any) {
        console.warn('Diversity guard retry skipped:', divErr.message);
      }
    }

    // Simpan ke history recentSpecs (maks 5) dan catat lastPrompt
    recentSpecs.push(spec);
    if (recentSpecs.length > 5) recentSpecs.shift();
    lastPrompt = prompt;

    return res.json({
      success: true,
      source: 'gemini',
      usedReference: !!referenceAnalysis,
      referenceAnalysis,
      spec,
      validationErrors: []
    });
  } catch (err: any) {
    return res.json({
      success: false,
      source: 'fallback',
      reason: `Panggilan API Gemini gagal: ${err.message}`,
      spec: null
    });
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
      model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
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
    console.log(`PixelForge AI Studio Server running at:`);
    console.log(`  > Local:   http://localhost:${PORT}`);
    console.log(`  > Network: http://127.0.0.1:${PORT}`);
  });
}

startServer();
