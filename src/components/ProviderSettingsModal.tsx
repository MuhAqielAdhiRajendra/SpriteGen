import React, { useState } from 'react';
import { AIProviderConfig, AIProviderType } from '../types/sprite';
import { Cpu, X, Check, Activity, AlertCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface ProviderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: AIProviderConfig;
  onSaveProvider: (config: AIProviderConfig) => void;
}

const DEFAULT_PROVIDERS: Record<AIProviderType, AIProviderConfig> = {
  gemini: {
    id: 'gemini-default',
    type: 'gemini',
    name: 'Google Gemini 3.1 Flash Lite',
    description: 'Model cloud built-in berkecepatan tinggi untuk penalaran visual pixel art',
    baseUrl: '/api/gemini',
    model: 'gemini-3.1-flash-lite',
    temperature: 0.3
  },
  ollama: {
    id: 'ollama-local',
    type: 'ollama',
    name: 'Ollama Local LLM',
    description: 'Jalankan model lokal di komputer Anda sendiri tanpa kuota atau internet eksternal',
    baseUrl: 'http://localhost:11434',
    model: 'llama3',
    temperature: 0.2
  },
  omniroute: {
    id: 'omniroute-api',
    type: 'omniroute',
    name: 'OmniRoute / OpenRouter',
    description: 'Routing universal ke ratusan model LLM melalui satu API OpenAI-compatible',
    baseUrl: 'https://api.openrouter.ai/v1',
    apiKey: '',
    model: 'deepseek/deepseek-chat',
    temperature: 0.3
  },
  mcp: {
    id: 'mcp-bridge',
    type: 'mcp',
    name: 'Model Context Protocol (MCP)',
    description: 'Integrasi standar Anthropic MCP untuk tool calling agentik langsung',
    baseUrl: 'http://localhost:8000/mcp',
    mcpToolName: 'pixel_craft_v1',
    model: 'mcp-agent',
    temperature: 0.2
  },
  custom: {
    id: 'custom-endpoint',
    type: 'custom',
    name: 'Custom OpenAI-Compatible Proxy',
    description: 'LM Studio, vLLM, LocalAI, TextGen WebUI, atau endpoint proxy internal kantor',
    baseUrl: 'http://localhost:1234/v1',
    apiKey: '',
    model: 'default',
    temperature: 0.3
  }
};

export const ProviderSettingsModal: React.FC<ProviderSettingsModalProps> = ({
  isOpen,
  onClose,
  activeProvider,
  onSaveProvider
}) => {
  const [selectedType, setSelectedType] = useState<AIProviderType>(activeProvider.type);
  const [config, setConfig] = useState<AIProviderConfig>({ ...activeProvider });
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    latencyMs: number;
    message: string;
    details?: any;
    hint?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSelectType = (type: AIProviderType) => {
    setSelectedType(type);
    const defaults = DEFAULT_PROVIDERS[type];
    setConfig({
      ...defaults,
      ...((activeProvider.type === type ? activeProvider : {}) as any)
    });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const resp = await fetch('/api/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: config.type,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model
        })
      });

      const data = await resp.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        latencyMs: 0,
        message: err.message || 'Gagal menghubungi endpoint pengujian.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const testBoxRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (testResult && testBoxRef.current) {
      testBoxRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [testResult]);

  const handleSave = () => {
    onSaveProvider(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#121826] border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0f1523]">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Konfigurasi AI Provider (BYO-AI & Local LLM)
              </h2>
              <p className="text-xs text-slate-400">
                Gunakan Ollama lokal, MCP Bridge, OmniRoute, atau model cloud pilihan Anda
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

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Pilih Sumber Model AI:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(DEFAULT_PROVIDERS) as AIProviderType[]).map((type) => {
                const item = DEFAULT_PROVIDERS[type];
                const isSelected = selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSelectType(type)}
                    className={`p-2.5 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                        : 'bg-[#0b0f17] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-xs block truncate text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {type === 'ollama' ? 'Local PC' : type === 'mcp' ? 'Protocol' : type === 'gemini' ? 'Cloud Built-in' : 'API Route'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Fields for Active Provider */}
          <div className="p-4 rounded-lg bg-[#0b0f17] border border-slate-800 space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Tampilan Provider
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Base URL / Endpoint Host
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                placeholder="http://localhost:11434 atau https://api.openrouter.ai/v1"
                className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
              />
              {selectedType === 'ollama' && (
                <p className="text-[11px] text-emerald-400 mt-1.5 flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Jalankan Ollama di terminal dengan: <code className="bg-black/60 px-1 py-0.5 rounded text-[10px]">OLLAMA_ORIGINS=&quot;*&quot; ollama serve</code></span>
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama Model
                </label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => setConfig({ ...config, model: e.target.value })}
                  placeholder={selectedType === 'ollama' ? 'llama3, mistral, llava' : 'model ID'}
                  className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={config.temperature}
                  onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) || 0.2 })}
                  className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {(selectedType === 'omniroute' || selectedType === 'custom') && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  API Key / Token Otentikasi
                </label>
                <input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  API Key disimpan secara aman di browser client dan hanya diteruskan saat memanggil AI.
                </span>
              </div>
            )}

            {selectedType === 'mcp' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nama MCP Tool
                </label>
                <input
                  type="text"
                  value={config.mcpToolName || ''}
                  onChange={(e) => setConfig({ ...config, mcpToolName: e.target.value })}
                  placeholder="pixel_craft_v1"
                  className="w-full px-3 py-2 text-xs bg-[#121826] border border-slate-700 rounded-lg text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Connection Test Box */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0b0f17] border border-slate-800">
            <div className="text-xs">
              <span className="font-semibold text-slate-300 block">
                Verifikasi Koneksi AI
              </span>
              <span className="text-[11px] text-slate-500">
                Lakukan ping latensi untuk memastikan model aktif dan siap menerima prompt
              </span>
            </div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {isTesting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Menguji...</span>
                </>
              ) : (
                <>
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Uji Koneksi</span>
                </>
              )}
            </button>
          </div>

          {/* Test Result Message */}
          {testResult && (
            <div
              ref={testBoxRef}
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <div className="font-semibold flex items-center gap-2">
                  <span>{testResult.message}</span>
                  {testResult.latencyMs > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/40">
                      {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                {testResult.hint && (
                  <p className="text-[11px] text-slate-300 font-normal">
                    {testResult.hint}
                  </p>
                )}
                {testResult.details?.models && (
                  <p className="text-[11px] text-slate-300 font-mono">
                    Model tersedia di Ollama: {testResult.details.models.join(', ') || 'Belum ada model yang di-pull'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 bg-[#0f1523]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Simpan & Gunakan Provider</span>
          </button>
        </div>
      </div>
    </div>
  );
};
