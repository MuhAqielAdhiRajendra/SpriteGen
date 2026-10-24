import React from 'react';
import { SpriteEvaluation } from '../types/sprite';
import { ShieldCheck, Sparkles, Check, AlertCircle, Wrench } from 'lucide-react';

interface AiEvaluationCardProps {
  evaluation: SpriteEvaluation | null;
  onApplyRefinement: () => void;
  isRefining: boolean;
}

export const AiEvaluationCard: React.FC<AiEvaluationCardProps> = ({
  evaluation,
  onApplyRefinement,
  isRefining
}) => {
  if (!evaluation) {
    return (
      <div className="p-8 text-center bg-[#0b0f17] border border-slate-800/80 rounded-xl text-slate-500 text-xs">
        Evaluasi visual AI akan otomatis dijalankan setelah karakter dibuat.
      </div>
    );
  }

  const isExceptional = evaluation.overallQuality === 'exceptional';
  const isApproved = evaluation.overallQuality === 'approved';

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#121826] border border-slate-800 rounded-xl shadow-lg">
      {/* Header Verdict Banner */}
      <div
        className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
          isExceptional
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : isApproved
            ? 'bg-indigo-950/30 border-indigo-500/40 text-indigo-200'
            : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              {isExceptional ? 'Kualitas Istimewa (AI Verified)' : isApproved ? 'Hasil Sesuai Prompt (AI Approved)' : 'Perlu Perbaikan Kontras'}
            </div>
            <p className="text-[11px] opacity-80 mt-0.5">
              {evaluation.verdict}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono opacity-70 whitespace-nowrap">
          {evaluation.inspectedAt}
        </span>
      </div>

      {/* 3 Metrics Gauge Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Kepatuhan Prompt
          </span>
          <span className="text-lg font-bold text-indigo-400 font-mono tabular-nums">
            {evaluation.adherenceScore}%
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Siluet & Proporsi
          </span>
          <span className="text-lg font-bold text-sky-400 font-mono tabular-nums">
            {evaluation.silhouetteScore}%
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800 text-center">
          <span className="text-[10px] font-medium text-slate-400 block truncate">
            Harmoni Palet
          </span>
          <span className="text-lg font-bold text-purple-400 font-mono tabular-nums">
            {evaluation.paletteHarmonyScore}%
          </span>
        </div>
      </div>

      {/* Detailed Critique Commentary */}
      <div className="p-3 bg-[#0b0f17] border border-slate-800/80 rounded-lg">
        <span className="text-[11px] font-semibold text-slate-300 block mb-1">
          Ulasan Direktur Seni AI (Critique):
        </span>
        <p className="text-xs text-slate-400 leading-relaxed">
          {evaluation.critique}
        </p>
      </div>

      {/* Detected Features vs Missing */}
      <div className="space-y-2">
        <div>
          <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">
            Fitur Visual Terdeteksi:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.detectedFeatures.map((feat, i) => (
              <span
                key={i}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-800/80 text-emerald-300 border border-emerald-900/40 flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                {feat}
              </span>
            ))}
          </div>
        </div>

        {evaluation.missingFeatures.length > 0 && (
          <div>
            <span className="text-[11px] font-semibold text-amber-400 block mb-1.5">
              Catatan Penyesuaian:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {evaluation.missingFeatures.map((miss, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/40 flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3 text-amber-400" />
                  {miss}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suggested Fixes & Refine Button */}
      {evaluation.suggestedFixes.length > 0 && (
        <div className="pt-2 border-t border-slate-800/80 flex flex-col gap-2">
          <span className="text-[11px] font-semibold text-slate-300">
            Rekomendasi Optimasi:
          </span>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            {evaluation.suggestedFixes.map((fix, idx) => (
              <li key={idx} className="leading-relaxed">
                {fix}
              </li>
            ))}
          </ul>

          <button
            onClick={onApplyRefinement}
            disabled={isRefining}
            className="mt-1 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center gap-2 shadow"
          >
            {isRefining ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menjalankan AI Refinement...</span>
              </>
            ) : (
              <>
                <Wrench className="w-3.5 h-3.5" />
                <span>Terapkan Refinement Otomatis Sekarang</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
