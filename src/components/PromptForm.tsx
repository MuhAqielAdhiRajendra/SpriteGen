import React, { useState, useEffect } from 'react';
import {
  CharacterDirection,
  SpriteResolution,
  AIProviderConfig,
  AnimationType,
  ColorGradingMode
} from '../types/sprite';
import { PALETTES } from '../utils/pixelEngine';
import { Hammer, Sliders, Shield, Flame, Check } from 'lucide-react';

interface PromptFormProps {
  prompt: string;
  setPrompt: (val: string) => void;
  resolution: SpriteResolution;
  setResolution: (val: SpriteResolution) => void;
  direction: CharacterDirection;
  setDirection: (val: CharacterDirection) => void;
  paletteKey: string;
  setPaletteKey: (val: string) => void;
  colorGrading: ColorGradingMode;
  setColorGrading: (val: ColorGradingMode) => void;
  requestedAnimations: AnimationType[];
  setRequestedAnimations: (val: AnimationType[]) => void;
  autoRefine: boolean;
  setAutoRefine: (val: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  activeProvider: AIProviderConfig;
  onOpenSettings: () => void;
}

const FORGE_SUGGESTIONS = [
  'Zirah perak tebal',
  'Jubah merah pendek',
  'Pedang baja bermata ganda',
  'Perisai lambang matahari',
  'Tudung pengembara',
  'Tongkat kristal sihir'
];

const ANIMATION_OPTIONS: { id: AnimationType; label: string; desc: string }[] = [
  { id: 'idle', label: 'Idle', desc: 'Siaga napas' },
  { id: 'walk', label: 'Walk', desc: 'Siklus langkah' },
  { id: 'attack', label: 'Attack', desc: 'Tebasan pedang' },
  { id: 'hurt', label: 'Hurt', desc: 'Terpukul mundur' }
];

const FORGE_LOADING_TEXTS = [
  'Memanaskan tungku api...',
  'Menempa kerangka besi...',
  'Membentuk siluet tubuh...',
  'Mewarnai zirah & perlengkapan...',
  'Mendinginkan bilah baja...'
];

export const PromptForm: React.FC<PromptFormProps> = ({
  prompt,
  setPrompt,
  resolution,
  setResolution,
  direction,
  setDirection,
  paletteKey,
  setPaletteKey,
  colorGrading,
  setColorGrading,
  requestedAnimations,
  setRequestedAnimations,
  autoRefine,
  setAutoRefine,
  isGenerating,
  onGenerate,
  activeProvider,
  onOpenSettings
}) => {
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);

  // Rotate loading texts every 800ms
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingTextIndex((prev) => (prev + 1) % FORGE_LOADING_TEXTS.length);
    }, 850);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const addTag = (tag: string) => {
    if (prompt.trim()) {
      setPrompt(`${prompt.trim()}, ${tag}`);
    } else {
      setPrompt(tag);
    }
  };

  const toggleAnimation = (anim: AnimationType) => {
    if (requestedAnimations.includes(anim)) {
      setRequestedAnimations(requestedAnimations.filter((a) => a !== anim));
    } else {
      setRequestedAnimations([...requestedAnimations, anim]);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000]">
      {/* Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#44403c]">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-[#ea580c]" />
          <h2 className="font-pixel text-sm font-bold text-[#e7e5e4] uppercase tracking-wider">
            Tungku Penempaan
          </h2>
        </div>

        <button
          onClick={onOpenSettings}
          className="text-[11px] font-tech text-[#a8a29e] hover:text-[#fbbf24] flex items-center gap-1 border border-[#44403c] px-1.5 py-0.5 bg-[#1c1917]"
          title="Konfigurasi Engine"
        >
          <span className="w-2 h-2 bg-[#ea580c] inline-block" />
          <span>{activeProvider.type.toUpperCase()}</span>
        </button>
      </div>

      {/* 1. Prompt Input Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-pixel text-[#e7e5e4] font-bold">
            Deskripsi Karakter:
          </label>
          <span className="text-[10px] font-tech text-[#a8a29e]">
            {prompt.length}/240
          </span>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ksatria zirah biru, pedang, jubah merah pendek..."
          rows={3}
          disabled={isGenerating}
          className="w-full p-2.5 bg-[#141211] border-2 border-[#44403c] text-sm font-body text-[#e7e5e4] placeholder-[#78716c] focus:border-[#fbbf24] outline-none resize-none"
        />

        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {FORGE_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              disabled={isGenerating}
              className="text-[10px] font-tech px-2 py-0.5 bg-[#1c1917] hover:bg-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4] border border-[#44403c] transition-colors"
            >
              +{tag}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Resolution Selection (32, 64, 128) */}
      <div className="space-y-1.5">
        <label className="font-pixel text-xs text-[#e7e5e4] font-bold block">
          Resolusi Kanvas (Pixel):
        </label>
        <div className="grid grid-cols-3 gap-2">
          {([32, 64, 128] as SpriteResolution[]).map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => setResolution(res)}
              disabled={isGenerating}
              className={`py-2 px-1 text-center font-pixel text-xs border-2 transition-all ${
                resolution === res
                  ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                  : 'bg-[#1c1917] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
              }`}
            >
              <div>{res}×{res}</div>
              <div className="text-[9px] font-tech opacity-80">
                {res === 32 ? 'Klasik 16-bit' : res === 64 ? 'Detail RPG' : 'Resolusi Tinggi'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Direction & Palette */}
      <div className="grid grid-cols-2 gap-3">
        {/* Direction */}
        <div className="space-y-1">
          <label className="font-pixel text-xs text-[#e7e5e4] font-bold block">
            Arah Hadap:
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'front', label: 'Depan' },
                { id: 'right', label: 'Kanan' },
                { id: 'back', label: 'Belakang' }
              ] as { id: CharacterDirection; label: string }[]
            ).map((dir) => (
              <button
                key={dir.id}
                type="button"
                onClick={() => setDirection(dir.id)}
                disabled={isGenerating}
                className={`py-1 text-[11px] font-pixel border ${
                  direction === dir.id
                    ? 'bg-[#fbbf24] text-[#1c1917] border-[#000] font-bold'
                    : 'bg-[#1c1917] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
                }`}
              >
                {dir.label}
              </button>
            ))}
          </div>
        </div>

        {/* Palette Preset */}
        <div className="space-y-1">
          <label className="font-pixel text-xs text-[#e7e5e4] font-bold block">
            Palet Warna:
          </label>
          <select
            value={paletteKey}
            onChange={(e) => setPaletteKey(e.target.value)}
            disabled={isGenerating}
            className="w-full py-1 px-1.5 bg-[#141211] border-2 border-[#44403c] text-xs font-tech text-[#e7e5e4] focus:border-[#fbbf24] outline-none"
          >
            {Object.values(PALETTES).map((pal) => (
              <option key={pal.id} value={pal.id}>
                {pal.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Requested Animations (Checkboxes) */}
      <div className="space-y-1.5">
        <label className="font-pixel text-xs text-[#e7e5e4] font-bold block">
          Rangkaian Gerak Animasi Cel:
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {ANIMATION_OPTIONS.map((anim) => {
            const isChecked = requestedAnimations.includes(anim.id);
            return (
              <button
                key={anim.id}
                type="button"
                onClick={() => toggleAnimation(anim.id)}
                disabled={isGenerating}
                className={`flex items-center gap-2 p-1.5 border text-left transition-colors ${
                  isChecked
                    ? 'bg-[#1c1917] border-[#fbbf24] text-[#fbbf24]'
                    : 'bg-[#141211] border-[#44403c] text-[#a8a29e] hover:text-[#e7e5e4]'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-[#fbbf24] border-[#000]' : 'border-[#44403c]'
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 text-[#1c1917] stroke-[3]" />}
                </div>
                <div>
                  <div className="text-xs font-pixel font-bold">{anim.label}</div>
                  <div className="text-[9px] font-tech text-[#a8a29e]">{anim.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Auto Refine Slag Toggle */}
      <div className="flex items-center justify-between pt-1 border-t border-[#44403c]">
        <label
          htmlFor="autoRefineToggle"
          className="text-xs font-body text-[#a8a29e] flex items-center gap-1.5 cursor-pointer"
        >
          <Shield className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span>Pembersihan Terak Otomatis (Hapus orphan pixel)</span>
        </label>
        <button
          id="autoRefineToggle"
          type="button"
          onClick={() => setAutoRefine(!autoRefine)}
          disabled={isGenerating}
          className={`w-8 h-4 border-2 border-[#000] p-0.5 flex items-center transition-colors ${
            autoRefine ? 'bg-[#ea580c] justify-end' : 'bg-[#141211] justify-start'
          }`}
        >
          <div className="w-2.5 h-2.5 bg-[#e7e5e4] shadow-sm" />
        </button>
      </div>

      {/* 6. Primary Action: "Tempa Karakter" with 16x16 Blacksmith Mascot */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full forge-btn-primary py-3 px-4 flex items-center justify-center gap-2 text-sm uppercase tracking-wider relative overflow-hidden"
        >
          {isGenerating ? (
            <div className="flex items-center gap-3">
              {/* 16x16 Pixel Blacksmith Mascot */}
              <div className="w-6 h-6 flex items-center justify-center">
                <svg
                  className="w-5 h-5 animate-hammer"
                  viewBox="0 0 16 16"
                  shapeRendering="crispEdges"
                >
                  {/* Blacksmith Anvil */}
                  <rect x="2" y="12" width="12" height="3" fill="#1c1917" />
                  <rect x="4" y="10" width="8" height="2" fill="#44403c" />
                  {/* Glowing Iron Ingot on Anvil */}
                  <rect x="6" y="9" width="4" height="2" fill="#ea580c" />
                  <rect x="7" y="9" width="2" height="1" fill="#fbbf24" />
                  {/* Hammer Head & Handle */}
                  <rect x="8" y="3" width="2" height="5" fill="#a8a29e" />
                  <rect x="6" y="2" width="6" height="3" fill="#1c1917" />
                  {/* Sparks */}
                  <rect x="5" y="7" width="1" height="1" fill="#fbbf24" />
                  <rect x="10" y="8" width="1" height="1" fill="#fbbf24" />
                </svg>
              </div>
              <span className="font-pixel text-[#1c1917]">
                {FORGE_LOADING_TEXTS[loadingTextIndex]}
              </span>
            </div>
          ) : (
            <>
              <Hammer className="w-4 h-4 text-[#1c1917]" />
              <span>Tempa Karakter</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
