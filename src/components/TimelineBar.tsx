import React, { useRef, useEffect } from 'react';
import { SpriteFrame } from '../types/sprite';
import {
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Repeat,
  Sliders,
  Film
} from 'lucide-react';

interface TimelineBarProps {
  frames: SpriteFrame[];
  currentFrameIndex: number;
  onSelectFrame: (index: number) => void;
  onAddFrame: () => void;
  onDuplicateFrame: () => void;
  onDeleteFrame: (index: number) => void;
  onMoveFrame: (fromIndex: number, toIndex: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  fps: number;
  onChangeFps: (newFps: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  onionSkin: boolean;
  onToggleOnionSkin: () => void;
  resolution: number;
}

// Mini canvas thumbnail for a cel frame
const FrameThumbnail: React.FC<{
  frame: SpriteFrame;
  resolution: number;
  isActive: boolean;
  index: number;
  onClick: () => void;
}> = ({ frame, resolution, isActive, index, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = resolution;
    const thumbSize = 44;
    canvas.width = thumbSize;
    canvas.height = thumbSize;

    const pixelScale = thumbSize / size;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, thumbSize, thumbSize);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = frame.pixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * pixelScale, y * pixelScale, pixelScale, pixelScale);
        }
      }
    }
  }, [frame.pixels, resolution]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative shrink-0 flex flex-col items-center p-1 border-2 transition-all select-none ${
        isActive
          ? 'bg-[#1c1917] border-[#fbbf24] shadow-[3px_3px_0_#000] -translate-y-0.5'
          : 'bg-[#141211] border-[#44403c] hover:border-[#a8a29e] hover:bg-[#1c1917]'
      }`}
      title={`Frame #${index + 1}: ${frame.name || 'Cel'}`}
    >
      <div className="w-11 h-11 checkerboard-pattern overflow-hidden flex items-center justify-center border border-[#000]">
        <canvas ref={canvasRef} className="w-full h-full object-contain pixelated" />
      </div>
      <span
        className={`text-[9px] font-tech font-bold mt-1 px-1 border ${
          isActive
            ? 'bg-[#ea580c] text-[#1c1917] border-[#000]'
            : 'bg-[#292524] text-[#a8a29e] border-[#44403c]'
        }`}
      >
        CEL #{index + 1}
      </span>
    </button>
  );
};

export const TimelineBar: React.FC<TimelineBarProps> = ({
  frames,
  currentFrameIndex,
  onSelectFrame,
  onAddFrame,
  onDuplicateFrame,
  onDeleteFrame,
  onMoveFrame,
  isPlaying,
  onTogglePlay,
  fps,
  onChangeFps,
  loop,
  onToggleLoop,
  onionSkin,
  onToggleOnionSkin,
  resolution
}) => {
  // Spacebar shortcut for Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay]);

  return (
    <div className="flex flex-col bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000] select-none">
      {/* Timeline Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 bg-[#1c1917] border-b-2 border-[#44403c]">
        {/* Playback & Frame Scrubber */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            onClick={onTogglePlay}
            className={`px-3 py-1 text-xs font-pixel flex items-center gap-1.5 border-2 transition-all ${
              isPlaying
                ? 'bg-[#fbbf24] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                : 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[3px_3px_0_#000]'
            }`}
            title="Putar / Jeda Animasi (Shortcut: Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>JEDA</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PUTAR</span>
              </>
            )}
          </button>

          {/* Stepper buttons */}
          <div className="flex items-center bg-[#141211] border border-[#44403c]">
            <button
              onClick={() => onSelectFrame((currentFrameIndex - 1 + frames.length) % frames.length)}
              className="p-1 text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#292524]"
              title="Frame Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-tech text-[#fbbf24] px-2 font-bold">
              {currentFrameIndex + 1}/{frames.length}
            </span>
            <button
              onClick={() => onSelectFrame((currentFrameIndex + 1) % frames.length)}
              className="p-1 text-[#a8a29e] hover:text-[#e7e5e4] hover:bg-[#292524]"
              title="Frame Berikutnya"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Onion Skinning Toggle */}
          <button
            onClick={onToggleOnionSkin}
            className={`px-2 py-1 text-xs font-pixel flex items-center gap-1 border transition-all ${
              onionSkin
                ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                : 'bg-[#141211] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
            }`}
            title="Toggle Bayangan Frame Sebelumnya (Ghost Cel)"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ONION SKIN</span>
          </button>

          {/* Loop Toggle */}
          <button
            onClick={onToggleLoop}
            className={`px-2 py-1 text-xs font-pixel flex items-center gap-1 border transition-all ${
              loop
                ? 'bg-[#292524] text-[#fbbf24] border-[#fbbf24]'
                : 'bg-[#141211] text-[#78716c] border-[#44403c]'
            }`}
            title="Toggle Putar Berulang (Loop)"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span className="hidden md:inline">LOOP</span>
          </button>
        </div>

        {/* Speed / FPS & Cel Editing Actions */}
        <div className="flex items-center gap-2">
          {/* FPS Stepper */}
          <div className="flex items-center gap-1 bg-[#141211] border border-[#44403c] px-2 py-1">
            <span className="text-[10px] font-tech text-[#a8a29e]">KECEPATAN:</span>
            <input
              type="number"
              min="1"
              max="24"
              value={fps}
              onChange={(e) => onChangeFps(Math.max(1, Math.min(24, parseInt(e.target.value) || 8)))}
              className="w-10 bg-[#292524] text-center font-tech text-xs text-[#fbbf24] border border-[#44403c] outline-none"
            />
            <span className="text-[10px] font-tech text-[#a8a29e]">FPS</span>
          </div>

          {/* Add Frame */}
          <button
            onClick={onAddFrame}
            className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 text-[#fbbf24]"
            title="Tambah Cel Kosong Baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tambah Cel</span>
          </button>

          {/* Duplicate Frame */}
          <button
            onClick={onDuplicateFrame}
            className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1 text-[#e7e5e4]"
            title="Duplikat Cel Terpilih ke Frame Baru"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salin</span>
          </button>

          {/* Delete Frame */}
          <button
            onClick={() => onDeleteFrame(currentFrameIndex)}
            disabled={frames.length <= 1}
            className="forge-btn-danger px-2.5 py-1 text-xs flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Hapus Cel Ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </div>
      </div>

      {/* Frame Filmstrip Reel Container */}
      <div className="p-3 overflow-x-auto bg-[#141211] flex items-center gap-2.5 min-h-[80px]">
        {frames.map((frame, idx) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            resolution={resolution}
            isActive={idx === currentFrameIndex}
            index={idx}
            onClick={() => onSelectFrame(idx)}
          />
        ))}

        {/* Quick Add Cel Placeholder Button */}
        <button
          onClick={onAddFrame}
          className="w-11 h-14 border-2 border-dashed border-[#44403c] bg-[#1c1917]/50 hover:bg-[#292524] hover:border-[#fbbf24] text-[#a8a29e] hover:text-[#fbbf24] flex flex-col items-center justify-center gap-1 shrink-0 transition-colors"
          title="Tambah Cel Baru"
        >
          <Plus className="w-4 h-4" />
          <span className="text-[8px] font-tech">+CEL</span>
        </button>
      </div>
    </div>
  );
};
