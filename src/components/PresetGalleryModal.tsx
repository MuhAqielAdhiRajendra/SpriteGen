import React from 'react';
import { CharacterSprite, SpriteResolution, ColorGradingMode } from '../types/sprite';
import { FolderArchive, X, ArrowRight, Clock, Hammer } from 'lucide-react';

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
    name: 'Petualang Pedang Jingga (Hero 3x4)',
    prompt: 'Seorang pemuda petualang rambut oranye spiky, kemeja hijau di balik tunik kulit cokelat bertali sabuk perak, syal merah menyala di leher, celana biru, sepatu boot cokelat, memegang pedang perak mengkilap',
    resolution: 32 as SpriteResolution,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'vibrant' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'Hero 3x4'
  },
  {
    name: 'Paladin Cahaya Bersinar',
    prompt: 'Kesatria suci dengan armor perak tebal, perisai emas berlambang salib matahari, jubah putih bersih bertepi emas, dan helm pelindung bertanduk halus',
    resolution: 32 as SpriteResolution,
    paletteKey: 'vibrant_rpg',
    colorGrading: 'warm' as ColorGradingMode,
    direction: 'front' as const,
    tag: 'RPG Klasik'
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
    tag: 'Sihir'
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
    tag: 'Fantasi'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-3xl bg-[#1c1917] border-2 border-[#44403c] shadow-[6px_6px_0_#000] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b-2 border-[#44403c] bg-[#292524]">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-[#ea580c]" />
            <div>
              <h2 className="font-pixel text-sm font-bold text-[#e7e5e4] uppercase tracking-wide">
                Buku Resep & Riwayat Tempa
              </h2>
              <p className="text-[11px] font-body text-[#a8a29e]">
                Pilih inspirasi pola karakter siap tempa atau muat kembali hasil sesi ini
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#a8a29e] hover:text-[#e7e5e4] border border-[#44403c] hover:bg-[#44403c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-5">
          {/* Preset Cards Grid */}
          <div>
            <h3 className="font-pixel text-xs font-bold text-[#fbbf24] uppercase tracking-wider mb-2.5">
              Koleksi Resep Karakter:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PRESET_CHARACTERS.map((preset, i) => (
                <div
                  key={i}
                  className="p-3 bg-[#292524] border-2 border-[#44403c] hover:border-[#fbbf24] transition-colors flex flex-col justify-between gap-2.5"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-pixel font-bold text-xs text-[#e7e5e4] truncate">
                        {preset.name}
                      </span>
                      <span className="text-[9px] font-tech px-1 py-0.5 bg-[#141211] text-[#fbbf24] border border-[#44403c] shrink-0">
                        {preset.resolution}px
                      </span>
                    </div>
                    <p className="text-[11px] font-body text-[#a8a29e] line-clamp-3 leading-relaxed">
                      {preset.prompt}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onSelectPreset(preset);
                      onClose();
                    }}
                    className="w-full forge-btn-secondary py-1 text-xs flex items-center justify-center gap-1 font-pixel"
                  >
                    <span>Pakai Resep</span>
                    <ArrowRight className="w-3 h-3 text-[#ea580c]" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* User History in this session */}
          {historyList.length > 0 && (
            <div className="pt-3 border-t-2 border-[#44403c]">
              <h3 className="font-pixel text-xs font-bold text-[#e7e5e4] uppercase tracking-wider mb-2">
                Riwayat Sesi Penempaan ({historyList.length} Karakter):
              </h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {historyList.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-2 bg-[#141211] border border-[#44403c] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-pixel font-bold text-[#fbbf24] mr-2">
                        {hist.name}
                      </span>
                      <span className="text-[#a8a29e] font-tech text-[10px]">
                        [{hist.resolution}×{hist.resolution} PX · {hist.frames.length} CEL]
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onRestoreHistory(hist);
                        onClose();
                      }}
                      className="forge-btn-secondary px-2 py-0.5 text-[11px] font-pixel shrink-0 text-[#ea580c]"
                    >
                      Buka ke Kanvas
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
