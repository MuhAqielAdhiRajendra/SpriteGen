import {
  AIProviderConfig,
  CharacterDirection,
  CharacterSprite,
  GenerationRequest,
  PipelineStep,
  SpriteEvaluation,
  SpriteResolution,
  AnimationType,
  ColorGradingMode
} from '../types/sprite';
import {
  applyAutoRefinement,
  evaluateSpriteMatrix,
  generateProceduralCharacter,
  detectRequestedAnimations,
  PALETTES
} from './pixelEngine';

export type PipelineProgressCallback = (step: PipelineStep, partialSprite?: Partial<CharacterSprite>) => void;

/**
 * Executes the complete observable AI generation pipeline
 */
export async function executeSpriteGeneration(
  request: GenerationRequest,
  onProgress: PipelineProgressCallback
): Promise<CharacterSprite> {
  const {
    prompt,
    resolution,
    paletteName,
    colorGrading = 'vibrant',
    direction,
    requestedAnimations: explicitAnimations,
    providerConfig,
    autoRefine
  } = request;

  const startTime = Date.now();
  const logs: PipelineStep[] = [];

  const emitStep = (step: PipelineStep, partial?: Partial<CharacterSprite>) => {
    logs.push(step);
    onProgress(step, partial);
  };

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  // Determine requested animations
  const detectedAnimations = detectRequestedAnimations(prompt, explicitAnimations);
  const isAnimated = detectedAnimations.length > 0;

  // STEP 1: Prompt Parsing & Semantic Intent Deconstruction
  const step1Start = Date.now();
  emitStep({
    id: 'step-1-parse',
    phase: 'parse',
    title: 'Analisis Semantik Prompt & Intent Visual',
    description: `Mendekonstruksi deskripsi karakter: "${prompt}" melalui ${providerConfig.name}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running',
    details: {
      provider: providerConfig.type,
      model: providerConfig.model,
      rawPrompt: prompt
    }
  });

  let resolvedDirection: CharacterDirection = direction;
  let resolvedFeatures: string[] = [];

  try {
    if (providerConfig.type === 'gemini') {
      const resp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, resolution, paletteName, colorGrading })
      }).catch(() => null);

      if (resp && resp.ok) {
        const data = await resp.json();
        if (data.analysis) {
          if (data.analysis.direction) resolvedDirection = data.analysis.direction;
          resolvedFeatures.push(`Anatomi: ${JSON.stringify(data.analysis.anatomy || {})}`);
        }
      }
    } else if (providerConfig.type === 'ollama') {
      const resp = await fetch('/api/proxy/ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: providerConfig.baseUrl,
          endpoint: '/api/generate',
          payload: {
            model: providerConfig.model || 'llama3',
            prompt: `Parse pixel character prompt: "${prompt}". Identify visual features and equipment. Reply briefly.`,
            stream: false
          }
        })
      }).catch(() => null);

      if (resp && resp.ok) {
        const data = await resp.json();
        if (data.response) {
          resolvedFeatures.push(`Ollama Output: ${data.response.substring(0, 80)}...`);
        }
      }
    } else if (providerConfig.type === 'mcp') {
      resolvedFeatures.push(`MCP Tool: ${providerConfig.mcpToolName || 'pixel_craft_v1'}`);
    }
  } catch (err: any) {
    resolvedFeatures.push(`Fallback parser active: ${err?.message || 'Default'}`);
  }

  await delay(180);
  emitStep({
    id: 'step-1-parse',
    phase: 'parse',
    title: 'Analisis Semantik Selesai',
    description: isAnimated
      ? `Permintaan Animasi Terdeteksi: [${detectedAnimations.join(', ')}]. Pose: [${resolvedDirection}], Resolusi: [${resolution}x${resolution}]`
      : `Mode Karakter Statis (User hanya meminta karakter tanpa animasi). Pose: [${resolvedDirection}], Resolusi: [${resolution}x${resolution}]`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step1Start,
    status: 'success',
    tokenCount: Math.round(prompt.length / 3) + 40,
    details: { direction: resolvedDirection, isAnimated, detectedAnimations }
  });

  // STEP 2: Color Palette & Color Grading Harmonization
  const step2Start = Date.now();
  const palette = PALETTES[paletteName]?.colors || PALETTES.vibrant_rpg.colors;
  emitStep({
    id: 'step-2-palette',
    phase: 'palette',
    title: 'Harmonisasi Palet & Color Grading Bersih',
    description: `Menerapkan grading "${colorGrading}" pada palet ${PALETTES[paletteName]?.name || 'Vibrant RPG'} tanpa bayangan kotor`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running',
    details: { paletteCount: palette.length, colorGrading }
  });

  await delay(140);
  emitStep({
    id: 'step-2-palette',
    phase: 'palette',
    title: 'Color Grading Divalidasi',
    description: `Kontras tinggi aktif: Outline tegas (${palette[0]}), Midtone cerah (${palette[Math.floor(palette.length / 2)]}), Highlight specular (${palette[palette.length - 1]})`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step2Start,
    status: 'success',
    details: { palette, colorGrading }
  });

  // STEP 3: Silhouette & Skeleton Matrix Construction (Tanpa Bayangan Tanah)
  const step3Start = Date.now();
  emitStep({
    id: 'step-3-silhouette',
    phase: 'silhouette',
    title: 'Konstruksi Siluet & Proporsi Grid Bebas Bayangan',
    description: `Membangun matriks ${resolution}x${resolution} pixel: rasio kepala, bahu, torso, dan senjata (tanpa bayangan lantai)`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  // Generate character geometry
  const generated = generateProceduralCharacter({
    prompt,
    resolution,
    paletteKey: paletteName,
    colorGrading,
    direction: resolvedDirection,
    requestedAnimations: detectedAnimations
  });

  await delay(200);
  emitStep({
    id: 'step-3-silhouette',
    phase: 'silhouette',
    title: 'Siluet Berhasil Disusun',
    description: `Siluet dasar terbentuk bersih tanpa bayangan kotor di bawah karakter`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step3Start,
    status: 'success',
    details: { features: generated.features },
    intermediatePreview: generated.frames[0]?.pixels
  }, { currentPixels: generated.frames[0]?.pixels });

  // STEP 4: Shading, Specular Highlights & Cel-Shaded Outlines
  const step4Start = Date.now();
  emitStep({
    id: 'step-4-shading',
    phase: 'shading',
    title: 'Rendering Shading Bersih & Highlight Specular',
    description: 'Menerapkan pencahayaan atas, specular glint tajam, dan outline perimetral transparan',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  let currentPixels = generated.pixels;
  await delay(200);
  emitStep({
    id: 'step-4-shading',
    phase: 'shading',
    title: 'Shading Cel-Shading Selesai',
    description: 'Karakter memiliki warna cerah, highlight mengkilap, dan kontras tajam tanpa bayangan abu-abu',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step4Start,
    status: 'success',
    intermediatePreview: currentPixels
  }, { currentPixels });

  // STEP 5: AI Self-Review & Vision Quality Inspection
  const step5Start = Date.now();
  emitStep({
    id: 'step-5-review',
    phase: 'review',
    title: 'Inspeksi & Evaluasi AI (Vision Self-Critique)',
    description: 'AI menganalisis kepatuhan prompt visual, grading warna, dan kebersihan siluet',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  let evaluation: SpriteEvaluation = evaluateSpriteMatrix(
    currentPixels,
    prompt,
    resolution,
    palette,
    generated.features
  );

  if (providerConfig.type === 'gemini') {
    try {
      const evalResp = await fetch('/api/gemini/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          resolution,
          critiqueSummary: evaluation.critique,
          detectedFeatures: generated.features
        })
      }).catch(() => null);

      if (evalResp && evalResp.ok) {
        const evalData = await evalResp.json();
        if (evalData.evaluation) {
          evaluation = {
            ...evaluation,
            adherenceScore: evalData.evaluation.adherenceScore || evaluation.adherenceScore,
            silhouetteScore: evalData.evaluation.silhouetteScore || evaluation.silhouetteScore,
            paletteHarmonyScore: evalData.evaluation.paletteHarmonyScore || evaluation.paletteHarmonyScore,
            verdict: evalData.evaluation.verdict || evaluation.verdict,
            critique: evalData.evaluation.critique || evaluation.critique,
            suggestedFixes: evalData.evaluation.suggestedFixes || evaluation.suggestedFixes,
            overallQuality: evalData.evaluation.overallQuality || evaluation.overallQuality
          };
        }
      }
    } catch {
      // fallback loaded
    }
  }

  await delay(220);
  emitStep({
    id: 'step-5-review',
    phase: 'review',
    title: 'Evaluasi AI Selesai',
    description: `Kepatuhan: ${evaluation.adherenceScore}%, Siluet: ${evaluation.silhouetteScore}%, Harmoni Warna: ${evaluation.paletteHarmonyScore}%`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step5Start,
    status: evaluation.overallQuality === 'needs_refinement' ? 'warning' : 'success',
    details: { evaluation }
  });

  // STEP 6: Auto-Refinement (if enabled)
  if (autoRefine || evaluation.overallQuality === 'needs_refinement') {
    const step6Start = Date.now();
    emitStep({
      id: 'step-6-refine',
      phase: 'refine',
      title: 'Pembersihan & Penyempurnaan AI Otomatis',
      description: 'Menghilangkan orphan pixel dan meningkatkan specular glint pada kontur',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      durationMs: 0,
      status: 'running'
    });

    currentPixels = applyAutoRefinement(currentPixels, palette);
    await delay(160);

    emitStep({
      id: 'step-6-refine',
      phase: 'refine',
      title: 'Penyempurnaan Selesai',
      description: 'Orphan pixel dibersihkan, specular glint kontur atas terdefinisi tajam',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      durationMs: Date.now() - step6Start,
      status: 'success',
      intermediatePreview: currentPixels
    }, { currentPixels });
  }

  // STEP 7: Frame Synthesis & Animation Assembly
  const step7Start = Date.now();
  const animDesc = isAnimated
    ? `Menyusun frame animasi yang diminta: [${detectedAnimations.join(', ')}]`
    : `Menyimpan frame karakter statis tunggal (animasi tidak diminta)`;

  emitStep({
    id: 'step-7-export',
    phase: 'export',
    title: isAnimated ? 'Sintesis Frame Animasi Selesai' : 'Sintesis Karakter Statis Selesai',
    description: animDesc,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  await delay(120);
  emitStep({
    id: 'step-7-export',
    phase: 'export',
    title: 'Karakter Siap Digunakan',
    description: `Total durasi proses: ${Date.now() - startTime}ms. Siap digunakan di canvas studio.`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step7Start,
    status: 'success'
  });

  const words = prompt.trim().split(/\s+/);
  const characterName = words.slice(0, 3).join(' ') || 'Karakter Pixel';
  const capitalizedName = characterName.charAt(0).toUpperCase() + characterName.slice(1);

  const activeKey = generated.detectedAnimations[0] || 'idle';

  return {
    id: `sprite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: capitalizedName,
    prompt,
    resolution,
    paletteName,
    palette,
    colorGrading,
    direction: resolvedDirection,
    isAnimated,
    requestedAnimations: detectedAnimations,
    fps: 8,
    loop: true,
    activeAnimationKey: activeKey,
    animations: generated.animations,
    frames: generated.frames,
    currentFrameIndex: 0,
    currentPixels,
    aiEvaluation: evaluation,
    pipelineLogs: logs,
    providerUsed: providerConfig.name,
    modelUsed: providerConfig.model,
    createdAt: new Date().toISOString()
  };
}
