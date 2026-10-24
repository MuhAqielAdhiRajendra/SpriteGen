import React from 'react';
import { BookOpen, X, Terminal, Cpu, Check, ExternalLink } from 'lucide-react';

interface DocsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#121826] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0f1523]">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Panduan Integrasi AI (Ollama, MCP & OmniRoute)
              </h2>
              <p className="text-xs text-slate-400">
                Cara menghubungkan model LLM lokal atau protokol kustom ke PixelForge
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Section 1: Ollama Local LLM */}
          <div className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Terminal className="w-4 h-4" />
              <span>1. Menjalankan Local LLM dengan Ollama</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Ollama memungkinkan Anda menjalankan model bahasa berukuran 1B hingga 70B langsung di GPU/CPU komputer Anda tanpa biaya API eksternal.
            </p>
            <div className="p-3 bg-black/60 rounded-md font-mono text-[11px] text-emerald-400 space-y-1">
              <div># 1. Unduh model pilihan di terminal:</div>
              <div className="text-white">ollama run llama3</div>
              <div className="text-slate-500"># Atau model coding seperti: ollama run qwen2.5-coder</div>
              <div className="pt-1"># 2. Aktifkan Ollama dengan izin CORS untuk web studio:</div>
              <div className="text-white">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</div>
            </div>
            <p className="text-slate-400 text-[11px]">
              Setelah itu, buka menu <strong>AI Engine</strong> di navigasi atas, pilih <strong>Ollama Local LLM</strong>, dan tekan <strong>Uji Koneksi</strong>.
            </p>
          </div>

          {/* Section 2: MCP (Model Context Protocol) */}
          <div className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <Cpu className="w-4 h-4" />
              <span>2. Menghubungkan MCP (Model Context Protocol)</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              PixelForge mendukung standar MCP via HTTP JSON-RPC 2.0. Server MCP Anda mengekspos endpoint tool call:
            </p>
            <div className="p-3 bg-black/60 rounded-md font-mono text-[11px] text-sky-400">
              POST http://localhost:8000/mcp<br />
              &#123; &quot;method&quot;: &quot;tools/call&quot;, &quot;params&quot;: &#123; &quot;name&quot;: &quot;pixel_craft_v1&quot; &#125; &#125;
            </div>
            <p className="text-slate-400 text-[11px]">
              Setiap panggilan AI akan dialihkan melalui protokol tool calling MCP untuk orkestrasi agentik multi-langkah.
            </p>
          </div>

          {/* Section 3: OmniRoute & Custom Endpoints */}
          <div className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
              <ExternalLink className="w-4 h-4" />
              <span>3. OmniRoute, OpenRouter & LM Studio</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Gunakan endpoint yang kompatibel dengan format OpenAI API (seperti LM Studio di <code className="text-white">http://localhost:1234/v1</code> atau OpenRouter/OmniRoute). Cukup masukkan Base URL dan API Key Anda di panel pengaturan.
            </p>
          </div>

          {/* Section 4: Tips Prompt Pixel Art */}
          <div className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-2">
            <span className="font-semibold text-slate-200 block text-xs">
              Tips Menulis Prompt Karakter yang Bagus:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
              <li>Sebutkan warna spesifik (contoh: <em>armor perak, jubah merah tua, mata cyan menyala</em>).</li>
              <li>Sebutkan senjata atau aksesoris di tangan (<em>pedang plasma, perisai salib, tongkat kristal</em>).</li>
              <li>Pilih resolusi <strong>32x32</strong> untuk gaya retro 8/16-bit klasik, atau <strong>64x64/128x128</strong> untuk game modern dengan siluet lebih detail.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-800 bg-[#0f1523]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Mengerti & Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
