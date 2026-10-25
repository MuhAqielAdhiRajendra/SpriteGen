import React from 'react';
import { BookOpen, X, Terminal, Cpu } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-2xl bg-[#1c1917] border-2 border-[#44403c] shadow-[6px_6px_0_#000] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b-2 border-[#44403c] bg-[#292524]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[#fbbf24]" />
            <div>
              <h2 className="font-pixel text-sm font-bold text-[#e7e5e4] uppercase tracking-wide">
                Buku Panduan Penempaan
              </h2>
              <p className="text-[11px] font-body text-[#a8a29e]">
                Petunjuk menghubungkan model lokal (Ollama), MCP, atau endpoint mandiri
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

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs font-body text-[#e7e5e4]">
          {/* Section 1: Ollama Local */}
          <div className="p-3 bg-[#292524] border-2 border-[#44403c] space-y-2">
            <div className="flex items-center gap-2 text-[#fbbf24] font-pixel text-xs font-bold">
              <Terminal className="w-4 h-4" />
              <span>1. Menjalankan Model Lokal dengan Ollama</span>
            </div>
            <p className="text-[#a8a29e] leading-relaxed">
              Ollama memungkinkan Anda menjalankan model di mesin komputer Anda sendiri tanpa biaya API eksternal.
            </p>
            <div className="p-2.5 bg-[#141211] border border-[#000] font-tech text-[11px] text-[#fbbf24] space-y-1">
              <div className="text-[#a8a29e]"># 1. Jalankan model di terminal:</div>
              <div className="text-[#e7e5e4]">ollama run llama3</div>
              <div className="text-[#a8a29e] pt-1"># 2. Aktifkan Ollama dengan izin CORS:</div>
              <div className="text-[#e7e5e4]">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</div>
            </div>
            <p className="text-[#a8a29e] text-[11px]">
              Buka menu <strong>Engine</strong> di atas, pilih <strong>Ollama Local</strong>, lalu uji sambungan.
            </p>
          </div>

          {/* Section 2: MCP */}
          <div className="p-3 bg-[#292524] border-2 border-[#44403c] space-y-2">
            <div className="flex items-center gap-2 text-[#ea580c] font-pixel text-xs font-bold">
              <Cpu className="w-4 h-4" />
              <span>2. Integrasi Model Context Protocol (MCP)</span>
            </div>
            <p className="text-[#a8a29e] leading-relaxed">
              Standar integrasi agen untuk komunikasi terstruktur antara editor dan runtime LLM via JSON-RPC.
            </p>
            <div className="p-2.5 bg-[#141211] border border-[#000] font-tech text-[11px] text-[#ea580c] space-y-1">
              <div className="text-[#a8a29e]"># Jalankan server daemon MCP pada port 8000:</div>
              <div className="text-[#e7e5e4]">python -m mcp_server_pixelforge --port 8000</div>
            </div>
          </div>

          {/* Section 3: Shortcut Keys */}
          <div className="p-3 bg-[#292524] border-2 border-[#44403c] space-y-2">
            <span className="font-pixel text-xs font-bold text-[#fbbf24] block">
              Pintasan Keyboard (Shortcuts):
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-tech">
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Pena / Pensil</span>
                <span className="text-[#fbbf24] font-bold">[B]</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Penghapus</span>
                <span className="text-[#fbbf24] font-bold">[E]</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Ember / Fill</span>
                <span className="text-[#fbbf24] font-bold">[G]</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Pipet Warna</span>
                <span className="text-[#fbbf24] font-bold">[I]</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Putar / Jeda</span>
                <span className="text-[#fbbf24] font-bold">[SPACE]</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-[#141211] border border-[#44403c]">
                <span className="text-[#a8a29e]">Undo / Redo</span>
                <span className="text-[#fbbf24] font-bold">[Ctrl+Z / Y]</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#292524] border-t-2 border-[#44403c] flex justify-end">
          <button
            onClick={onClose}
            className="forge-btn-primary px-4 py-1.5 text-xs font-pixel"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
