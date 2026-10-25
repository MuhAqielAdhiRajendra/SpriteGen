import React, { useState } from 'react';
import { CharacterSprite } from '../types/sprite';
import { Download, FileJson, Palette, Copy, Check, Image as ImageIcon, Film, PlaySquare } from 'lucide-react';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';

interface ExportPanelProps {
  sprite: CharacterSprite;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ sprite }) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isExportingGif, setIsExportingGif] = useState<boolean>(false);

  // Helper to export current active frame to PNG with crisp pixelated scaling
  const downloadCurrentFramePng = (scale: number = 1) => {
    const size = sprite.resolution;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const currentFrame = sprite.frames[sprite.currentFrameIndex] || sprite.frames[0];
    const pixels = currentFrame?.pixels || sprite.currentPixels;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = pixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_frame_${sprite.currentFrameIndex + 1}_${size}px.png`;
    a.click();
  };

  // Helper to export horizontal sprite sheet PNG (all frames side-by-side)
  const downloadSpriteSheet = (scale: number = 2) => {
    const size = sprite.resolution;
    const frames = sprite.frames;
    if (!frames || frames.length === 0) return;

    const totalFrames = frames.length;
    const canvas = document.createElement('canvas');
    canvas.width = totalFrames * size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    frames.forEach((frame, frameIdx) => {
      const offsetX = frameIdx * size * scale;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const color = frame.pixels[y]?.[x] || 'transparent';
          if (color !== 'transparent') {
            ctx.fillStyle = color;
            ctx.fillRect(offsetX + x * scale, y * scale, scale, scale);
          }
        }
      }
    });

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_spritesheet_${totalFrames}frames.png`;
    a.click();
  };

  // Helper to export animated GIF using gifenc
  const downloadAnimatedGif = async () => {
    if (isExportingGif) return;
    setIsExportingGif(true);

    try {
      const gif = GIFEncoder();
      const size = sprite.resolution;
      const scale = size <= 32 ? 4 : size <= 64 ? 2 : 1;
      const outWidth = size * scale;
      const outHeight = size * scale;
      const fps = sprite.fps || 8;
      const delay = Math.round(1000 / fps);

      for (const frame of sprite.frames) {
        const canvas = document.createElement('canvas');
        canvas.width = outWidth;
        canvas.height = outHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, outWidth, outHeight);

        for (let y = 0; y < size; y++) {
          for (let x = 0; x < size; x++) {
            const color = frame.pixels[y]?.[x] || 'transparent';
            if (color !== 'transparent') {
              ctx.fillStyle = color;
              ctx.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }

        const { data } = ctx.getImageData(0, 0, outWidth, outHeight);
        const palette = quantize(data, 256, { format: 'rgba4444' });
        const index = applyPalette(data, palette);
        const transparentIndex = palette.findIndex((c: number[]) => c[3] === 0);

        gif.writeFrame(index, outWidth, outHeight, {
          palette,
          delay,
          transparent: transparentIndex >= 0,
          transparentIndex: transparentIndex >= 0 ? transparentIndex : undefined
        });
      }

      gif.finish();
      const buffer = gif.bytes();
      const blob = new Blob([buffer as any], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_${sprite.frames.length}frames.gif`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to encode GIF:', err);
    } finally {
      setIsExportingGif(false);
    }
  };

  // Export JSON Metadata
  const copyJson = () => {
    const exportData = {
      name: sprite.name,
      prompt: sprite.prompt,
      frameWidth: sprite.resolution,
      frameHeight: sprite.resolution,
      frameCount: sprite.frames.length,
      fps: sprite.fps,
      loop: sprite.loop,
      palette: sprite.palette,
      colorGrading: sprite.colorGrading,
      direction: sprite.direction,
      isAnimated: sprite.isAnimated,
      frames: sprite.frames.map((f, i) => ({
        index: i,
        id: f.id,
        name: f.name,
        pixels: f.pixels
      })),
      aiEvaluation: sprite.aiEvaluation,
      createdAt: sprite.createdAt
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Download Palette
  const downloadPaletteHex = () => {
    const content = sprite.palette.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.paletteName}_palette.hex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Download className="w-4 h-4 text-indigo-400" />
          <span>Opsi Ekspor & Aset Game</span>
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          {sprite.frames.length} Frame · {sprite.resolution}×{sprite.resolution}
        </span>
      </div>

      {/* Primary Export Actions: Spritesheet & Animated GIF */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-300 block">
          Format Animasi Game Engine:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Spritesheet Button */}
          <button
            onClick={() => downloadSpriteSheet(2)}
            className="p-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow shadow-indigo-600/30"
            title="Ekspor seluruh frame berjajar horizontal dalam satu file PNG transparan"
          >
            <PlaySquare className="w-4 h-4" />
            <div className="text-left">
              <span className="block leading-tight">Spritesheet PNG</span>
              <span className="text-[10px] text-indigo-200 font-normal">
                {sprite.frames.length} frame berjajar horizontal
              </span>
            </div>
          </button>

          {/* Animated GIF Button */}
          <button
            onClick={downloadAnimatedGif}
            disabled={isExportingGif}
            className="p-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow shadow-emerald-600/30 disabled:opacity-50"
            title="Ekspor animasi flipbook ke format GIF transparan"
          >
            <Film className="w-4 h-4" />
            <div className="text-left">
              <span className="block leading-tight">
                {isExportingGif ? 'Mengencode GIF...' : 'GIF Animasi'}
              </span>
              <span className="text-[10px] text-emerald-200 font-normal">
                {sprite.fps} FPS · Transparan
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Standalone Single Frame PNG resolutions */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <span className="text-[11px] font-semibold text-slate-300 block">
          Unduh Frame Aktif (#{sprite.currentFrameIndex + 1}) Satuan:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => downloadCurrentFramePng(1)}
            className="p-2.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex flex-col items-center gap-1"
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">Skala 1×</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sprite.resolution}×{sprite.resolution}
            </span>
          </button>

          <button
            onClick={() => downloadCurrentFramePng(4)}
            className="p-2.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex flex-col items-center gap-1"
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span className="font-semibold">Skala 4× (Crisp)</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sprite.resolution * 4}×{sprite.resolution * 4}
            </span>
          </button>

          <button
            onClick={() => downloadCurrentFramePng(8)}
            className="p-2.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex flex-col items-center gap-1"
          >
            <ImageIcon className="w-4 h-4 text-purple-400" />
            <span className="font-semibold">Skala 8× (HD)</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sprite.resolution * 8}×{sprite.resolution * 8}
            </span>
          </button>
        </div>
      </div>

      {/* JSON & Palette Export */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
        <button
          onClick={copyJson}
          className="py-2 px-3 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedJson ? 'Tersalin!' : 'Salin JSON Matriks'}</span>
        </button>

        <button
          onClick={downloadPaletteHex}
          className="py-2 px-3 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-colors"
        >
          <Palette className="w-3.5 h-3.5 text-indigo-400" />
          <span>Unduh Palet .HEX</span>
        </button>
      </div>
    </div>
  );
};
