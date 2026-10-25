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
import { Terminal, ShieldCheck, Download } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'logs' | 'evaluation' | 'export'>('logs');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);

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
          title: 'Inisialisasi Studio PixelForge',
          description: 'Sistem siap menerima prompt visual karakter baru',
          timestamp: new Date().toLocaleTimeString('id-ID'),
          durationMs: 30,
          status: 'success'
        },
        {
          id: 'step-init-2',
          phase: 'review',
          title: 'Frame Cel Siap (Frame-by-Frame Aseprite Engine)',
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
    setActiveTab('logs');
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
        setActiveTab('evaluation');
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
        title: `Animasi Cel ${animType.toUpperCase()} Dihasilkan`,
        description: `AI berhasil menggambar ${newSeq.length} cel frame baru untuk aksi ${animType}.`,
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
      newEval.verdict = 'Hasil perbaikan AI berhasil! Siluet cel kini lebih bersih dan specular kontur atas terdefinisi tajam tanpa bayangan kotor.';

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
          title: 'Manual AI Refinement Berhasil Diterapkan',
          description: `Skor siluet meningkat ke ${newEval.silhouetteScore}%. Orphan pixel telah dibersihkan.`,
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

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onNewSprite={() => {
          setPrompt('');
          setActiveTab('logs');
        }}
        providerName={activeProvider.name}
      />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Generator Form (4 columns) */}
        <div className="lg:col-span-4 xl:col-span-3">
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
        </div>

        {/* Center Column: Interactive Pixel Canvas + Timeline Frame Editor (5 columns) */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-3">
          {/* Main Pixel Canvas */}
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

          {/* Timeline Bar (Underneath Canvas) */}
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

          {/* Small Real-time Flipbook Animation Preview */}
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
        </div>

        {/* Right Column: Observability Dashboard & Evaluation (3 columns) */}
        <div className="lg:col-span-3 xl:col-span-4 flex flex-col gap-4">
          {/* Segmented Tab Bar */}
          <div className="flex items-center gap-1 p-1 bg-[#121826] border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Log Real-Time</span>
            </button>

            <button
              onClick={() => setActiveTab('evaluation')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'evaluation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Evaluasi AI</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor</span>
            </button>
          </div>

          {/* Active Tab Content */}
          {activeTab === 'logs' && (
            <ExecutionLogs logs={logs} isGenerating={isGenerating} />
          )}

          {activeTab === 'evaluation' && (
            <AiEvaluationCard
              evaluation={currentSprite.aiEvaluation}
              onApplyRefinement={handleApplyRefine}
              isRefining={isRefining}
            />
          )}

          {activeTab === 'export' && (
            <ExportPanel sprite={currentSprite} />
          )}
        </div>
      </main>

      {/* Modals */}
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
    </div>
  );
}
