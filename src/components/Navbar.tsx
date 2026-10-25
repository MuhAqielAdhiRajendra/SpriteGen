import React from 'react';
import {
  FolderArchive,
  BookOpen,
  Cpu,
  Grid3X3,
  Hammer,
  PlusSquare,
  FileCode
} from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenPresets: () => void;
  onOpenDocs: () => void;
  onOpenSheetModal: () => void;
  onNewSprite: () => void;
  providerName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenPresets,
  onOpenDocs,
  onOpenSheetModal,
  onNewSprite,
  providerName
}) => {
  return (
    <header className="w-full bg-[#1c1917] border-b-2 border-[#44403c] px-3 sm:px-5 py-2.5 flex items-center justify-between gap-4 select-none sticky top-0 z-40">
      {/* Brand & Forge Anvil Wordmark */}
      <div className="flex items-center gap-3">
        {/* Pixel Anvil Icon */}
        <div className="w-8 h-8 bg-[#292524] border-2 border-[#000] shadow-[2px_2px_0_#000] flex items-center justify-center shrink-0">
          <svg
            className="w-5 h-5 text-[#ea580c]"
            viewBox="0 0 16 16"
            fill="currentColor"
            shapeRendering="crispEdges"
          >
            {/* 16x16 Pixel Anvil with Hammer */}
            <rect x="2" y="12" width="12" height="2" fill="#44403c" />
            <rect x="4" y="10" width="8" height="2" fill="#a8a29e" />
            <rect x="3" y="6" width="10" height="4" fill="#e7e5e4" />
            <rect x="1" y="6" width="3" height="2" fill="#ea580c" />
            <rect x="11" y="3" width="2" height="4" fill="#fbbf24" />
            <rect x="9" y="2" width="5" height="2" fill="#ea580c" />
          </svg>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-base sm:text-lg font-bold text-[#e7e5e4] tracking-wide leading-none">
              PIXEL<span className="text-[#ea580c]">FORGE</span>
            </span>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-pixel text-[#fbbf24] bg-[#292524] border border-[#44403c]">
              v2.5
            </span>
          </div>
          <span className="text-[10px] font-tech text-[#a8a29e] leading-tight">
            Bengkel Sprite 2D & Animasi Cel
          </span>
        </div>
      </div>

      {/* Navigation Buttons (Retro Chiseled Tabs) */}
      <nav className="flex items-center gap-2 sm:gap-3">
        {/* Sheet 3x4 Modal Button */}
        <button
          onClick={onOpenSheetModal}
          className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
          title="Buka Sprite Sheet 3x4 referensi"
        >
          <Grid3X3 className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span className="hidden md:inline">Sheet 3x4</span>
        </button>

        {/* Preset Gallery */}
        <button
          onClick={onOpenPresets}
          className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
          title="Galeri Preset Karakter"
        >
          <FolderArchive className="w-3.5 h-3.5 text-[#ea580c]" />
          <span className="hidden md:inline">Preset</span>
        </button>

        {/* Engine Config / Settings */}
        <button
          onClick={onOpenSettings}
          className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
          title="Konfigurasi Engine Penempa"
        >
          <Cpu className="w-3.5 h-3.5 text-[#a8a29e]" />
          <span className="hidden lg:inline text-[11px] font-tech text-[#a8a29e]">
            {providerName.split(' ')[0]}
          </span>
        </button>

        {/* Docs Button */}
        <button
          onClick={onOpenDocs}
          className="forge-btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5"
          title="Buku Panduan Penempaan"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#e7e5e4]" />
          <span className="hidden sm:inline">Panduan</span>
        </button>

        {/* New Character Button */}
        <button
          onClick={onNewSprite}
          className="forge-btn-primary px-3 py-1 text-xs flex items-center gap-1.5"
          title="Mulai kanvas karakter baru"
        >
          <PlusSquare className="w-3.5 h-3.5 text-[#1c1917]" />
          <span>Karakter Baru</span>
        </button>
      </nav>
    </header>
  );
};
