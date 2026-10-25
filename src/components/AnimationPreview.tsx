import React, { useState, useEffect, useRef } from 'react';
import { AnimationType, SpriteFrame } from '../types/sprite';
import { Play, Pause, Film, Sparkles, Repeat, Sliders } from 'lucide-react';

interface AnimationPreviewProps {
  animations: Record<string, SpriteFrame[]>;
  activeAnimationKey: string;
  onSelectAnimation: (key: string) => void;
  resolution: number;
  fps: number;
  onChangeFps: (fps: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  onSynthesizeAnimation?: (animType: AnimationType) => void;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  animations,
  activeAnimationKey,
  onSelectAnimation,
  resolution,
  fps,
  onChangeFps,
  loop,
  onToggleLoop,
  onSynthesizeAnimation
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeFrames = animations[activeAnimationKey] || [];
  const hasMotion = activeFrames.length > 1;

  // Frame ticking loop - Pure frame sequence cycling (flipbook style)
  useEffect(() => {
    if (!isPlaying || activeFrames.length <= 1) return;

    const interval = Math.max(20, Math.round(1000 / fps));
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        if (!loop && prev === activeFrames.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return (prev + 1) % activeFrames.length;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, fps, activeFrames.length, loop]);

  // Reset frame index when changing animation
  useEffect(() => {
    setCurrentFrameIndex(0);
  }, [activeAnimationKey]);

  // Draw current frame to preview canvas (strictly pixelated)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const targetFrame = activeFrames[currentFrameIndex] || activeFrames[0];
    if (!targetFrame) return;

    const scale = 4;
    canvas.width = resolution * scale;
    canvas.height = resolution * scale;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < resolution; y++) {
      for (let x = 0; x < resolution; x++) {
        const color = targetFrame.pixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [activeFrames, currentFrameIndex, resolution]);

  const allPossibleAnims: { id: AnimationType; label: string }[] = [
    { id: 'idle', label: 'Idle' },
    { id: 'walk', label: 'Walk' },
    { id: 'attack', label: 'Attack' },
    { id: 'hurt', label: 'Hurt' }
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Film className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pratinjau Animasi Cel Flipbook</span>
        </div>
        <div className="flex items-center gap-2">
          {hasMotion ? (
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              {activeFrames.length} Cel Frame
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded">
              1 Frame (Statis)
            </span>
          )}
          <span className="text-[11px] font-mono text-slate-400">
            Frame {currentFrameIndex + 1} / {activeFrames.length || 1}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Animated Canvas */}
        <div className="w-28 h-28 shrink-0 flex items-center justify-center p-2 bg-[#0b0f17] rounded-lg border border-slate-800 checkerboard-pattern overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pixelated"
          />
        </div>

        {/* Controls and Animation Selection */}
        <div className="flex-1 w-full flex flex-col gap-2.5">
          {/* Animation Set Tabs */}
          <div className="flex flex-wrap gap-1 p-1 bg-[#0b0f17] rounded-lg border border-slate-800">
            {allPossibleAnims.map((anim) => {
              const framesInAnim = animations[anim.id];
              const exists = framesInAnim && framesInAnim.length > 0;
              const isActive = activeAnimationKey === anim.id;

              return (
                <button
                  key={anim.id}
                  onClick={() => {
                    if (exists) {
                      onSelectAnimation(anim.id);
                    } else if (onSynthesizeAnimation) {
                      onSynthesizeAnimation(anim.id);
                      onSelectAnimation(anim.id);
                    }
                  }}
                  className={`py-1 px-2.5 text-[11px] font-medium rounded capitalize transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : exists
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-850 border border-dashed border-slate-800'
                  }`}
                  title={exists ? `Pilih animasi ${anim.label}` : `Minta AI buat rangkaian cel ${anim.label}`}
                >
                  <span>{anim.label}</span>
                  {exists ? (
                    <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-slate-300">
                      {framesInAnim.length}
                    </span>
                  ) : (
                    <span className="text-[9px] text-indigo-400 font-semibold">+ Buat</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Playback Controls & FPS */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title={isPlaying ? 'Jeda Pratinjau' : 'Putar Pratinjau'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onToggleLoop}
              className={`p-1.5 rounded-md border text-xs transition-colors ${
                loop
                  ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                  : 'bg-[#0b0f17] border-slate-800 text-slate-500'
              }`}
              title={loop ? 'Loop Aktif' : 'Loop Non-aktif'}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-slate-400 whitespace-nowrap font-mono">
                {fps} FPS
              </span>
              <input
                type="range"
                min={4}
                max={24}
                value={fps}
                onChange={(e) => onChangeFps(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
