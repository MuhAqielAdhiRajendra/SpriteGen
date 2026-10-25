import React from 'react';
import { SpriteEvaluation } from '../types/sprite';
import { ShieldCheck, Hammer, Check, AlertCircle } from 'lucide-react';

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
      <div className="p-8 text-center bg-[#141211] border-2 border-[#44403c] text-[#a8a29e] text-xs flex flex-col items-center gap-3">
        {/* Pixel Mascot Resting */}
        <div className="w-8 h-8 flex items-center justify-center">
          <svg className="w-8 h-8" viewBox="0 0 16 16" shapeRendering="crispEdges">
            <rect x="2" y="12" width="12" height="3" fill="#292524" />
            <rect x="4" y="10" width="8" height="2" fill="#44403c" />
            <rect x="7" y="6" width="4" height="4" fill="#a8a29e" />
            <rect x="5" y="8" width="2" height="4" fill="#ea580c" />
          </svg>
        </div>
        <div className="font-pixel text-sm text-[#e7e5e4]">Landasan masih kosong.</div>
        <p className="text-[11px] font-body text-[#78716c]">
          Tempa karakter untuk melihat catatan inspeksi kualitas bilah & proporsi.
        </p>
      </div>
    );
  }

  const isApproved = evaluation.overallQuality === 'exceptional' || evaluation.overallQuality === 'approved';

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#292524] border-2 border-[#44403c] shadow-[4px_4px_0_#000]">
      {/* Header Verdict */}
      <div
        className={`p-3 border-2 flex items-start justify-between gap-3 ${
          isApproved
            ? 'bg-[#1c1917] border-[#fbbf24] text-[#e7e5e4]'
            : 'bg-[#1c1917] border-[#b91c1c] text-[#e7e5e4]'
        }`}
      >
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              isApproved ? 'text-[#fbbf24]' : 'text-[#b91c1c]'
            }`}
          />
          <div>
            <div className="font-pixel text-xs font-bold uppercase tracking-wider text-[#fbbf24]">
              {isApproved ? 'Lolos Uji Kualitas Tempa' : 'Perlu Penajaman Kontras'}
            </div>
            <p className="text-xs font-body text-[#a8a29e] mt-0.5 leading-relaxed">
              {evaluation.verdict}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-tech text-[#a8a29e] shrink-0">
          {evaluation.inspectedAt}
        </span>
      </div>

      {/* 3 Metrics Gauge Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-[#141211] border border-[#44403c] text-center">
          <span className="text-[10px] font-pixel text-[#a8a29e] block">
            Kepatuhan Prompt
          </span>
          <span className="text-base font-bold text-[#fbbf24] font-tech tabular-nums">
            {evaluation.adherenceScore}%
          </span>
        </div>

        <div className="p-2 bg-[#141211] border border-[#44403c] text-center">
          <span className="text-[10px] font-pixel text-[#a8a29e] block">
            Siluet & Proporsi
          </span>
          <span className="text-base font-bold text-[#e7e5e4] font-tech tabular-nums">
            {evaluation.silhouetteScore}%
          </span>
        </div>

        <div className="p-2 bg-[#141211] border border-[#44403c] text-center">
          <span className="text-[10px] font-pixel text-[#a8a29e] block">
            Harmoni Palet
          </span>
          <span className="text-base font-bold text-[#ea580c] font-tech tabular-nums">
            {evaluation.paletteHarmonyScore}%
          </span>
        </div>
      </div>

      {/* Critique Commentary */}
      <div className="p-2.5 bg-[#141211] border border-[#44403c]">
        <span className="text-[11px] font-pixel font-bold text-[#fbbf24] block mb-1">
          Catatan Mandor Penempa:
        </span>
        <p className="text-xs font-body text-[#e7e5e4] leading-relaxed">
          {evaluation.critique}
        </p>
      </div>

      {/* Suggested Fixes */}
      {evaluation.suggestedFixes && evaluation.suggestedFixes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[11px] font-pixel font-bold text-[#a8a29e] block">
            Langkah Penyempurnaan:
          </span>
          <ul className="space-y-1">
            {evaluation.suggestedFixes.map((fix, idx) => (
              <li
                key={idx}
                className="text-[11px] font-body text-[#a8a29e] flex items-start gap-1.5"
              >
                <span className="text-[#ea580c] font-bold font-tech">•</span>
                <span>{fix}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button: Refinement */}
      <div className="pt-2">
        <button
          onClick={onApplyRefinement}
          disabled={isRefining}
          className="w-full forge-btn-secondary py-2 px-3 text-xs flex items-center justify-center gap-2"
        >
          <Hammer className="w-3.5 h-3.5 text-[#fbbf24]" />
          <span>{isRefining ? 'Merapikan Terak...' : 'Pukul Rapikan Terak & Pixel'}</span>
        </button>
      </div>
    </div>
  );
};
