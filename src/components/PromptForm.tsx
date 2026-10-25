import React from 'react';
import {
  CharacterDirection,
  SpriteResolution,
  AIProviderConfig,
  AnimationType,
  ColorGradingMode
} from '../types/sprite';
import { PALETTES } from '../utils/pixelEngine';
import { Sparkles, Settings, Film, Palette, Compass, Zap } from 'lucide-react';

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

const PROMPT_SUGGESTIONS = [
  '+ Zirah Perak Bersinar',
  '+ Jubah Merah Panjang',
  '+ Pedang Kristal Cyan',
  '+ Sayap Hitam Gagak',
  '+ Visor Cyberpunk Neon',
  '+ Perisai Emas',
  '+ (Animasi) Berjalan',
  '+ (Animasi) Serangan Tebas'
];

const COLOR_GRADING_OPTIONS: { id: ColorGradingMode; label: string; desc: string }[] = [
  { id: 'vibrant', label: 'Vibrant & Bersih', desc: 'Saturasi tinggi, kontras tajam tanpa bayangan kotor' },
  { id: 'neon', label: 'Cyber Neon Glow', desc: 'Aksen cyan, magenta, dan pendaran cahaya futuristik' },
  { id: 'warm', label: 'Warm Royal', desc: 'Grading hangat bernuansa emas, jingga, dan merah delima' },
  { id: 'cool', label: 'Cool Crystal', desc: 'Grading dingin bernuansa biru es, perak, dan aqua' },
  { id: 'pastel', label: 'Soft Pastel', desc: 'Warna lembut ala game cozy indie fantasy' }
];

const ANIMATION_OPTIONS: { id: AnimationType; label: string; icon: string }[] = [
  { id: 'walk', label: 'Jalan (Walk)', icon: '🚶' },
  { id: 'attack', label: 'Serang (Attack)', icon: '⚔️' },
  { id: 'hurt', label: 'Terluka (Hurt)', icon: '💥' },
  { id: 'idle', label: 'Idle Napas (Idle)', icon: '💨' }
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
  const addTag = (tag: string) => {
    const cleanTag = tag.replace(/^\+\s*/, '');
    if (prompt.trim()) {
      setPrompt(`${prompt.trim()}, ${cleanTag}`);
    } else {
      setPrompt(cleanTag);
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
    <div className="flex flex-col gap-5 p-5 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      {/* Title & Active Engine Status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Generator Pixel Art</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deskripsikan karakter bebas tanpa batasan kelas/arktipe
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-md border border-slate-700/60 transition-colors"
          title="Pengaturan AI Engine (Gemini / Ollama / MCP / OmniRoute)"
        >
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate max-w-[100px]">{activeProvider.name}</span>
        </button>
      </div>

      {/* Main Prompt Textarea */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Deskripsi Visual Karakter (Prompt)
          </label>
          <span className="text-[10px] text-slate-500">
            AI membuat sesuai teks yang diinput
          </span>
        </div>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: Kesatria wanita berzirah perak dengan jubah biru tua, pedang tipis kristal, dan tiara permata..."
          className="w-full px-3.5 py-2.5 text-sm bg-[#0b0f17] border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 rounded-lg text-slate-100 placeholder-slate-500 resize-none transition-colors"
        />

        {/* Quick Tag Pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PROMPT_SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addTag(tag)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700/40"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Animation Trigger Section (Static vs Animation logic) */}
      <div className="p-3 bg-[#0b0f17] rounded-lg border border-slate-800">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>Permintaan Animasi (Opsional)</span>
          </label>
          <span className="text-[10px] text-emerald-400 font-mono">
            {requestedAnimations.length === 0 ? 'Mode Statis (Tanpa Gerak)' : `${requestedAnimations.length} Animasi Dipilih`}
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
          Jika tidak memilih animasi atau tidak menulis &quot;animasi/jalan/serang&quot; di prompt, AI <span className="text-slate-200 font-medium">hanya akan membuat karakter tunggal</span>.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {ANIMATION_OPTIONS.map((opt) => {
            const isSelected = requestedAnimations.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleAnimation(opt.id)}
                className={`py-1.5 px-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-all border ${
                  isSelected
                    ? 'bg-emerald-600/20 border-emerald-500/80 text-emerald-300 font-semibold shadow-sm'
                    : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>{opt.icon}</span>
                <span className="text-[11px]">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Resolution Selector (32x32, 64x64, 128x128) */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Ukuran Resolusi Sprite
        </label>
        <div className="grid grid-cols-3 gap-2 p-1 bg-[#0b0f17] rounded-lg border border-slate-800">
          {([32, 64, 128] as SpriteResolution[]).map((res) => (
            <button
              key={res}
              type="button"
              onClick={() => setResolution(res)}
              className={`py-2 text-xs font-semibold rounded-md transition-all flex flex-col items-center gap-0.5 ${
                resolution === res
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <span>{res} × {res}</span>
              <span className="text-[10px] font-normal opacity-75">
                {res === 32 ? 'Retro 16-bit' : res === 64 ? 'HD Standard' : 'Detail Tinggi'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Grading & Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Color Grading Style */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span>Color Grading</span>
          </label>
          <select
            value={colorGrading}
            onChange={(e) => setColorGrading(e.target.value as ColorGradingMode)}
            className="w-full px-3 py-2 text-xs bg-[#0b0f17] border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {COLOR_GRADING_OPTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {COLOR_GRADING_OPTIONS.find((c) => c.id === colorGrading)?.desc}
          </span>
        </div>

        {/* Direction Orientation */}
        <div>
          <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Orientasi Sudut</span>
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as CharacterDirection)}
            className="w-full px-3 py-2 text-xs bg-[#0b0f17] border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="front">Tampak Depan (Front View)</option>
            <option value="side">Tampak Samping (Side Profile)</option>
            <option value="isometric">Isometrik (3/4 View)</option>
          </select>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Karakter bersih tanpa bayangan tanah di bawahnya
          </span>
        </div>
      </div>

      {/* Palette Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Palet Warna Terindeks
        </label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
          {Object.values(PALETTES).map((pal) => (
            <button
              key={pal.id}
              type="button"
              onClick={() => setPaletteKey(pal.id)}
              className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                paletteKey === pal.id
                  ? 'border-indigo-500 bg-indigo-950/20 text-white'
                  : 'border-slate-800 bg-[#0b0f17] text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="truncate">
                <span className="font-semibold block truncate text-slate-200">{pal.name}</span>
                <span className="text-[10px] text-slate-500 block truncate">{pal.description}</span>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {pal.colors.slice(0, 7).map((color, idx) => (
                  <span
                    key={idx}
                    className="w-2.5 h-4 rounded-xs border border-black/40"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Auto-Refinement Toggle */}
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
          <input
            type="checkbox"
            checked={autoRefine}
            onChange={(e) => setAutoRefine(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0 focus:ring-offset-0"
          />
          <span>AI Auto-Refinement (Pembersihan Kontur & Specular)</span>
        </label>
      </div>

      {/* Primary Submit Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
          isGenerating
            ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
            : !prompt.trim()
            ? 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white shadow-indigo-600/30'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            <span>Memproses Karakter ({resolution}×{resolution})...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>
              {requestedAnimations.length > 0
                ? `Buat Karakter + ${requestedAnimations.length} Animasi`
                : 'Buat Karakter Pixel Art'}
            </span>
          </>
        )}
      </button>
    </div>
  );
};
