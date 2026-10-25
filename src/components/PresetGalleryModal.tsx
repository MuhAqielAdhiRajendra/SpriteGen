import React from 'react';
import { CharacterSprite, SpriteResolution, ColorGradingMode } from '../types/sprite';
import { Sparkles, X, Clock, ArrowRight, FolderArchive } from 'lucide-react';

interface PresetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: {
    prompt: string;
    resolution: SpriteResolution;
    paletteKey: string;
    colorGrading?: ColorGradingMode;
    direction: any;
  }) => void;
  historyList: CharacterSprite[];
  onRestoreHistory: (sprite: CharacterSprite) => void;
}

const PRESET_CHARACTERS = [
  {
    name: 'Paladin Cahaya Bersinar',
    prompt: 'Kesatria suci dengan armor perak tebal, perisai emas berlambang salib matahari, jubah putih bersih bertepi emas, dan helm pelindung bertanduk halus',
    resolution: 32 as SpriteResolution,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'warm' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'RPG Classic'
  },
  {
    name: 'Cyberpunk Neon Ronin',
    prompt: 'Pendekar cyberpunk berjaket hitam kerah tinggi neon cyan menyala, visor optik augmented reality biru, dan pedang katana plasma',
    resolution: 64 as SpriteResolution,
    paletteKey: 'cyber_glow',
    colorGrading: 'neon' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Sci-Fi'
  },
  {
    name: 'Penyihir Kristal Astral',
    prompt: 'Penyihir berjubah ungu terang dengan tudung bertepi perak, memegang tongkat sihir dengan batu kristal melayang bercahaya di pucuknya',
    resolution: 64 as SpriteResolution,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'cool' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Fantasy'
  },
  {
    name: 'Robot Tempur Mecha Vanguard',
    prompt: 'Robot mecha bersendi hidrolik dengan plat zirah dada tebal, sensor optik mata ganda menyala kuning, dan meriam bahu terpasang',
    resolution: 64 as SpriteResolution,
    paletteKey: 'cyber_glow',
    colorGrading: 'neon' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Mecha'
  },
  {
    name: 'Pemanah Hutan Sylph',
    prompt: 'Pemanah pengembara dengan tudung hijau lumut, busur kayu panjang melengkung anggun, tempat anak panah di punggung, dan jubah tipis',
    resolution: 32 as SpriteResolution,
    paletteKey: 'pastel',
    colorGrading: 'pastel' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Fantasy'
  },
  {
    name: 'Pendekar Pedang Bayangan',
    prompt: 'Pendekar bayangan bertopeng kain hitam dengan sepasang belati baja bergerigi di kedua tangan, jubah pendek, dan ikat pinggang perlengkapan',
    resolution: 32 as SpriteResolution,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'vibrant' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Stealth'
  }
];

export const PresetGalleryModal: React.FC<PresetGalleryModalProps> = ({
  isOpen,
  onClose,
  onSelectPreset,
  historyList,
  onRestoreHistory
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[#121826] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0f1523]">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Preset Karakter & Riwayat Sesi
              </h2>
              <p className="text-xs text-slate-400">
                Pilih inspirasi visual karakter bebas atau muat kembali karakter sesi ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-6">
          {/* Preset Cards Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
              Koleksi Template Karakter Siap Pakai:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {PRESET_CHARACTERS.map((preset, i) => (
                <div
                  key={i}
                  className="p-3.5 rounded-lg bg-[#0b0f17] border border-slate-800 hover:border-indigo-500/60 transition-all flex flex-col justify-between gap-3 group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-xs text-slate-200 group-hover:text-indigo-300 transition-colors">
                        {preset.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {preset.resolution}×{preset.resolution}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="w-full py-1.5 px-2 text-xs font-semibold rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Gunakan Preset</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User History in this session */}
          {historyList.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Riwayat Karakter Sesi Ini ({historyList.length}):
                </h3>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-semibold text-slate-200 block truncate">
                        {item.name}
                      </span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {item.prompt}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {item.resolution}×{item.resolution} px · Skor: {item.aiEvaluation?.adherenceScore}% · {item.isAnimated ? 'Ada Animasi' : 'Karakter Statis'}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onRestoreHistory(item);
                        onClose();
                      }}
                      className="px-3 py-1 text-xs font-semibold rounded bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      Buka Kembali
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
