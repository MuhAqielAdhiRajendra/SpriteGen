import React from 'react';
import { Cpu, Sparkles, FolderArchive, BookOpen, Layers } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenPresets: () => void;
  onOpenDocs: () => void;
  onNewSprite: () => void;
  providerName: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSettings,
  onOpenPresets,
  onOpenDocs,
  onNewSprite,
  providerName
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-[#0f1523]/90 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white font-mono font-bold text-base">
          PX
        </div>
        <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
          PixelForge <span className="text-indigo-400 font-medium text-sm">Studio</span>
        </span>
      </div>

      {/* Zone 2: Clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 text-slate-300"
        >
          <FolderArchive className="w-4 h-4 text-indigo-400" />
          <span>Preset Galeri</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 text-slate-300"
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>AI Engine: <strong className="text-emerald-400 font-normal">{providerName}</strong></span>
        </button>

        <button
          onClick={onOpenDocs}
          className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0 text-slate-300"
        >
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>Panduan (Ollama & MCP)</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewSprite}
          className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 active:scale-[0.98] transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Karakter Baru</span>
        </button>
      </div>
    </header>
  );
};
