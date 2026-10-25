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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-2xl bg-[#1c1917] border-2 border-[#44403c] shadow-[6px_6px_0_#000] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b-2 border-[#44403c] bg-[#292524]">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#ea580c]" />
            <div>
              <h2 className="font-pixel text-sm font-bold text-[#e7e5e4] uppercase tracking-wide">
                Konfigurasi Engine Penempa
              </h2>
              <p className="text-[11px] font-body text-[#a8a29e]">
                Pilih sumber penalaran visual karakter (Cloud, Local Ollama, atau MCP)
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
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Provider Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {[
              { id: 'gemini' as const, label: 'Gemini' },
              { id: 'ollama' as const, label: 'Ollama' },
              { id: 'omniroute' as const, label: 'OmniRoute' },
              { id: 'mcp' as const, label: 'MCP' },
              { id: 'custom' as const, label: 'Custom' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectType(p.id)}
                className={`py-2 px-1 text-center font-pixel text-xs border-2 transition-all ${
                  selectedType === p.id
                    ? 'bg-[#ea580c] text-[#1c1917] border-[#000] font-bold shadow-[2px_2px_0_#000]'
                    : 'bg-[#292524] text-[#a8a29e] border-[#44403c] hover:text-[#e7e5e4]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Provider Description */}
          <div className="p-3 bg-[#292524] border border-[#44403c]">
            <span className="font-pixel text-xs font-bold text-[#fbbf24] block mb-0.5">
              {config.name}
            </span>
            <p className="text-xs font-body text-[#a8a29e]">
              {config.description}
            </p>
          </div>

          {/* Form Settings */}
          <div className="space-y-3 font-body text-xs">
            {config.type !== 'gemini' && (
              <div>
                <label className="font-pixel text-[#e7e5e4] block mb-1">
                  Base URL / Endpoint Host:
                </label>
                <input
                  type="text"
                  value={config.baseUrl || ''}
                  onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                  className="w-full p-2 forge-input font-tech text-xs"
                />
              </div>
            )}

            <div>
              <label className="font-pixel text-[#e7e5e4] block mb-1">
                Nama Model:
              </label>
              <input
                type="text"
                value={config.model || ''}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full p-2 forge-input font-tech text-xs"
              />
            </div>

            {(config.type === 'omniroute' || config.type === 'custom') && (
              <div>
                <label className="font-pixel text-[#e7e5e4] block mb-1">
                  API Key:
                </label>
                <input
                  type="password"
                  value={config.apiKey || ''}
                  onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                  className="w-full p-2 forge-input font-tech text-xs"
                />
              </div>
            )}
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-2 border-t border-[#44403c] space-y-2" ref={testBoxRef}>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="forge-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 font-pixel"
            >
              <Activity className="w-3.5 h-3.5 text-[#fbbf24]" />
              <span>{isTesting ? 'Menguji Sambungan...' : 'Uji Koneksi Endpoint'}</span>
            </button>

            {testResult && (
              <div
                className={`p-2.5 border-2 text-xs ${
                  testResult.success
                    ? 'bg-[#141211] border-[#fbbf24] text-[#fbbf24]'
                    : 'bg-[#141211] border-[#b91c1c] text-[#e7e5e4]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-pixel font-bold">
                  {testResult.success ? <Check className="w-4 h-4 text-[#fbbf24]" /> : <AlertCircle className="w-4 h-4 text-[#b91c1c]" />}
                  <span>{testResult.message} ({testResult.latencyMs}ms)</span>
                </div>
                {testResult.hint && (
                  <p className="mt-1 text-[11px] font-tech text-[#a8a29e]">
                    Petunjuk: {testResult.hint}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-3 bg-[#292524] border-t-2 border-[#44403c]">
          <button
            onClick={onClose}
            className="forge-btn-secondary px-3 py-1.5 text-xs font-pixel"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className="forge-btn-primary px-4 py-1.5 text-xs font-pixel"
          >
            Simpan Konfigurasi
          </button>
        </div>
      </div>
    </div>
  );
};
