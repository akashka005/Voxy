import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileText,
  Fingerprint,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import type { AssessmentCase } from '../data';

interface SummaryCardProps {
  assessment: AssessmentCase;
  onExportReport: () => void;
  onOpenEvidence?: () => void;
}

export function SummaryCard({
  assessment,
  onExportReport,
  onOpenEvidence,
}: SummaryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const { summary } = assessment;
  const isCritical = summary.riskLevel === 'CRITICAL' || summary.riskLevel === 'HIGH';

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard fallback in restricted headless contexts
    }
    setCopiedLabel(label);
    setMenuOpen(false);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  return (
    <section
      aria-label="Threat Assessment Summary"
      className="glass-card glass-card-hover p-4 sm:px-5 sm:py-4 flex flex-col justify-between relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <FileText className="w-[18px] h-[18px] text-[#2563EB] shrink-0" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[#0F1B3D] truncate">
            Threat Assessment Summary
          </h2>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-label="Summary actions menu"
            className="w-7 h-7 rounded-full hover:bg-white/60 flex items-center justify-center text-[#5B6785] hover:text-[#0F1B3D] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 w-56 rounded-[18px] bg-white/96 border border-white shadow-[0_14px_36px_rgba(25,45,105,0.18),inset_0_1px_0_rgba(255,255,255,1)] p-1.5 z-30"
            >
              {onOpenEvidence && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenEvidence();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] flex items-center gap-2"
                >
                  <Fingerprint className="w-3.5 h-3.5 text-[#2563EB]" />
                  Open Evidence &amp; Notes
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => handleCopy(assessment.id, 'Case ID copied')}
                className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-[#0F1B3D] hover:bg-slate-100/80 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-[#5B6785]" />
                Copy Case ID
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleCopy(summary.decision, 'Decision copied')}
                className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-[#0F1B3D] hover:bg-slate-100/80 flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5 text-[#5B6785]" />
                Copy Decision Code
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onExportReport();
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-[12.5px] font-medium text-[#0F1B3D] hover:bg-slate-100/80 flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-[#5B6785]" />
                Download Summary
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Key-Value Summary Rows */}
      <dl className="divide-y divide-[#0F1B3D]/[0.06] text-[13px] flex-1">
        <div className="grid grid-cols-[88px_1fr] 2xl:grid-cols-[110px_1fr] gap-2 items-center pb-2">
          <dt className="text-[#5B6785] font-medium">Risk Level:</dt>
          <dd className="flex items-center gap-2 font-bold">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isCritical
                  ? 'bg-[#EF4444] shadow-[0_0_8px_rgba(239,68,68,0.55)]'
                  : 'bg-[#14B89A]'
              }`}
              aria-hidden="true"
            />
            <span className={isCritical ? 'text-[#DC2626]' : 'text-[#0E9F7E]'}>
              {summary.riskLevel}
            </span>
          </dd>
        </div>

        <div className="grid grid-cols-[88px_1fr] 2xl:grid-cols-[110px_1fr] gap-2 items-center py-2">
          <dt className="text-[#5B6785] font-medium">Decision:</dt>
          <dd className="flex items-center gap-1.5 font-bold min-w-0">
            {isCritical ? (
              <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0" aria-hidden="true" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-[#0E9F7E] shrink-0" aria-hidden="true" />
            )}
            <span
              className={`font-mono text-[10.8px] 2xl:text-[12.5px] tracking-tight truncate ${
                isCritical ? 'text-[#DC2626]' : 'text-[#0E9F7E]'
              }`}
              title={summary.decision}
            >
              {summary.decision}
            </span>
          </dd>
        </div>

        <div className="grid grid-cols-[88px_1fr] 2xl:grid-cols-[110px_1fr] gap-2 items-start py-2">
          <dt className="text-[#5B6785] font-medium">Rationale:</dt>
          <dd className="text-[#0F1B3D] font-medium leading-[1.4]">
            {summary.rationale}
          </dd>
        </div>

        <div className="grid grid-cols-[88px_1fr] 2xl:grid-cols-[110px_1fr] gap-2 items-center pt-2">
          <dt className="text-[#5B6785] font-medium">Analysis Time:</dt>
          <dd className="text-[#2A3656] font-medium tabular-nums">
            {summary.analysisTime}
          </dd>
        </div>
      </dl>

      {copiedLabel && (
        <div
          role="status"
          className="mt-2 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0E9F7E]"
        >
          <Check className="w-3.5 h-3.5" />
          <span>{copiedLabel}</span>
        </div>
      )}
    </section>
  );
}
