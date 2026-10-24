import React, { useState } from 'react';
import { CharacterSprite } from '../types/sprite';
import { Download, FileJson, Palette, Copy, Check, Image as ImageIcon } from 'lucide-react';

interface ExportPanelProps {
  sprite: CharacterSprite;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ sprite }) => {
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Helper to export canvas to PNG with crisp pixelated scaling
  const downloadPng = (scale: number = 1) => {
    const size = sprite.resolution;
    const canvas = document.createElement('canvas');
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const color = sprite.currentPixels[y]?.[x] || 'transparent';
        if (color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sprite.name.toLowerCase().replace(/\s+/g, '_')}_${size}px_${scale}x.png`;
    a.click();
  };

  // Helper to export multi-frame sprite sheet
  const downloadSpriteSheet = () => {
    const size = sprite.resolution;
    const allFrames = [
      ...sprite.frames.idle,
      ...sprite.frames.walk,
      ...sprite.frames.attack,
      ...sprite.frames.hurt
    ];

    if (allFrames.length === 0) return;

    const scale = 2;
    const totalFrames = allFrames.length;
    const canvas = document.createElement('canvas');
    canvas.width = totalFrames * size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    allFrames.forEach((frame, frameIdx) => {
      const offsetX = frameIdx * size * scale;
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const color = frame[y]?.[x] || 'transparent';
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

  // Export JSON
  const copyJson = () => {
    const exportData = {
      name: sprite.name,
      prompt: sprite.prompt,
      resolution: sprite.resolution,
      palette: sprite.palette,
      archetype: sprite.archetype,
      direction: sprite.direction,
      pixels: sprite.currentPixels,
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
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">
          Opsi Ekspor & Aset Game
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          Format PNG Transparan
        </span>
      </div>

      {/* Standalone PNG resolutions */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-300 block">
          Unduh Gambar Sprite Tunggal:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => downloadPng(1)}
            className="p-2.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex flex-col items-center gap-1"
          >
            <ImageIcon className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold">Skala 1×</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sprite.resolution}×{sprite.resolution}
            </span>
          </button>

          <button
            onClick={() => downloadPng(4)}
            className="p-2.5 rounded-lg bg-[#0b0f17] hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 transition-colors flex flex-col items-center gap-1"
          >
            <ImageIcon className="w-4 h-4 text-sky-400" />
            <span className="font-semibold">Skala 4× (Crisp)</span>
            <span className="text-[10px] text-slate-500 font-mono">
              {sprite.resolution * 4}×{sprite.resolution * 4}
            </span>
          </button>

          <button
            onClick={() => downloadPng(8)}
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

      {/* Sprite Sheet Button */}
      <div className="pt-2 border-t border-slate-800/80">
        <button
          onClick={downloadSpriteSheet}
          className="w-full py-2.5 px-3 rounded-lg bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow"
        >
          <Download className="w-4 h-4" />
          <span>Unduh Sprite Sheet Lengkap (Idle, Walk, Attack, Hurt)</span>
        </button>
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
