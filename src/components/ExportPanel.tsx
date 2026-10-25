import React, { useState } from 'react';
import { CharacterSprite } from '../types/sprite';
import { Download, FileJson, Palette, Copy, Check, Image as ImageIcon, Film, PlaySquare, Package } from 'lucide-react';
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
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_cel_${sprite.currentFrameIndex + 1}_${size}px.png`;
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
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_sheet_${totalFrames}frames.png`;
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

        const rawData = ctx.getImageData(0, 0, outWidth, outHeight).data;
        const palette = quantize(rawData, 64);
        const index = applyPalette(rawData, palette);

        gif.writeFrame(index, outWidth, outHeight, {
          palette,
          delay
        });
      }

      gif.finish();
      const buffer = gif.bytes();
      const blob = new Blob([buffer as any], { type: 'image/gif' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_animasi.gif`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('GIF export error:', err);
    } finally {
      setIsExportingGif(false);
    }
  };

  const copyJson = () => {
    const exportData = {
      name: sprite.name,
      prompt: sprite.prompt,
      resolution: sprite.resolution,
      palette: sprite.palette,
      fps: sprite.fps,
      totalFrames: sprite.frames.length,
      frames: sprite.frames.map((f, i) => ({
        index: i,
        name: f.name,
        pixels: f.pixels
      }))
    };

    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadPaletteHex = () => {
    const hexContent = sprite.palette.join('\n');
    const blob = new Blob([hexContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_palet.hex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#44403c]">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-[#ea580c]" />
          <h3 className="font-pixel text-xs font-bold text-[#e7e5e4] uppercase tracking-wider">
            Ruang Ekspor Karakter
          </h3>
        </div>
        <span className="text-[10px] font-tech text-[#fbbf24] px-1.5 py-0.5 bg-[#141211] border border-[#44403c]">
          {sprite.resolution}×{sprite.resolution} PX
        </span>
      </div>

      {/* Main Export Options (Spritesheet & GIF) */}
      <div className="space-y-2">
        <span className="font-pixel text-xs text-[#a8a29e] block">
          Format Animasi & Sheet Game Engine:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Spritesheet Button */}
          <button
            onClick={() => downloadSpriteSheet(2)}
            className="forge-btn-primary p-2.5 text-xs flex items-center gap-2"
            title="Ekspor seluruh cel frame berjajar horizontal dalam satu file PNG"
          >
            <PlaySquare className="w-4 h-4 text-[#1c1917] shrink-0" />
            <div className="text-left">
              <span className="block font-bold">Spritesheet PNG</span>
              <span className="text-[9px] font-tech font-normal opacity-90">
                {sprite.frames.length} Cel Berjajar
              </span>
            </div>
          </button>

          {/* Animated GIF Button */}
          <button
            onClick={downloadAnimatedGif}
            disabled={isExportingGif}
            className="forge-btn-secondary p-2.5 text-xs flex items-center gap-2"
            title="Ekspor animasi flipbook ke format GIF transparan"
          >
            <Film className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <div className="text-left">
              <span className="block font-bold text-[#e7e5e4]">
                {isExportingGif ? 'Mengencode...' : 'GIF Animasi'}
              </span>
              <span className="text-[9px] font-tech text-[#a8a29e]">
                {sprite.fps} FPS · Transparan
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Standalone Single Cel Frame PNG */}
      <div className="space-y-1.5 pt-2 border-t-2 border-[#44403c]">
        <span className="font-pixel text-xs text-[#a8a29e] block">
          Unduh Cel Aktif (#{sprite.currentFrameIndex + 1}):
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => downloadCurrentFramePng(1)}
            className="p-2 bg-[#141211] border-2 border-[#44403c] hover:border-[#fbbf24] text-center transition-colors"
          >
            <span className="font-pixel text-xs text-[#e7e5e4] block">1× Asli</span>
            <span className="text-[10px] font-tech text-[#a8a29e]">
              {sprite.resolution}px
            </span>
          </button>

          <button
            onClick={() => downloadCurrentFramePng(4)}
            className="p-2 bg-[#141211] border-2 border-[#44403c] hover:border-[#fbbf24] text-center transition-colors"
          >
            <span className="font-pixel text-xs text-[#fbbf24] block">4× Crisp</span>
            <span className="text-[10px] font-tech text-[#a8a29e]">
              {sprite.resolution * 4}px
            </span>
          </button>

          <button
            onClick={() => downloadCurrentFramePng(8)}
            className="p-2 bg-[#141211] border-2 border-[#44403c] hover:border-[#fbbf24] text-center transition-colors"
          >
            <span className="font-pixel text-xs text-[#ea580c] block">8× HD</span>
            <span className="text-[10px] font-tech text-[#a8a29e]">
              {sprite.resolution * 8}px
            </span>
          </button>
        </div>
      </div>

      {/* JSON Matrix & Hex Palette */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-[#44403c]">
        <button
          onClick={copyJson}
          className="forge-btn-secondary py-1.5 px-2 text-xs flex items-center justify-center gap-1.5"
        >
          {copiedJson ? <Check className="w-3.5 h-3.5 text-[#fbbf24]" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedJson ? 'Tersalin!' : 'Salin JSON'}</span>
        </button>

        <button
          onClick={downloadPaletteHex}
          className="forge-btn-secondary py-1.5 px-2 text-xs flex items-center justify-center gap-1.5"
        >
          <Palette className="w-3.5 h-3.5 text-[#ea580c]" />
          <span>Unduh .HEX</span>
        </button>
      </div>
    </div>
  );
};
