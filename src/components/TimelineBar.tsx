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
  Sparkles
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
    const thumbSize = 48;
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
      className={`relative group shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg border transition-all cursor-pointer ${
        isActive
          ? 'bg-indigo-950/60 border-indigo-500 shadow-md ring-2 ring-indigo-500/50'
          : 'bg-[#0b0f17] border-slate-800 hover:border-slate-700 hover:bg-slate-900'
      }`}
      title={`Pilih Frame ${index + 1} (${frame.name || 'Cel'})`}
    >
      <div className="w-12 h-12 rounded checkerboard-pattern overflow-hidden flex items-center justify-center border border-black/40">
        <canvas ref={canvasRef} className="w-full h-full object-contain pixelated" />
      </div>
      <span
        className={`text-[10px] font-mono px-1 rounded ${
          isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
        }`}
      >
        #{index + 1}
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
  const canMoveLeft = currentFrameIndex > 0;
  const canMoveRight = currentFrameIndex < frames.length - 1;
  const canDelete = frames.length > 1;

  const handleStepPrev = () => {
    if (frames.length <= 1) return;
    const prev = (currentFrameIndex - 1 + frames.length) % frames.length;
    onSelectFrame(prev);
  };

  const handleStepNext = () => {
    if (frames.length <= 1) return;
    const next = (currentFrameIndex + 1) % frames.length;
    onSelectFrame(next);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#0d131f] border border-slate-800 rounded-xl shadow-inner">
      {/* Top Timeline Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`p-1.5 rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors shadow ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isPlaying ? 'Jeda Animasi (Spasi)' : 'Putar Animasi Frame-by-Frame (Spasi)'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="text-[11px]">{isPlaying ? 'Jeda' : 'Putar'}</span>
          </button>

          <button
            type="button"
            onClick={handleStepPrev}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-white border border-slate-800"
            title="Langkah ke Frame Sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <span className="text-[11px] font-mono text-slate-300 px-1">
            {currentFrameIndex + 1} / {frames.length}
          </span>

          <button
            type="button"
            onClick={handleStepNext}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-white border border-slate-800"
            title="Langkah ke Frame Berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleLoop}
            className={`p-1.5 rounded-md border text-xs transition-colors ${
              loop
                ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300'
                : 'bg-[#0b0f17] border-slate-800 text-slate-500'
            }`}
            title={loop ? 'Loop Berulang Aktif' : 'Loop Non-aktif'}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* FPS Slider & Onion Skin Toggle */}
        <div className="flex items-center gap-3">
          {/* Onion Skinning */}
          <button
            type="button"
            onClick={onToggleOnionSkin}
            className={`px-2 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              onionSkin
                ? 'bg-amber-950/40 border-amber-500/80 text-amber-300 font-semibold shadow-sm'
                : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Tampilkan frame sebelumnya secara transparan (ghosting) sebagai panduan menggambar cel"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px]">Onion Skin</span>
          </button>

          {/* FPS Slider */}
          <div className="flex items-center gap-1.5 bg-[#0b0f17] px-2 py-1 rounded-md border border-slate-800">
            <span className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
              {fps} FPS
            </span>
            <input
              type="range"
              min={4}
              max={24}
              value={fps}
              onChange={(e) => onChangeFps(Number(e.target.value))}
              className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              title={`Kecepatan: ${fps} Frame per detik`}
            />
          </div>
        </div>
      </div>

      {/* Frame Strip & Frame Operations */}
      <div className="flex items-center justify-between gap-3 pt-1">
        {/* Frame Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDuplicateFrame}
            className="px-2 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors shadow"
            title="Duplikat frame saat ini (menyalin semua pixel ke frame baru untuk diubah sedikit)"
          >
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Duplikat Frame</span>
            <span className="sm:hidden">Duplikat</span>
          </button>

          <button
            type="button"
            onClick={onAddFrame}
            className="px-2 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium flex items-center gap-1 transition-colors border border-slate-700/60"
            title="Tambah Frame Kosong Baru (Transparent)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Frame Kosong</span>
            <span className="sm:hidden">+ Baru</span>
          </button>

          <button
            type="button"
            onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex - 1)}
            disabled={!canMoveLeft}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800"
            title="Pindah Frame ke Kiri (Sebelumnya)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onMoveFrame(currentFrameIndex, currentFrameIndex + 1)}
            disabled={!canMoveRight}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800"
            title="Pindah Frame ke Kanan (Setelahnya)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDeleteFrame(currentFrameIndex)}
            disabled={!canDelete}
            className="p-1.5 rounded-md bg-[#0b0f17] text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-800"
            title="Hapus Frame Saat Ini"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Frame Thumbnails Strip */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto py-1 px-1 max-w-[calc(100vw-80px)] sm:max-w-none">
          {frames.map((frame, idx) => (
            <FrameThumbnail
              key={frame.id}
              frame={frame}
              resolution={resolution}
              index={idx}
              isActive={idx === currentFrameIndex}
              onClick={() => onSelectFrame(idx)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
