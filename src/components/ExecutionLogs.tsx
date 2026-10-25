import React, { useState } from 'react';
import { PipelineStep } from '../types/sprite';
import { Check, AlertTriangle, Terminal, ChevronDown, ChevronRight, Activity, Hammer } from 'lucide-react';

interface ExecutionLogsProps {
  logs: PipelineStep[];
  isGenerating: boolean;
}

export const ExecutionLogs: React.FC<ExecutionLogsProps> = ({ logs, isGenerating }) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [showRawTerminal, setShowRawTerminal] = useState<boolean>(false);

  const toggleExpand = (id: string) => {
    setExpandedStepId((prev) => (prev === id ? null : id));
  };

  const getPhaseBadge = (phase: PipelineStep['phase']) => {
    switch (phase) {
      case 'parse': return { label: 'SPESIFIKASI', bg: 'bg-[#292524] text-[#fbbf24] border-[#44403c]' };
      case 'palette': return { label: 'PALET RAMPA', bg: 'bg-[#292524] text-[#ea580c] border-[#44403c]' };
      case 'silhouette': return { label: 'KERANGKA CEL', bg: 'bg-[#292524] text-[#fbbf24] border-[#44403c]' };
      case 'shading': return { label: 'RASTERISASI', bg: 'bg-[#292524] text-[#e7e5e4] border-[#44403c]' };
      case 'review': return { label: 'UJI MUTU', bg: 'bg-[#292524] text-[#fbbf24] border-[#44403c]' };
      case 'refine': return { label: 'RAPATKAN', bg: 'bg-[#292524] text-[#ea580c] border-[#44403c]' };
      case 'export': return { label: 'SELESAI', bg: 'bg-[#292524] text-[#e7e5e4] border-[#44403c]' };
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000]">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#44403c]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-[#fbbf24]" />
          <h3 className="font-pixel text-xs font-bold text-[#e7e5e4] uppercase tracking-wider">
            Buku Catatan Penempaan
          </h3>
        </div>

        <button
          onClick={() => setShowRawTerminal(!showRawTerminal)}
          className="forge-btn-secondary px-2 py-0.5 text-[10px] flex items-center gap-1 font-tech"
        >
          <span>{showRawTerminal ? 'Mode Kartu' : 'Terminal Baku'}</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center bg-[#141211] border-2 border-[#44403c] text-[#a8a29e] text-xs flex flex-col items-center gap-3">
          <div className="font-pixel text-sm text-[#e7e5e4]">Landasan masih kosong.</div>
          <p className="text-[11px] font-body text-[#78716c]">
            Tekan &quot;Tempa Karakter&quot; untuk mencatat tahapan pembentukan pixel step-by-step.
          </p>
        </div>
      ) : showRawTerminal ? (
        /* Raw Terminal View */
        <div className="p-3 bg-[#141211] border-2 border-[#000] font-tech text-[11px] text-[#fbbf24] overflow-x-auto max-h-[440px] space-y-1 shadow-inner">
          <div className="text-[#78716c] pb-1 border-b border-[#44403c] text-[10px]">
            [FORGE_EXECUTION_LOG] status=active timestamp={new Date().toISOString()}
          </div>
          {logs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-[#a8a29e]">[{log.timestamp}]</span>{' '}
              <span className="text-[#ea580c] font-bold">[{log.phase.toUpperCase()}]</span>{' '}
              <span className={log.status === 'error' ? 'text-[#b91c1c] font-bold' : log.status === 'warning' ? 'text-[#fbbf24]' : 'text-[#e7e5e4]'}>
                {log.title}:
              </span>{' '}
              <span className="text-[#a8a29e]">{log.description}</span>{' '}
              {log.durationMs > 0 && <span className="text-[#78716c]">({log.durationMs}ms)</span>}
              {log.details && (
                <pre className="text-[10px] text-[#78716c] pl-3 mt-0.5 overflow-x-auto border-l-2 border-[#44403c]">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="text-[#ea580c] font-pixel pt-1">
              &gt; Palu pandai besi sedang mengayun pada landasan...
            </div>
          )}
        </div>
      ) : (
        /* Structured Forge Card View */
        <div className="flex flex-col gap-2 max-h-[440px] overflow-y-auto pr-1">
          {logs.map((log, index) => {
            const badge = getPhaseBadge(log.phase);
            const isExpanded = expandedStepId === log.id;
            const isError = log.status === 'error';

            return (
              <div
                key={log.id + index}
                className={`p-2.5 border-2 transition-colors ${
                  isError
                    ? 'bg-[#1c1917] border-[#b91c1c]'
                    : 'bg-[#141211] border-[#44403c] hover:border-[#a8a29e]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {/* Status Badge */}
                    <div className="mt-0.5 shrink-0">
                      {isError ? (
                        <AlertTriangle className="w-4 h-4 text-[#b91c1c]" />
                      ) : (
                        <div className="w-3.5 h-3.5 bg-[#ea580c] border border-[#000] flex items-center justify-center text-[#1c1917]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-pixel text-xs font-bold text-[#e7e5e4]">
                          {log.title}
                        </span>
                        <span className={`px-1 py-0.2 text-[9px] font-tech border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs font-body text-[#a8a29e] mt-0.5">
                        {isError ? 'Besinya retak. Coba tempa lagi.' : log.description}
                      </p>
                      {isError && (
                        <p className="text-[10px] font-tech text-[#b91c1c] mt-0.5">
                          {log.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-tech text-[10px] text-[#78716c]">
                    <span>{log.durationMs}ms</span>
                    {log.details && (
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="p-0.5 text-[#a8a29e] hover:text-[#e7e5e4]"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && log.details && (
                  <pre className="mt-2 p-2 bg-[#000] border border-[#44403c] text-[10px] font-tech text-[#fbbf24] overflow-x-auto max-h-36">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
