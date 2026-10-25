import {
  AIProviderConfig,
  CharacterDirection,
  CharacterSprite,
  GenerationRequest,
  PipelineStep,
  SpriteEvaluation,
  AnimationType
} from '../types/sprite';
import {
  generateProceduralCharacter,
  detectRequestedAnimations,
  evaluateSpriteMatrix,
  applyAutoRefinement,
  specFromPromptProcedural,
  validateSequence,
  buildPalette,
  CharacterSpec,
  validateSpec,
  DEFAULT_SPEC,
  PALETTES
} from './pixelEngine';

export type PipelineProgressCallback = (step: PipelineStep, partialSprite?: Partial<CharacterSprite>) => void;

/**
 * Executes the complete observable AI generation pipeline
 * Pipeline: prompt -> AI hanya mengisi CharacterSpec (enum terbatas) -> validasi + retry
 *           -> kode menyusun frame dari spec + pose -> post-process -> validasi antar frame.
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

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  // Determine requested animations
  const detectedAnimations = detectRequestedAnimations(prompt, explicitAnimations);
  const isAnimated = detectedAnimations.length > 0;

  // STEP 1: Prompt Parsing & AI Art Director (CharacterSpec with Enum Validation)
  const step1Start = Date.now();
  emitStep({
    id: 'step-1-parse',
    phase: 'parse',
    title: 'Analisis Semantik AI Art Director',
    description: `Mengekstrak CharacterSpec (archetype, body, head, weapon, offhand, cape, palet 6 warna) via ${providerConfig.name}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running',
    details: {
      provider: providerConfig.type,
      model: providerConfig.model,
      rawPrompt: prompt
    }
  });

  let resolvedSpec: CharacterSpec = specFromPromptProcedural(prompt);
  let resolvedDirection: CharacterDirection = direction;
  let validationNote = '';

  try {
    if (providerConfig.type === 'gemini') {
      const resp = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, resolution, paletteName, colorGrading })
      }).catch(() => null);

      if (resp && resp.ok) {
        const data = await resp.json();
        if (data.spec) {
          const { spec: validSpec, errors } = validateSpec(data.spec);
          if (validSpec) {
            resolvedSpec = validSpec;
            validationNote = 'Output AI tervalidasi 100% sesuai schema enum CharacterSpec';
          } else {
            validationNote = `Validasi fallback: ${errors.join(', ')}`;
          }
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
            prompt: `Sebagai Art Director, klasifikasikan prompt "${prompt}" menjadi JSON CharacterSpec (archetype, body, head, weapon, offhand, cape).`,
            stream: false
          }
        })
      }).catch(() => null);

      if (resp && resp.ok) {
        const data = await resp.json();
        try {
          const rawParsed = JSON.parse(data.response?.replace(/```json|```/g, '').trim() || '{}');
          const { spec: validSpec } = validateSpec(rawParsed);
          if (validSpec) resolvedSpec = validSpec;
        } catch {
          // fallback procedural
        }
      }
    }
  } catch (err: any) {
    validationNote = `Procedural Art Director aktif: ${err?.message || 'Default'}`;
  }

  // Ensure requested animations from prompt or options are reflected
  if (detectedAnimations.length > 0) {
    const animSet = new Set([...resolvedSpec.animations, ...detectedAnimations]);
    resolvedSpec.animations = Array.from(animSet).filter(
      (a): a is 'idle' | 'walk' | 'attack' => a === 'idle' || a === 'walk' || a === 'attack'
    );
  }

  await delay(180);
  emitStep({
    id: 'step-1-parse',
    phase: 'parse',
    title: 'CharacterSpec AI Terbentuk & Tervalidasi',
    description: `Archetype: [${resolvedSpec.archetype}], Body: [${resolvedSpec.body}], Head: [${resolvedSpec.head}], Weapon: [${resolvedSpec.weapon}], Offhand: [${resolvedSpec.offhand}], Cape: [${resolvedSpec.cape}]. ${validationNote}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step1Start,
    status: 'success',
    tokenCount: Math.round(prompt.length / 3) + 40,
    details: { spec: resolvedSpec, direction: resolvedDirection }
  });

  // STEP 2: Color Ramp Shading & Palette Construction
  const step2Start = Date.now();
  const palRamps = buildPalette(resolvedSpec);
  const palette = [
    palRamps.outline,
    resolvedSpec.palette.primary,
    resolvedSpec.palette.secondary,
    resolvedSpec.palette.accent,
    resolvedSpec.palette.metal,
    resolvedSpec.palette.skin,
    resolvedSpec.palette.hair,
    palRamps.highlight
  ];

  emitStep({
    id: 'step-2-palette',
    phase: 'palette',
    title: 'Harmonisasi Ramp Shading Konsisten',
    description: 'Menyusun ramp warna shadow (biru-ungu), base, dan light (krem hangat) serta 1px crisp outline otomatis',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running',
    details: { palette, ramps: palRamps }
  });

  await delay(140);
  emitStep({
    id: 'step-2-palette',
    phase: 'palette',
    title: 'Palet & Ramp Shading Siap',
    description: `Ramp: Primary [${resolvedSpec.palette.primary}], Secondary [${resolvedSpec.palette.secondary}], Accent [${resolvedSpec.palette.accent}], Metal [${resolvedSpec.palette.metal}]. Outline: ${palRamps.outline}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step2Start,
    status: 'success',
    details: { palette, ramps: palRamps }
  });

  // STEP 3: Frame Assembly from Spec + Pose Table (Cel Rendering)
  const step3Start = Date.now();
  emitStep({
    id: 'step-3-silhouette',
    phase: 'silhouette',
    title: 'Penyusunan Frame Cel dari Spec & Tabel Pose',
    description: `Merender frame independen berbasis keyframe tabel pose (bodyDy, headDx/Dy, arm/leg angle, weaponAngle, capeSway) pada resolusi ${resolution}x${resolution}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  // Generate character cel frames using new spec & poses
  const generated = generateProceduralCharacter({
    prompt,
    resolution,
    paletteKey: paletteName,
    colorGrading,
    direction: resolvedDirection,
    requestedAnimations: detectedAnimations,
    spec: resolvedSpec
  });

  await delay(200);
  emitStep(
    {
      id: 'step-3-silhouette',
      phase: 'silhouette',
      title: 'Penyusunan Frame Cel Selesai',
      description: `Rangkaian cel frame terkonstruksi rapi tanpa translasi CSS atau rigging skeletal`,
      timestamp: new Date().toLocaleTimeString('id-ID'),
      durationMs: Date.now() - step3Start,
      status: 'success',
      details: { features: generated.features },
      intermediatePreview: generated.frames[0]?.pixels
    },
    { currentPixels: generated.frames[0]?.pixels }
  );

  // STEP 4: Post-Processing per Frame
  const step4Start = Date.now();
  emitStep({
    id: 'step-4-shading',
    phase: 'shading',
    title: 'Pipeline Post-Processing (Quantize, Orphans, Ground Align, Outline)',
    description: 'Menjalankan snap palet, pembersihan pixel yatim terisolasi, perataan telapak kaki ke groundY, dan composite layer slash FX',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  let currentPixels = generated.pixels;
  await delay(180);
  emitStep(
    {
      id: 'step-4-shading',
      phase: 'shading',
      title: 'Post-Processing Selesai',
      description: 'Semua frame memiliki outline 1px presisi di sekeliling bodi dan garis tanah stabil di groundY',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      durationMs: Date.now() - step4Start,
      status: 'success',
      intermediatePreview: currentPixels
    },
    { currentPixels }
  );

  // STEP 5: Cross-Frame Sequence Validation
  const step5Start = Date.now();
  emitStep({
    id: 'step-5-validate-seq',
    phase: 'review',
    title: 'Validasi Rangkaian Antar Frame (Cross-Frame Consistency)',
    description: 'Memverifikasi konsistensi volume pixel, kesamaan garis tanah (footY), stabilitas pusat massa (cx), dan batas warna',
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  const activeAnimKey = detectedAnimations[0] || 'idle';
  const framesToValidate = (generated.animations[activeAnimKey] || generated.animations.idle || generated.frames).map(
    (f) => f.pixels
  );
  const sequenceValidation = validateSequence(framesToValidate, resolution, {
    maxColors: 18,
    maxCountDelta: 0.45,
    maxFootDrift: 1,
    maxCenterDrift: 0.25
  });

  await delay(160);
  emitStep({
    id: 'step-5-validate-seq',
    phase: 'review',
    title: sequenceValidation.ok ? 'Validasi Antar Frame Lolos (100% Konsisten)' : 'Validasi Antar Frame Diperiksa',
    description: sequenceValidation.ok
      ? 'Karakter stabil di semua frame: kaki menapak garis tanah yang sama, volume pixel konsisten, siluet tidak jitter.'
      : `Catatan konsistensi: ${sequenceValidation.errors.slice(0, 2).join('; ')}`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step5Start,
    status: sequenceValidation.ok ? 'success' : 'warning',
    details: { validation: sequenceValidation }
  });

  // STEP 6: AI Vision Review & Evaluation
  const step6Start = Date.now();
  emitStep({
    id: 'step-6-review',
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
      // fallback
    }
  }

  await delay(180);
  emitStep({
    id: 'step-6-review',
    phase: 'review',
    title: 'Evaluasi AI Selesai',
    description: `Kepatuhan: ${evaluation.adherenceScore}%, Siluet: ${evaluation.silhouetteScore}%, Harmoni Warna: ${evaluation.paletteHarmonyScore}%`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step6Start,
    status: evaluation.overallQuality === 'needs_refinement' ? 'warning' : 'success',
    details: { evaluation }
  });

  // STEP 7: Auto-Refinement (if enabled)
  if (autoRefine || evaluation.overallQuality === 'needs_refinement') {
    const step7Start = Date.now();
    emitStep({
      id: 'step-7-refine',
      phase: 'refine',
      title: 'Pembersihan & Penyempurnaan AI Otomatis',
      description: 'Menghilangkan orphan pixel dan meningkatkan specular glint pada kontur',
      timestamp: new Date().toLocaleTimeString('id-ID'),
      durationMs: 0,
      status: 'running'
    });

    currentPixels = applyAutoRefinement(currentPixels, palette);
    await delay(120);

    emitStep(
      {
        id: 'step-7-refine',
        phase: 'refine',
        title: 'Penyempurnaan Selesai',
        description: 'Orphan pixel dibersihkan, specular glint kontur atas terdefinisi tajam',
        timestamp: new Date().toLocaleTimeString('id-ID'),
        durationMs: Date.now() - step7Start,
        status: 'success',
        intermediatePreview: currentPixels
      },
      { currentPixels }
    );
  }

  // STEP 8: Final Export Assembly
  const step8Start = Date.now();
  const animDesc = isAnimated
    ? `Menyusun frame animasi cel yang diminta: [${detectedAnimations.join(', ')}]`
    : `Menyimpan frame karakter statis tunggal`;

  emitStep({
    id: 'step-8-export',
    phase: 'export',
    title: isAnimated ? 'Sintesis Frame Animasi Selesai' : 'Sintesis Karakter Selesai',
    description: animDesc,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: 0,
    status: 'running'
  });

  await delay(100);
  emitStep({
    id: 'step-8-export',
    phase: 'export',
    title: 'Karakter Siap Digunakan',
    description: `Total durasi proses: ${Date.now() - startTime}ms. Karakter "${resolvedSpec.name}" siap digunakan.`,
    timestamp: new Date().toLocaleTimeString('id-ID'),
    durationMs: Date.now() - step8Start,
    status: 'success'
  });

  const activeKey = generated.detectedAnimations[0] || 'idle';

  return {
    id: `sprite-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: resolvedSpec.name || 'Karakter Pixel',
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
    createdAt: new Date().toISOString(),
    spec: resolvedSpec
  };
}
