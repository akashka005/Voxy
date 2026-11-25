import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowUpRight,
  Check,
  Download,
  FileCheck2,
  FileText,
  Loader2,
  Lock,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import type { AssessmentCase, ForensicReportItem, TopEngineStatus } from '../data';
import { TopBar } from '../components/TopBar';
import { buildForensicExportPayload, filterReports } from '../utils/forensics';

interface ForensicReportsPageProps {
  reports: ForensicReportItem[];
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  onSelectCase: (caseId: string) => void;
  onGenerateReportForCase: (caseId: string) => void;
  onSignReport: (reportId: string) => void;
}

export function ForensicReportsPage({
  reports,
  cases,
  activeCaseId,
  engineStatuses,
  onSelectCase,
  onGenerateReportForCase,
  onSignReport,
}: ForensicReportsPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [signedOnly, setSignedOnly] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState(reports[0]?.reportId ?? '');
  const [toast, setToast] = useState<string | null>(null);
  const [bundleExportStatus, setBundleExportStatus] = useState<'idle' | 'pending' | 'exported'>('idle');

  const filtered = filterReports(reports, query, signedOnly);
  const activeReport =
    filtered.find((r) => r.reportId === selectedReportId) ?? filtered[0] ?? null;

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? null : prev)), 2400);
  };

  const handleDownload = (report: ForensicReportItem) => {
    if (bundleExportStatus !== 'idle') return;
    setBundleExportStatus('pending');
    setTimeout(() => {
      const matchedCase = cases.find((c) => c.id === report.caseId) ?? cases[0];
      const payload = buildForensicExportPayload(matchedCase);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${report.reportId.toLowerCase()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setBundleExportStatus('exported');
      notify(`Downloaded ${report.reportId}`);
      setTimeout(() => {
        setBundleExportStatus('idle');
      }, 1800);
    }, 650);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-w-0 p-4 sm:p-5 lg:px-8 lg:py-5 relative z-10 max-w-[1460px] mx-auto w-full"
    >
      <TopBar
        statuses={engineStatuses}
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={(id) => {
          onSelectCase(id);
          navigate('/');
        }}
        searchQuery={query}
        onSearchChange={setQuery}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577]">
              EVIDENTIARY ARCHIVE
            </span>
          </div>
          <h1 className="font-serif-display text-[40px] sm:text-[46px] leading-[1.03] text-[#0F1B3D]">
            Forensic Reports
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] text-[#475577]">
              Cryptographically hashed incident dossiers and compliance export bundles.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="glass-pill rounded-full h-10 px-3.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#5B6785]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports..."
              aria-label="Search forensic reports"
              className="bg-transparent text-[13px] text-[#0F1B3D] placeholder:text-[#5B6785] focus:outline-none w-36"
            />
          </div>

          <button
            type="button"
            onClick={() => setSignedOnly((v) => !v)}
            aria-pressed={signedOnly}
            className={`glass-pill rounded-full h-10 px-4 text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${
              signedOnly ? 'bg-[#0F1B3D] text-white border-[#0F1B3D]' : 'text-[#0F1B3D]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Signed Only</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onGenerateReportForCase(activeCaseId);
              notify(`Generated dossier for ${activeCaseId}`);
            }}
            className="glass-pill rounded-full h-10 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]"
          >
            <Plus className="w-4 h-4 text-[#2563EB]" />
            <span>Generate Active Dossier</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-start">
        {/* Report List */}
        <section aria-label="Reports Vault" className="glass-card p-5 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[14px] text-[#5B6785]">
              No matching forensic dossiers found.
            </div>
          ) : (
            filtered.map((rep) => {
              const isSelected = activeReport?.reportId === rep.reportId;
              const isDanger = rep.riskLevel === 'CRITICAL' || rep.riskLevel === 'HIGH';
              return (
                <button
                  key={rep.reportId}
                  type="button"
                  onClick={() => setSelectedReportId(rep.reportId)}
                  className={`w-full text-left rounded-[18px] p-4 border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-gradient-to-b from-white/92 to-white/75 border-[#93C5FD] shadow-[0_8px_22px_rgba(37,99,235,0.12),inset_0_1.5px_0_rgba(255,255,255,1)]'
                      : 'glass-inset-tile hover:bg-white/78'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] flex items-center justify-center text-[#2563EB] shrink-0 mt-0.5">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-[#0F1B3D] truncate">
                        {rep.title}
                      </div>
                      <div className="text-[11.5px] text-[#5B6785] mt-0.5">
                        {rep.reportId} · {rep.author} · {rep.generatedAt}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isDanger
                          ? 'bg-[#FDD5DC] text-[#DC2626]'
                          : 'bg-[#CFF5E7] text-[#0E9F7E]'
                      }`}
                    >
                      {rep.riskLevel}
                    </span>
                    {rep.signed ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-[10px] font-bold uppercase">
                        SIGNED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-[#FDE6B8] text-[#B7791F] text-[10px] font-bold uppercase">
                        DRAFT
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </section>

        {/* Report Inspector */}
        {activeReport && (
          <section aria-label="Dossier Preview" className="glass-card glass-card-hover p-5">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/70">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-[16px] font-semibold text-[#0F1B3D]">
                  {activeReport.reportId}
                </h2>
              </div>
              <span className="text-[11.5px] font-medium text-[#5B6785]">
                {activeReport.sizeLabel}
              </span>
            </div>

            <dl className="mt-4 space-y-3 text-[13px]">
              <div>
                <dt className="text-[#5B6785] text-[11.5px] uppercase font-semibold">Case Reference</dt>
                <dd className="font-semibold text-[#0F1B3D] mt-0.5">{activeReport.caseId}</dd>
              </div>
              <div>
                <dt className="text-[#5B6785] text-[11.5px] uppercase font-semibold">Policy Decision</dt>
                <dd className="font-mono text-[12.5px] font-bold text-[#DC2626] mt-0.5">
                  {activeReport.decision}
                </dd>
              </div>
              <div>
                <dt className="text-[#5B6785] text-[11.5px] uppercase font-semibold">SHA-256 Digest</dt>
                <dd className="glass-inset-tile font-mono text-[12px] text-[#394563] rounded-[16px] px-3 py-2 mt-1">
                  {activeReport.sha256}
                </dd>
              </div>
              <div>
                <dt className="text-[#5B6785] text-[11.5px] uppercase font-semibold">Signing Authority</dt>
                <dd className="text-[#0F1B3D] font-medium mt-0.5">
                  {activeReport.signed ? `Verified Seal · ${activeReport.author}` : 'Pending analyst signature'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 pt-4 border-t border-white/70 flex flex-wrap items-center gap-2.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {bundleExportStatus !== 'exported' ? (
                  <motion.button
                    key="download-bundle-btn"
                    type="button"
                    layout
                    disabled={bundleExportStatus === 'pending'}
                    onClick={() => handleDownload(activeReport)}
                    initial={{ opacity: 0, scale: 0.94, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="glass-pill rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D] disabled:cursor-wait"
                  >
                    {bundleExportStatus === 'pending' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-[#2563EB] animate-spin" aria-hidden="true" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                        <span>Download Bundle</span>
                      </>
                    )}
                  </motion.button>
                ) : (
                  <motion.div
                    key="download-bundle-done"
                    layout
                    role="status"
                    initial={{ opacity: 0, scale: 0.92, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -4 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-full px-4 py-2 bg-[#CFF5E7]/90 border border-[#9EEBD0] inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0E9F7E]"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Bundle Exported</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!activeReport.signed && (
                <button
                  type="button"
                  onClick={() => {
                    onSignReport(activeReport.reportId);
                    notify(`Signed ${activeReport.reportId}`);
                  }}
                  className="rounded-full px-4 py-2 bg-[#0F1B3D] hover:bg-[#1E3063] text-white inline-flex items-center gap-1.5 text-[12.5px] font-semibold"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign &amp; Seal</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onSelectCase(activeReport.caseId);
                  navigate('/');
                }}
                className="ml-auto text-[12.5px] font-semibold text-[#2563EB] inline-flex items-center gap-1 hover:underline"
              >
                <span>Open Case</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 glass-pill rounded-full px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] shadow-lg"
        >
          <Check className="w-4 h-4 text-[#0E9F7E]" />
          <span>{toast}</span>
        </div>
      )}
    </motion.div>
  );
}
