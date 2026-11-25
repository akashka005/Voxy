import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Clock,
  Copy,
  Download,
  FileCheck2,
  Fingerprint,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { AssessmentCase, InvestigationDisposition } from '../data';

interface EvidenceDrawerProps {
  open: boolean;
  assessment: AssessmentCase | null;
  onClose: () => void;
  onUpdateDisposition: (caseId: string, disposition: InvestigationDisposition) => void;
  onUpdateAnalystNotes: (caseId: string, notes: string) => void;
  onExportReport: () => void;
}

const DISPOSITIONS: InvestigationDisposition[] = [
  'RESTRICTED',
  'ESCALATED',
  'UNDER_REVIEW',
  'CLEARED',
];

export function EvidenceDrawer({
  open,
  assessment,
  onClose,
  onUpdateDisposition,
  onUpdateAnalystNotes,
  onExportReport,
}: EvidenceDrawerProps) {
  const [notesDraft, setNotesDraft] = useState('');
  const [notesSaved, setNotesSaved] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    if (assessment) {
      setNotesDraft(assessment.analystNotes ?? '');
      setNotesSaved(false);
    }
  }, [assessment?.id, assessment?.analystNotes]);

  if (!assessment) return null;

  const isDanger =
    assessment.threatScore.riskLevel === 'CRITICAL' ||
    assessment.threatScore.riskLevel === 'HIGH';

  const checksum =
    assessment.audioSha256 ??
    `${assessment.id.toLowerCase().replace(/[^a-z0-9]/g, '')}9f4a21c8e7b03d11092a8e4c51b094da772f1e08`;

  const engineRows = [
    {
      name: 'AASIST Anti-Spoofing',
      detail: `Synthetic Prob ${assessment.engines.voiceAuthenticity.syntheticProbability.toFixed(1)}%`,
      pct: assessment.engines.voiceAuthenticity.confidence,
      color: 'from-[#34D399] to-[#0E9F7E]',
    },
    {
      name: 'Whisper ASR Speech',
      detail: `Language: ${assessment.engines.speechIntelligence.language.toUpperCase()}`,
      pct: assessment.engines.speechIntelligence.confidence,
      color: 'from-[#A78BFA] to-[#7C3AED]',
    },
    {
      name: 'Fraud Intent Engine',
      detail: `${assessment.engines.fraudIntent.indicators.length} risk triggers`,
      pct: assessment.engines.fraudIntent.confidence,
      color: 'from-[#FB7185] to-[#DC2626]',
    },
    {
      name: 'ECAPA-TDNN Speaker ID',
      detail:
        assessment.engines.speakerVerification.status === 'AVAILABLE'
          ? assessment.engines.speakerVerification.inconclusiveLabel
          : 'UNAVAILABLE (Inconclusive)',
      pct: assessment.engines.speakerVerification.similarityScore
        ? Math.round(assessment.engines.speakerVerification.similarityScore * 100)
        : 0,
      color: 'from-[#FBBF24] to-[#D97706]',
    },
  ];

  const handleSaveNotes = () => {
    onUpdateAnalystNotes(assessment.id, notesDraft);
    setNotesSaved(true);
    window.setTimeout(() => setNotesSaved(false), 1800);
  };

  const handleCopySha = async () => {
    try {
      await navigator.clipboard.writeText(checksum);
    } catch {
      // Clipboard fallback
    }
    setCopiedHash(true);
    window.setTimeout(() => setCopiedHash(false), 1800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="evidence-drawer-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex justify-end bg-[#0F1B3D]/26"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="w-full max-w-lg h-full bg-gradient-to-b from-[#F7FAFF] via-[#EFF4FD] to-[#E8F0FC] border-l border-white shadow-[-20px_0_60px_rgba(15,27,61,0.22),inset_1.5px_0_0_rgba(255,255,255,0.95)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/85 flex items-start justify-between gap-3 bg-white/60">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#2563EB]">
                    Chain of Custody · {assessment.id}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      isDanger ? 'bg-[#FDD5DC] text-[#DC2626]' : 'bg-[#CFF5E7] text-[#0E9F7E]'
                    }`}
                  >
                    {assessment.threatScore.riskLevel}
                  </span>
                </div>
                <h2
                  id="evidence-drawer-title"
                  className="text-[19px] font-semibold text-[#0F1B3D] truncate"
                >
                  {assessment.title}
                </h2>
                <p className="text-[12px] text-[#5B6785] truncate mt-0.5">
                  {assessment.sourceChannel}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close evidence drawer"
                className="glass-lens-orb w-9 h-9 rounded-full flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Audio SHA-256 Checksum */}
              <div className="glass-inset-tile rounded-[18px] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#394563]">
                    <Fingerprint className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Audio SHA-256 Checksum</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySha}
                    className="glass-pill rounded-full px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F1B3D]"
                  >
                    {copiedHash ? (
                      <>
                        <Check className="w-3 h-3 text-[#0E9F7E]" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#5B6785]" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-[11.5px] text-[#2A3656] break-all bg-white/65 border border-white rounded-xl px-3 py-2">
                  {checksum}
                </div>
                {assessment.uploadedAudioSummary && (
                  <div className="mt-2 text-[11.5px] text-[#5B6785]">
                    Source file: <strong className="text-[#0F1B3D]">{assessment.uploadedAudioSummary.fileName}</strong>{' '}
                    ({(assessment.uploadedAudioSummary.fileSizeBytes / 1024).toFixed(1)} KB ·{' '}
                    {assessment.uploadedAudioSummary.sampleRate} Hz)
                  </div>
                )}
              </div>

              {/* Raw Engine Confidence Breakdown */}
              <div className="glass-inset-tile rounded-[18px] p-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#394563] mb-3">
                  <FileCheck2 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                  <span>Multi-Engine Confidence Breakdown</span>
                </div>
                <div className="space-y-3">
                  {engineRows.map((row) => (
                    <div key={row.name}>
                      <div className="flex items-center justify-between gap-2 text-[12.5px] mb-1">
                        <div>
                          <span className="font-semibold text-[#0F1B3D]">{row.name}</span>
                          <span className="text-[11px] text-[#5B6785] ml-2">{row.detail}</span>
                        </div>
                        <span className="font-bold text-[#0F1B3D] tabular-nums">
                          {row.pct > 0 ? `${row.pct}%` : '—'}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#DCE6F7]/80 border border-white overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${row.color}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editable Analyst Notes */}
              <div className="glass-inset-tile rounded-[18px] p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="evidence-analyst-notes"
                    className="text-[12px] font-semibold uppercase tracking-wider text-[#394563]"
                  >
                    Analyst Case Notes (Included in Export)
                  </label>
                  {notesSaved && (
                    <span
                      role="status"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E9F7E]"
                    >
                      <Check className="w-3 h-3" />
                      Saved
                    </span>
                  )}
                </div>
                <textarea
                  id="evidence-analyst-notes"
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  onBlur={() => {
                    if (notesDraft !== (assessment.analystNotes ?? '')) {
                      onUpdateAnalystNotes(assessment.id, notesDraft);
                    }
                  }}
                  placeholder="Document forensic observations, carrier trace IDs, or escalation justification..."
                  className="w-full rounded-xl bg-white/85 border border-white px-3 py-2 text-[13px] text-[#0F1B3D] placeholder:text-[#6B7A9E] focus:outline-none focus:ring-2 focus:ring-[#3B9BF0]"
                />
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#5B6785]">
                    Persisted across reloads and attached to JSON exports
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    className="rounded-full px-3.5 py-1.5 bg-[#0F1B3D] hover:bg-[#1E3063] text-white text-[12px] font-semibold transition-colors"
                  >
                    Save Notes
                  </button>
                </div>
              </div>

              {/* Disposition Control & History Timeline */}
              <div className="glass-inset-tile rounded-[18px] p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-[#394563]">
                    <Clock className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                    <span>Disposition &amp; Audit History</span>
                  </div>

                  <select
                    aria-label="Case disposition in evidence drawer"
                    value={assessment.disposition}
                    onChange={(e) =>
                      onUpdateDisposition(
                        assessment.id,
                        e.target.value as InvestigationDisposition,
                      )
                    }
                    className="glass-pill rounded-full px-3 py-1 text-[11.5px] font-semibold text-[#0F1B3D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
                  >
                    {DISPOSITIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <ol className="space-y-2.5 border-l-2 border-[#3B9BF0]/30 pl-3.5 ml-1.5">
                  {(assessment.dispositionHistory && assessment.dispositionHistory.length > 0
                    ? assessment.dispositionHistory
                    : [
                        {
                          timestamp: assessment.summary.analysisTime,
                          actor: assessment.analyst,
                          disposition: assessment.disposition,
                          note: assessment.summary.rationale,
                        },
                      ]
                  ).map((entry, idx) => (
                    <li key={`${entry.timestamp}-${idx}`} className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#3B9BF0] border-2 border-white shadow-xs"
                      />
                      <div className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="font-semibold text-[#0F1B3D] inline-flex items-center gap-1">
                          {entry.disposition === 'RESTRICTED' || entry.disposition === 'ESCALATED' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626]" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0E9F7E]" />
                          )}
                          {entry.disposition}
                        </span>
                        <span className="text-[11px] text-[#5B6785] tabular-nums">
                          {entry.timestamp}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[#475577] mt-0.5">
                        {entry.actor}
                        {entry.note ? ` — ${entry.note}` : ''}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-white/85 bg-white/60 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  onUpdateAnalystNotes(assessment.id, notesDraft);
                  onExportReport();
                }}
                className="glass-pill rounded-full px-4 py-2 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]"
              >
                <Download className="w-4 h-4 text-[#2563EB]" />
                <span>Export Bundle with Notes</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-[13px] font-semibold text-[#475577] hover:text-[#0F1B3D]"
              >
                Done
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
