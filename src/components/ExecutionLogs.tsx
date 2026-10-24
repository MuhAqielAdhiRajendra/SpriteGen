import React, { useState } from 'react';
import { PipelineStep } from '../types/sprite';
import { CheckCircle2, Clock, AlertTriangle, Terminal, ChevronDown, ChevronRight, Activity } from 'lucide-react';

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
      case 'parse': return { label: 'Deconstruct', bg: 'bg-blue-950/60 text-blue-300 border-blue-800/60' };
      case 'palette': return { label: 'Quantize', bg: 'bg-purple-950/60 text-purple-300 border-purple-800/60' };
      case 'silhouette': return { label: 'Anatomy', bg: 'bg-amber-950/60 text-amber-300 border-amber-800/60' };
      case 'shading': return { label: 'Rasterize', bg: 'bg-sky-950/60 text-sky-300 border-sky-800/60' };
      case 'review': return { label: 'AI Review', bg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60' };
      case 'refine': return { label: 'Refine', bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' };
      case 'export': return { label: 'Assembly', bg: 'bg-rose-950/60 text-rose-300 border-rose-800/60' };
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header with real-time toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Dasbor Transparansi AI Real-Time
          </h3>
        </div>
        <button
          onClick={() => setShowRawTerminal(!showRawTerminal)}
          className={`px-2 py-1 text-[11px] font-mono rounded border transition-colors flex items-center gap-1 ${
            showRawTerminal
              ? 'bg-slate-800 text-indigo-300 border-indigo-500/50'
              : 'bg-[#0b0f17] text-slate-400 border-slate-800 hover:text-white'
          }`}
        >
          <Terminal className="w-3 h-3" />
          <span>{showRawTerminal ? 'Tampilan Terstruktur' : 'Terminal Trace Raw'}</span>
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="p-8 text-center bg-[#0b0f17] border border-slate-800/80 rounded-xl text-slate-500 text-xs">
          Belum ada aktivitas pengerjaan. Tekan tombol &quot;Sintesis Karakter&quot; untuk memulai logging transparan.
        </div>
      ) : showRawTerminal ? (
        /* Raw Terminal View */
        <div className="p-3.5 bg-[#070a10] border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-[460px] space-y-1.5 shadow-inner">
          <div className="text-slate-500 pb-1 border-b border-slate-800/80 text-[10px]">
            [AI_STUDIO_LOG_STREAM] active_agent=pixel_forge_v2.5 timestamp={new Date().toISOString()}
          </div>
          {logs.map((log, i) => (
            <div key={i} className="leading-relaxed">
              <span className="text-slate-500">[{log.timestamp}]</span>{' '}
              <span className="text-indigo-400 font-semibold">&lt;{log.phase.toUpperCase()}&gt;</span>{' '}
              <span className={log.status === 'error' ? 'text-rose-400' : log.status === 'warning' ? 'text-amber-400' : 'text-slate-200'}>
                {log.title}:
              </span>{' '}
              <span className="text-slate-400">{log.description}</span>{' '}
              {log.durationMs > 0 && <span className="text-slate-600">({log.durationMs}ms)</span>}
              {log.details && (
                <pre className="text-[10px] text-slate-500 pl-4 mt-0.5 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="text-indigo-400 animate-pulse pt-1">
              &gt; AI Engine sedang memproses frame matriks...
            </div>
          )}
        </div>
      ) : (
        /* Structured Timeline Card View */
        <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
          {logs.map((log, index) => {
            const badge = getPhaseBadge(log.phase);
            const isExpanded = expandedStepId === log.id;

            return (
              <div
                key={log.id + index}
                className="p-3 rounded-lg bg-[#0b0f17] border border-slate-800/80 transition-all hover:border-slate-700 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {/* Status Icon */}
                    <div className="mt-0.5 shrink-0">
                      {log.status === 'running' ? (
                        <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      ) : log.status === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200">
                          {log.title}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] border font-mono ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                        {log.description}
                      </p>
                    </div>
                  </div>

                  {/* Timing & Detail Expander */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">
                      {log.durationMs > 0 ? `${log.durationMs}ms` : log.timestamp}
                    </span>
                    {log.details && (
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="p-1 text-slate-500 hover:text-slate-300"
                        title="Tampilkan Detail Parameter"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Details */}
                {isExpanded && log.details && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-semibold text-slate-400 block mb-1">
                      Data Parameter Langkah:
                    </span>
                    <pre className="p-2 rounded bg-black/40 font-mono text-[10px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
