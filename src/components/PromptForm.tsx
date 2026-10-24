import React from 'react';
import {
  CharacterArchetype,
  CharacterDirection,
  SpriteResolution,
  AIProviderConfig
} from '../types/sprite';
import { PALETTES } from '../utils/pixelEngine';
import { Sparkles, Sliders, Settings, Check, Zap } from 'lucide-react';

interface PromptFormProps {
  prompt: string;
  setPrompt: (val: string) => void;
  resolution: SpriteResolution;
  setResolution: (val: SpriteResolution) => void;
  archetype: CharacterArchetype;
  setArchetype: (val: CharacterArchetype) => void;
  direction: CharacterDirection;
  setDirection: (val: CharacterDirection) => void;
  paletteKey: string;
  setPaletteKey: (val: string) => void;
  autoRefine: boolean;
  setAutoRefine: (val: boolean) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  activeProvider: AIProviderConfig;
  onOpenSettings: () => void;
}

const PROMPT_SUGGESTIONS = [
  '+ Armor Perak Bersinar',
  '+ Pedang Kristal Cyan',
  '+ Jubah Merah Panjang',
  '+ Visor Cyberpunk Neon',
  '+ Sayap Hitam Gagak',
  '+ Tameng Emas Paladin',
  '+ Aura Api Merah'
];

const ARCHETYPES: { id: CharacterArchetype; label: string }[] = [
  { id: 'knight', label: 'Kesatria' },
  { id: 'mage', label: 'Penyihir' },
  { id: 'cyberpunk', label: 'Cyberpunk' },
  { id: 'rogue', label: 'Ninja/Rogue' },
  { id: 'mecha', label: 'Mecha Robot' },
  { id: 'archer', label: 'Pemanah' },
  { id: 'paladin', label: 'Paladin' },
  { id: 'monster', label: 'Monster/Orc' }
];

export const PromptForm: React.FC<PromptFormProps> = ({
  prompt,
  setPrompt,
  resolution,
  setResolution,
  archetype,
  setArchetype,
  direction,
  setDirection,
  paletteKey,
  setPaletteKey,
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

  return (
    <div className="flex flex-col gap-5 p-5 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      {/* Title & Active Engine status */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Generator Parameter
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ketik deskripsi visual karakter untuk sintesis otomatis
          </p>
        </div>
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 rounded-md border border-slate-700/60 transition-colors"
          title="Ganti AI Provider (Ollama / MCP / OmniRoute / Gemini)"
        >
          <Settings className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate max-w-[100px]">{activeProvider.name}</span>
        </button>
      </div>

      {/* Main Prompt Textarea */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Deskripsi Visual Karakter (Prompt)
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Contoh: Kesatria masa depan berzirah obsidian hitam dengan pedang energi plasma biru, helm bertanduk, dan jubah perak melayang..."
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
                {res === 32 ? 'Retro 8/16-bit' : res === 64 ? 'Standard HD' : 'Ultra Detail'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Archetype & Direction Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Archetype Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Kelas / Arketipe
          </label>
          <select
            value={archetype}
            onChange={(e) => setArchetype(e.target.value as CharacterArchetype)}
            className="w-full px-3 py-2 text-xs bg-[#0b0f17] border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            {ARCHETYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {/* Direction Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Orientasi Sudut
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as CharacterDirection)}
            className="w-full px-3 py-2 text-xs bg-[#0b0f17] border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="front">Tampak Depan (Front)</option>
            <option value="side">Tampak Samping (Side Profile)</option>
            <option value="isometric">Isometrik (3/4 View)</option>
          </select>
        </div>
      </div>

      {/* Palette Selector */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
          Palet Warna Retro Terindeks
        </label>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
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
          <span>AI Auto-Refinement (Pembersihan & Specular)</span>
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
            <span>Memproses Sprite ({resolution}×{resolution})...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Sintesis Karakter Pixel Art</span>
          </>
        )}
      </button>
    </div>
  );
};
