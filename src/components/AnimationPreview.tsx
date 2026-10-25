import React, { useState, useEffect, useRef } from 'react';
import { AnimationType, SpriteFrame } from '../types/sprite';
import { Play, Pause, Film, Repeat, Sliders, Flame } from 'lucide-react';

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
    <div className="flex flex-col gap-3 p-3 bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#44403c]">
        <div className="flex items-center gap-1.5 font-pixel text-xs font-bold text-[#e7e5e4] uppercase tracking-wide">
          <Film className="w-4 h-4 text-[#fbbf24]" />
          <span>Monitor Animasi Cel</span>
        </div>
        <div className="flex items-center gap-2 font-tech text-xs">
          <span className="text-[#fbbf24] px-1.5 py-0.5 bg-[#141211] border border-[#44403c]">
            {activeFrames.length} Cel
          </span>
          <span className="text-[#a8a29e]">
            F:{currentFrameIndex + 1}/{activeFrames.length || 1}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Animated Canvas Monitor Box */}
        <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 flex items-center justify-center p-1.5 bg-[#141211] border-2 border-[#000] checkerboard-pattern overflow-hidden shadow-[inset_2px_2px_0_rgba(0,0,0,0.6)]">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pixelated"
          />
        </div>

        {/* Animation Set & Playback Controls */}
        <div className="flex-1 w-full flex flex-col gap-2">
          {/* Movement Tabs */}
          <div className="grid grid-cols-4 gap-1">
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
                  className={`py-1 text-center font-pixel text-[11px] border transition-all ${
                    isActive
                      ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                      : exists
                      ? 'bg-[#1c1917] text-[#e7e5e4] border-[#44403c] hover:bg-[#44403c]'
                      : 'bg-[#141211] text-[#78716c] border-dashed border-[#44403c] hover:text-[#fbbf24]'
                  }`}
                  title={exists ? `Gerakan ${anim.label}` : `Tempa gerakan ${anim.label}`}
                >
                  <div>{anim.label}</div>
                  <div className="text-[9px] font-tech opacity-80">
                    {exists ? `${framesInAnim.length}F` : '+Tempa'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Playback Controls & FPS */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#44403c]">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="forge-btn-secondary p-1 text-xs"
                title={isPlaying ? 'Jeda' : 'Putar'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={onToggleLoop}
                className={`p-1 border text-xs font-pixel ${
                  loop
                    ? 'bg-[#fbbf24] text-[#1c1917] border-[#000]'
                    : 'bg-[#141211] text-[#78716c] border-[#44403c]'
                }`}
                title={loop ? 'Loop Aktif' : 'Loop Mati'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* FPS Control */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-tech text-[#a8a29e]">
                {fps} FPS
              </span>
              <input
                type="range"
                min={2}
                max={20}
                value={fps}
                onChange={(e) => onChangeFps(Number(e.target.value))}
                className="w-20 sm:w-24 h-1.5 bg-[#141211] appearance-none cursor-pointer accent-[#ea580c] border border-[#44403c]"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
