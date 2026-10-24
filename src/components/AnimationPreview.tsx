import React, { useState, useEffect, useRef } from 'react';
import { AnimationType } from '../types/sprite';
import { Play, Pause, FastForward, Film } from 'lucide-react';

interface AnimationPreviewProps {
  frames: Record<AnimationType, string[][][]>;
  resolution: number;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({ frames, resolution }) => {
  const [activeAnim, setActiveAnim] = useState<AnimationType>('idle');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(6);
  const [currentFrameIndex, setCurrentFrameIndex] = useState<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const activeFrames = frames[activeAnim] || [];

  // Frame ticking loop
  useEffect(() => {
    if (!isPlaying || activeFrames.length <= 1) return;

    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIndex((prev) => (prev + 1) % activeFrames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, fps, activeFrames.length]);

  // Reset frame index when changing animation
  useEffect(() => {
    setCurrentFrameIndex(0);
  }, [activeAnim]);

  // Draw current frame to canvas
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
        const color = targetFrame[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [activeFrames, currentFrameIndex, resolution]);

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Film className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pratinjau Animasi Real-time</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Frame {currentFrameIndex + 1} / {activeFrames.length || 1}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Animated Canvas */}
        <div className="w-28 h-28 shrink-0 flex items-center justify-center p-2 bg-[#0b0f17] rounded-lg border border-slate-800 checkerboard-pattern overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full object-contain pixelated"
          />
        </div>

        {/* Controls */}
        <div className="flex-1 flex flex-col gap-2.5">
          {/* Animation State Tabs */}
          <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#0b0f17] rounded-lg border border-slate-800">
            {(['idle', 'walk', 'attack', 'hurt'] as AnimationType[]).map((anim) => (
              <button
                key={anim}
                onClick={() => setActiveAnim(anim)}
                className={`py-1 px-2 text-[11px] font-medium rounded capitalize transition-all ${
                  activeAnim === anim
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {anim === 'idle' ? 'Idle' : anim === 'walk' ? 'Walk' : anim === 'attack' ? 'Attack' : 'Hurt'}
              </button>
            ))}
          </div>

          {/* Play/Pause & FPS slider */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-white transition-colors"
              title={isPlaying ? 'Jeda Animasi' : 'Putar Animasi'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {fps} FPS
              </span>
              <input
                type="range"
                min={2}
                max={16}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
