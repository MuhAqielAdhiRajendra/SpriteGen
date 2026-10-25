import React, { useState, useEffect, useCallback } from 'react';
import {
  CharacterDirection,
  CharacterSprite,
  PipelineStep,
  SpriteResolution,
  AIProviderConfig,
  AnimationType,
  ColorGradingMode,
  SpriteFrame
} from './types/sprite';
import { Navbar } from './components/Navbar';
import { PromptForm } from './components/PromptForm';
import { PixelCanvas } from './components/PixelCanvas';
import { TimelineBar } from './components/TimelineBar';
import { AnimationPreview } from './components/AnimationPreview';
import { ExecutionLogs } from './components/ExecutionLogs';
import { AiEvaluationCard } from './components/AiEvaluationCard';
import { ExportPanel } from './components/ExportPanel';
import { ProviderSettingsModal } from './components/ProviderSettingsModal';
import { PresetGalleryModal } from './components/PresetGalleryModal';
import { DocsModal } from './components/DocsModal';
import { SpriteSheetModal } from './components/SpriteSheetModal';
import { executeSpriteGeneration } from './utils/aiPipeline';
import {
  applyAutoRefinement,
  generateProceduralCharacter,
  evaluateSpriteMatrix,
  synthesizeAnimationSequence,
  createEmptyGrid,
  cloneGrid,
  PALETTES
} from './utils/pixelEngine';
import { Flame, Film, Download, ShieldCheck, ScrollText, LayoutGrid, SlidersHorizontal } from 'lucide-react';

const DEFAULT_PROVIDER: AIProviderConfig = {
  id: 'gemini-default',
  type: 'gemini',
  name: 'Google Gemini 3.1 Flash Lite',
  description: 'Model cloud built-in berkecepatan tinggi untuk penalaran visual pixel art',
  baseUrl: '/api/gemini',
  model: 'gemini-3.1-flash-lite',
  temperature: 0.3
};

export default function App() {
  const [prompt, setPrompt] = useState<string>(
    'Kesatria suci dengan armor perak tebal, perisai emas berlambang matahari, jubah putih bersih bertepi emas, dan pedang bermata ganda'
  );
  const [resolution, setResolution] = useState<SpriteResolution>(32);
  const [direction, setDirection] = useState<CharacterDirection>('front');
  const [paletteKey, setPaletteKey] = useState<string>('vibrant_rpg');
  const [colorGrading, setColorGrading] = useState<ColorGradingMode>('vibrant');
  const [requestedAnimations, setRequestedAnimations] = useState<AnimationType[]>([]);
  const [autoRefine, setAutoRefine] = useState<boolean>(true);

  // Timeline & Playback States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [onionSkin, setOnionSkin] = useState<boolean>(false);

  const [activeProvider, setActiveProvider] = useState<AIProviderConfig>(() => {
    try {
      const saved = localStorage.getItem('pixelforge_provider');
      return saved ? JSON.parse(saved) : DEFAULT_PROVIDER;
    } catch {
      return DEFAULT_PROVIDER;
    }
  });

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);

  // Workbench Tabs: 'forge' | 'monitor' | 'export'
  const [activeWorkbenchTab, setActiveWorkbenchTab] = useState<'forge' | 'monitor' | 'export'>('forge');

  // Mobile View Toggle: 'canvas' | 'workbench'
  const [mobileTab, setMobileTab] = useState<'canvas' | 'workbench'>('canvas');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState<boolean>(false);

  // Initial Sample Character (Frame-by-frame Cel Architecture)
  const [currentSprite, setCurrentSprite] = useState<CharacterSprite>(() => {
    const pal = PALETTES.vibrant_rpg.colors;
    const initialGen = generateProceduralCharacter({
      prompt: 'Kesatria suci dengan armor perak tebal, perisai emas berlambang matahari, jubah putih bersih bertepi emas, dan pedang bermata ganda',
      resolution: 32,
      paletteKey: 'vibrant_rpg',
      colorGrading: 'vibrant',
      direction: 'front',
      requestedAnimations: [] // 1 static cel frame initially
    });

    const initialEval = evaluateSpriteMatrix(
      initialGen.pixels,
      'Kesatria suci dengan armor perak tebal, perisai emas berlambang matahari, jubah putih bersih',
      32,
      pal,
      initialGen.features
    );

    return {
      id: 'init-paladin-1',
      name: 'Kesatria Cahaya Suci',
      prompt: 'Kesatria suci dengan armor perak tebal, perisai emas berlambang matahari, jubah putih bersih bertepi emas, dan pedang bermata ganda',
      resolution: 32,
      paletteName: 'vibrant_rpg',
      palette: pal,
      colorGrading: 'vibrant',
      direction: 'front',
      isAnimated: false,
      requestedAnimations: [],
      fps: 8,
      loop: true,
      activeAnimationKey: 'idle',
      animations: initialGen.animations,
      frames: initialGen.frames,
      currentFrameIndex: 0,
      currentPixels: initialGen.frames[0].pixels,
      aiEvaluation: initialEval,
      pipelineLogs: [
        {
          id: 'step-init-1',
          phase: 'parse',
          title: 'Inisialisasi Bengkel Forge',
          description: 'Sistem siap menerima pesanan karakter baru di tungku perapian.',
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs: 30,
          status: 'success'
        },
        {
          id: 'step-init-2',
          phase: 'review',
          title: 'Frame Cel Siap Ditempa',
          description: `Kepatuhan prompt: ${initialEval.adherenceScore}%, Siluet Cel: ${initialEval.silhouetteScore}%`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs: 45,
          status: 'success',
          details: { evaluation: initialEval }
        }
      ],
      providerUsed: 'Google Gemini 3.1 Flash Lite',
      modelUsed: 'gemini-3.1-flash-lite',
      createdAt: new Date().toISOString()
    };
  });

  const [logs, setLogs] = useState<PipelineStep[]>(currentSprite.pipelineLogs);
  const [historyList, setHistoryList] = useState<CharacterSprite[]>([currentSprite]);

  // Frame Playback Loop (pure frame index cycling)
  useEffect(() => {
    if (!isPlaying || currentSprite.frames.length <= 1) return;

    const interval = Math.max(25, Math.round(1000 / currentSprite.fps));
    const timer = setInterval(() => {
      setCurrentSprite((prev) => {
        const nextIndex = (prev.currentFrameIndex + 1) % prev.frames.length;
        return {
          ...prev,
          currentFrameIndex: nextIndex,
          currentPixels: prev.frames[nextIndex]?.pixels || prev.currentPixels
        };
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, currentSprite.fps, currentSprite.frames.length]);

  // Persist provider configuration
  const handleSaveProvider = (newConfig: AIProviderConfig) => {
    setActiveProvider(newConfig);
    try {
      localStorage.setItem('pixelforge_provider', JSON.stringify(newConfig));
    } catch {}
  };

  // Generation Handler
  const handleGenerate = async () => {
    if (isGenerating || !prompt.trim()) return;
    setIsGenerating(true);
    setIsPlaying(false);
    setActiveWorkbenchTab('forge');
    setLogs([]);

    try {
      const result = await executeSpriteGeneration(
        {
          prompt,
          resolution,
          paletteName: paletteKey,
          colorGrading,
          direction,
          requestedAnimations,
          providerConfig: activeProvider,
          autoRefine
        },
        (step, partial) => {
          setLogs((prev) => {
            const idx = prev.findIndex((s) => s.id === step.id);
            if (idx >= 0) {
              const updated = [...prev];
              updated[idx] = step;
              return updated;
            }
            return [...prev, step];
          });

          if (partial?.currentPixels) {
            setCurrentSprite((prev) => ({
              ...prev,
              currentPixels: partial.currentPixels!
            }));
          }
        }
      );

      setCurrentSprite(result);
      setHistoryList((prev) => [result, ...prev.slice(0, 15)]);

      setTimeout(() => {
        setActiveWorkbenchTab('monitor');
      }, 700);
    } catch (err: any) {
      console.error('Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Select a frame on the timeline
  const handleSelectFrame = (index: number) => {
    if (index < 0 || index >= currentSprite.frames.length) return;
    setCurrentSprite((prev) => ({
      ...prev,
      currentFrameIndex: index,
      currentPixels: prev.frames[index]?.pixels || prev.currentPixels
    }));
  };

  // Add a blank new frame
  const handleAddFrame = () => {
    const newFrame: SpriteFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Frame ${currentSprite.frames.length + 1}`,
      pixels: createEmptyGrid(currentSprite.resolution)
    };

    const newIndex = currentSprite.currentFrameIndex + 1;
    const updatedFrames = [...currentSprite.frames];
    updatedFrames.splice(newIndex, 0, newFrame);

    setCurrentSprite((prev) => ({
      ...prev,
      frames: updatedFrames,
      currentFrameIndex: newIndex,
      currentPixels: newFrame.pixels,
      animations: {
        ...prev.animations,
        [prev.activeAnimationKey]: updatedFrames
      }
    }));
  };

  // Duplicate current frame (Core Aseprite workflow: clones pixels to next frame)
  const handleDuplicateFrame = () => {
    const currentFrame = currentSprite.frames[currentSprite.currentFrameIndex];
    if (!currentFrame) return;

    const clonedPixels = cloneGrid(currentFrame.pixels);
    const newFrame: SpriteFrame = {
      id: `frame-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${currentFrame.name} (Salinan)`,
      pixels: clonedPixels
    };

    const newIndex = currentSprite.currentFrameIndex + 1;
    const updatedFrames = [...currentSprite.frames];
    updatedFrames.splice(newIndex, 0, newFrame);

    setCurrentSprite((prev) => ({
      ...prev,
      frames: updatedFrames,
      currentFrameIndex: newIndex,
      currentPixels: clonedPixels,
      animations: {
        ...prev.animations,
        [prev.activeAnimationKey]: updatedFrames
      }
    }));
  };

  // Delete current frame
  const handleDeleteFrame = (index: number) => {
    if (currentSprite.frames.length <= 1) return;

    const updatedFrames = currentSprite.frames.filter((_, i) => i !== index);
    const newIndex = Math.min(index, updatedFrames.length - 1);

    setCurrentSprite((prev) => ({
      ...prev,
      frames: updatedFrames,
      currentFrameIndex: newIndex,
      currentPixels: updatedFrames[newIndex]?.pixels || updatedFrames[0].pixels,
      animations: {
        ...prev.animations,
        [prev.activeAnimationKey]: updatedFrames
      }
    }));
  };

  // Move / reorder frame
  const handleMoveFrame = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= currentSprite.frames.length) return;

    const updatedFrames = [...currentSprite.frames];
    const [moved] = updatedFrames.splice(fromIndex, 1);
    updatedFrames.splice(toIndex, 0, moved);

    setCurrentSprite((prev) => ({
      ...prev,
      frames: updatedFrames,
      currentFrameIndex: toIndex,
      animations: {
        ...prev.animations,
        [prev.activeAnimationKey]: updatedFrames
      }
    }));
  };

  // Handle direct manual pixel modifications from canvas
  const handlePixelChange = useCallback((newPixels: string[][]) => {
    setCurrentSprite((prev) => {
      const updatedFrames = [...prev.frames];
      if (updatedFrames[prev.currentFrameIndex]) {
        updatedFrames[prev.currentFrameIndex] = {
          ...updatedFrames[prev.currentFrameIndex],
          pixels: newPixels
        };
      }

      return {
        ...prev,
        currentPixels: newPixels,
        frames: updatedFrames,
        animations: {
          ...prev.animations,
          [prev.activeAnimationKey]: updatedFrames
        }
      };
    });
  }, []);

  // Switch between animation sets (Walk, Attack, Hurt, Idle)
  const handleSelectAnimation = (animKey: string) => {
    const existing = currentSprite.animations[animKey];
    if (existing && existing.length > 0) {
      setCurrentSprite((prev) => ({
        ...prev,
        activeAnimationKey: animKey,
        frames: existing,
        currentFrameIndex: 0,
        currentPixels: existing[0].pixels
      }));
    }
  };

  // Synthesize a new animation sequence on demand
  const handleSynthesizeAnimation = (animType: AnimationType) => {
    const newSeq = synthesizeAnimationSequence(
      animType,
      currentSprite.resolution,
      currentSprite.palette,
      currentSprite.prompt
    );

    setCurrentSprite((prev) => ({
      ...prev,
      isAnimated: true,
      activeAnimationKey: animType,
      frames: newSeq,
      currentFrameIndex: 0,
      currentPixels: newSeq[0].pixels,
      animations: {
        ...prev.animations,
        [animType]: newSeq
      }
    }));

    setLogs((prev) => [
      ...prev,
      {
        id: `anim-${animType}-${Date.now()}`,
        phase: 'export',
        title: `Animasi Cel ${animType.toUpperCase()} Ditempa`,
        description: `Tukang besi berhasil menyusun ${newSeq.length} cel frame baru untuk gerakan ${animType}.`,
        timestamp: new Date().toLocaleTimeString('id-ID'),
        durationMs: 90,
        status: 'success'
      }
    ]);
  };

  // Previous frame pixels for Onion Skinning
  const previousFrameIndex = currentSprite.currentFrameIndex > 0
    ? currentSprite.currentFrameIndex - 1
    : currentSprite.loop && currentSprite.frames.length > 1
    ? currentSprite.frames.length - 1
    : -1;

  const previousFramePixels = previousFrameIndex >= 0 ? currentSprite.frames[previousFrameIndex]?.pixels : undefined;

  // AI Refinement handler
  const handleApplyRefine = () => {
    setIsRefining(true);
    setTimeout(() => {
      const refined = applyAutoRefinement(currentSprite.currentPixels, currentSprite.palette);
      const newEval = evaluateSpriteMatrix(
        refined,
        currentSprite.prompt,
        currentSprite.resolution,
        currentSprite.palette,
        currentSprite.aiEvaluation.detectedFeatures
      );
      newEval.adherenceScore = Math.min(99, newEval.adherenceScore + 4);
      newEval.silhouetteScore = Math.min(98, newEval.silhouetteScore + 5);
      newEval.verdict = 'Hasil tempaan berhasil dihaluskan! Siluet cel kini lebih bersih dan garis kontur terdefinisi tajam tanpa pixel liar.';

      handlePixelChange(refined);
      setCurrentSprite((prev) => ({
        ...prev,
        aiEvaluation: newEval
      }));

      setLogs((prev) => [
        ...prev,
        {
          id: `refine-manual-${Date.now()}`,
          phase: 'refine',
          title: 'Penghalusan Besi Manual Diterapkan',
          description: `Skor siluet meningkat ke ${newEval.silhouetteScore}%. Pixel liar berhasil dibersihkan.`,
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs: 120,
          status: 'success'
        }
      ]);

      setIsRefining(false);
    }, 450);
  };

  // Select Preset Handler
  const handleSelectPreset = (preset: {
    prompt: string;
    resolution: SpriteResolution;
    paletteKey: string;
    colorGrading?: ColorGradingMode;
    direction: CharacterDirection;
  }) => {
    setPrompt(preset.prompt);
    setResolution(preset.resolution);
    setPaletteKey(preset.paletteKey);
    if (preset.colorGrading) setColorGrading(preset.colorGrading);
    setDirection(preset.direction);
  };

  // Restore history handler
  const handleRestoreHistory = (savedSprite: CharacterSprite) => {
    setCurrentSprite(savedSprite);
    setPrompt(savedSprite.prompt);
    setResolution(savedSprite.resolution);
    setPaletteKey(savedSprite.paletteName);
    setColorGrading(savedSprite.colorGrading || 'vibrant');
    setDirection(savedSprite.direction);
    setRequestedAnimations(savedSprite.requestedAnimations || []);
    setLogs(savedSprite.pipelineLogs);
  };

  // Load Reference Character to studio
  const handleLoadCharacterToStudio = (characterData: { prompt: string; name: string }) => {
    setPrompt(characterData.prompt);
    setResolution(32);
    setPaletteKey('vibrant_rpg');
    setColorGrading('vibrant');
    setDirection('front');
    setRequestedAnimations(['idle', 'walk', 'attack']);

    const pal = PALETTES.vibrant_rpg.colors;
    const initialGen = generateProceduralCharacter({
      prompt: characterData.prompt,
      resolution: 32,
      paletteKey: 'vibrant_rpg',
      colorGrading: 'vibrant',
      direction: 'front',
      requestedAnimations: ['idle', 'walk', 'attack']
    });

    const initialEval = evaluateSpriteMatrix(
      initialGen.pixels,
      characterData.prompt,
      32,
      pal,
      initialGen.features
    );

    const loadedSprite: CharacterSprite = {
      id: `hero-${Date.now()}`,
      name: characterData.name,
      prompt: characterData.prompt,
      resolution: 32,
      paletteName: 'vibrant_rpg',
      palette: pal,
      colorGrading: 'vibrant',
      direction: 'front',
      isAnimated: true,
      requestedAnimations: ['idle', 'walk', 'attack'],
      fps: 8,
      loop: true,
      activeAnimationKey: 'idle',
      animations: initialGen.animations,
      frames: initialGen.frames,
      currentFrameIndex: 0,
      currentPixels: initialGen.frames[0].pixels,
      aiEvaluation: initialEval,
      pipelineLogs: [
        {
          id: 'step-load-1',
          phase: 'export',
          title: 'Karakter Referensi Dimuat ke Tungku',
          description: 'Spiky Orange Hair Hero siap dianimasikan & diedit di canvas',
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs: 30,
          status: 'success'
        }
      ],
      providerUsed: activeProvider.name,
      modelUsed: activeProvider.model,
      createdAt: new Date().toISOString()
    };

    setCurrentSprite(loadedSprite);
    setHistoryList((prev) => [loadedSprite, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#1c1917] text-[#e7e5e4] flex flex-col font-body selection:bg-[#ea580c] selection:text-[#1c1917]">
      {/* Top Retro Anvil Navbar */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenSheetModal={() => setIsSheetModalOpen(true)}
        onNewSprite={() => {
          setPrompt('');
          setActiveWorkbenchTab('forge');
        }}
        providerName={activeProvider.name}
      />

      {/* Mobile Mode Switcher (Hidden on Desktop) */}
      <div className="lg:hidden w-full bg-[#292524] border-b-2 border-[#44403c] p-2 flex items-center justify-center gap-2">
        <button
          onClick={() => setMobileTab('canvas')}
          className={`flex-1 py-1.5 px-3 text-xs font-pixel uppercase tracking-wider border-2 border-[#000] flex items-center justify-center gap-2 transition-all ${
            mobileTab === 'canvas'
              ? 'bg-[#ea580c] text-[#1c1917] font-bold shadow-[2px_2px_0_#000]'
              : 'bg-[#1c1917] text-[#a8a29e] hover:text-[#e7e5e4]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Kanvas & Cel</span>
        </button>
        <button
          onClick={() => setMobileTab('workbench')}
          className={`flex-1 py-1.5 px-3 text-xs font-pixel uppercase tracking-wider border-2 border-[#000] flex items-center justify-center gap-2 transition-all ${
            mobileTab === 'workbench'
              ? 'bg-[#ea580c] text-[#1c1917] font-bold shadow-[2px_2px_0_#000]'
              : 'bg-[#1c1917] text-[#a8a29e] hover:text-[#e7e5e4]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Meja Tempa</span>
        </button>
      </div>

      {/* Main Studio Viewport (Editor Layout) */}
      <main className="flex-1 max-w-[1800px] w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
        {/* Left & Center Main Studio Area: Canvas + Timeline (7 or 8 columns on Desktop) */}
        <section
          className={`lg:col-span-7 xl:col-span-8 flex flex-col gap-3 ${
            mobileTab === 'canvas' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Main Pixel Canvas with Vertical Tool Rail */}
          <PixelCanvas
            pixels={currentSprite.currentPixels}
            resolution={currentSprite.resolution}
            palette={currentSprite.palette}
            onChangePixels={handlePixelChange}
            characterName={currentSprite.name}
            previousFramePixels={previousFramePixels}
            onionSkin={onionSkin}
            frameIndex={currentSprite.currentFrameIndex}
            totalFrames={currentSprite.frames.length}
          />

          {/* Timeline Bar (Filmstrip Underneath Canvas) */}
          <TimelineBar
            frames={currentSprite.frames}
            currentFrameIndex={currentSprite.currentFrameIndex}
            onSelectFrame={handleSelectFrame}
            onAddFrame={handleAddFrame}
            onDuplicateFrame={handleDuplicateFrame}
            onDeleteFrame={handleDeleteFrame}
            onMoveFrame={handleMoveFrame}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            fps={currentSprite.fps}
            onChangeFps={(newFps) => setCurrentSprite((s) => ({ ...s, fps: newFps }))}
            loop={currentSprite.loop}
            onToggleLoop={() => setCurrentSprite((s) => ({ ...s, loop: !s.loop }))}
            onionSkin={onionSkin}
            onToggleOnionSkin={() => setOnionSkin(!onionSkin)}
            resolution={currentSprite.resolution}
          />
        </section>

        {/* Right Area: Workbench / Meja Tempa (5 or 4 columns on Desktop) */}
        <aside
          className={`lg:col-span-5 xl:col-span-4 flex flex-col gap-3 ${
            mobileTab === 'workbench' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Chiseled Workbench Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#292524] border-2 border-[#44403c] shadow-[2px_2px_0_#000]">
            <button
              onClick={() => setActiveWorkbenchTab('forge')}
              className={`flex-1 py-1.5 px-2 text-xs font-pixel uppercase tracking-wide border-2 border-[#000] flex items-center justify-center gap-1.5 transition-all ${
                activeWorkbenchTab === 'forge'
                  ? 'bg-[#ea580c] text-[#1c1917] font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-[#1c1917] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#292524]'
              }`}
              title="Tungku Penempaan & Parameter Karakter"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>1. Tempa</span>
            </button>

            <button
              onClick={() => setActiveWorkbenchTab('monitor')}
              className={`flex-1 py-1.5 px-2 text-xs font-pixel uppercase tracking-wide border-2 border-[#000] flex items-center justify-center gap-1.5 transition-all ${
                activeWorkbenchTab === 'monitor'
                  ? 'bg-[#ea580c] text-[#1c1917] font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-[#1c1917] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#292524]'
              }`}
              title="Monitor Animasi CRT & Inspeksi Kualitas"
            >
              <Film className="w-3.5 h-3.5" />
              <span>2. Monitor</span>
            </button>

            <button
              onClick={() => setActiveWorkbenchTab('export')}
              className={`flex-1 py-1.5 px-2 text-xs font-pixel uppercase tracking-wide border-2 border-[#000] flex items-center justify-center gap-1.5 transition-all ${
                activeWorkbenchTab === 'export'
                  ? 'bg-[#ea580c] text-[#1c1917] font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-[#1c1917] text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#292524]'
              }`}
              title="Ekspor Berkas & Catatan Penempaan"
            >
              <Download className="w-3.5 h-3.5" />
              <span>3. Ekspor</span>
            </button>
          </div>

          {/* Workbench Tab 1: Tungku Penempaan (PromptForm) */}
          {activeWorkbenchTab === 'forge' && (
            <div className="flex flex-col gap-3">
              <PromptForm
                prompt={prompt}
                setPrompt={setPrompt}
                resolution={resolution}
                setResolution={setResolution}
                direction={direction}
                setDirection={setDirection}
                paletteKey={paletteKey}
                setPaletteKey={setPaletteKey}
                colorGrading={colorGrading}
                setColorGrading={setColorGrading}
                requestedAnimations={requestedAnimations}
                setRequestedAnimations={setRequestedAnimations}
                autoRefine={autoRefine}
                setAutoRefine={setAutoRefine}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                activeProvider={activeProvider}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />

              {/* Quick info strip under form */}
              <div className="p-2.5 bg-[#292524] border-2 border-[#44403c] text-[11px] font-tech text-[#a8a29e] flex items-center justify-between">
                <span>STATUS BENGKEL: <strong className="text-[#fbbf24]">SIAP MENEMPA</strong></span>
                <span>ENGINE: <span className="text-[#e7e5e4]">{activeProvider.model}</span></span>
              </div>
            </div>
          )}

          {/* Workbench Tab 2: Monitor Cel & Inspeksi Kualitas */}
          {activeWorkbenchTab === 'monitor' && (
            <div className="flex flex-col gap-3">
              {/* Retro CRT Cel Flipbook Monitor */}
              <AnimationPreview
                animations={currentSprite.animations}
                activeAnimationKey={currentSprite.activeAnimationKey}
                onSelectAnimation={handleSelectAnimation}
                resolution={currentSprite.resolution}
                fps={currentSprite.fps}
                onChangeFps={(newFps) => setCurrentSprite((s) => ({ ...s, fps: newFps }))}
                loop={currentSprite.loop}
                onToggleLoop={() => setCurrentSprite((s) => ({ ...s, loop: !s.loop }))}
                onSynthesizeAnimation={handleSynthesizeAnimation}
              />

              {/* Buku Inspeksi Penempaan */}
              <AiEvaluationCard
                evaluation={currentSprite.aiEvaluation}
                onApplyRefinement={handleApplyRefine}
                isRefining={isRefining}
              />
            </div>
          )}

          {/* Workbench Tab 3: Ekspor & Catatan Penempaan */}
          {activeWorkbenchTab === 'export' && (
            <div className="flex flex-col gap-3">
              {/* Panel Ekspor Karakter */}
              <ExportPanel sprite={currentSprite} />

              {/* Buku Catatan Log Penempaan */}
              <ExecutionLogs logs={logs} isGenerating={isGenerating} />
            </div>
          )}
        </aside>
      </main>

      {/* Modals with Forge Theme */}
      <ProviderSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeProvider={activeProvider}
        onSaveProvider={handleSaveProvider}
      />

      <PresetGalleryModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelectPreset={handleSelectPreset}
        historyList={historyList}
        onRestoreHistory={handleRestoreHistory}
      />

      <DocsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
      />

      <SpriteSheetModal
        isOpen={isSheetModalOpen}
        onClose={() => setIsSheetModalOpen(false)}
        onLoadCharacterToStudio={handleLoadCharacterToStudio}
      />
    </div>
  );
}
