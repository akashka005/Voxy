import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowUpRight,
  Filter,
  Fingerprint,
  History,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AssessmentCase,
  InvestigationDisposition,
  RiskLevel,
  TopEngineStatus,
} from '../data';
import { TopBar } from '../components/TopBar';
import { filterInvestigations, formatDuration } from '../utils/forensics';

interface InvestigationHistoryPageProps {
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  onSelectCase: (caseId: string) => void;
  onUpdateDisposition: (caseId: string, disposition: InvestigationDisposition) => void;
  onOpenEvidence?: (caseId: string) => void;
}

const RISK_FILTERS: (RiskLevel | 'ALL')[] = ['ALL', 'CRITICAL', 'HIGH', 'LOW'];

export function InvestigationHistoryPage({
  cases,
  activeCaseId,
  engineStatuses,
  onSelectCase,
  onUpdateDisposition,
  onOpenEvidence,
}: InvestigationHistoryPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');

  const filtered = filterInvestigations(cases, query, riskFilter);

  const handleInspect = (caseId: string) => {
    onSelectCase(caseId);
    navigate('/');
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
        onSelectCase={handleInspect}
        searchQuery={query}
        onSearchChange={setQuery}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577]">
              FORENSIC AUDIT TRAIL
            </span>
          </div>
          <h1 className="font-serif-display text-[40px] sm:text-[46px] leading-[1.03] text-[#0F1B3D]">
            Investigation History
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] text-[#475577]">
              Review past voice threat evaluations, update analyst dispositions, or inspect waveforms.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="glass-pill rounded-full h-10 px-3.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#5B6785]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter history..."
              aria-label="Filter investigation history"
              className="bg-transparent text-[13px] text-[#0F1B3D] placeholder:text-[#5B6785] focus:outline-none w-40"
            />
          </div>

          <div className="glass-pill rounded-full p-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#5B6785] ml-2 mr-1" aria-hidden="true" />
            {RISK_FILTERS.map((level) => {
              const isSelected = riskFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRiskFilter(level)}
                  className={`relative px-3 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                    isSelected ? 'text-white' : 'text-[#475577] hover:text-[#0F1B3D]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="history-filter-pill"
                      transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#0F1B3D] shadow-[0_6px_16px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10">{level}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <section aria-label="Investigation Cases Ledger" className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-[15.5px] font-semibold text-[#0F1B3D]">
              Evaluated Voice Sessions ({filtered.length})
            </h2>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[14.5px] font-medium text-[#5B6785]">
              No investigations match the current filter criteria.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setRiskFilter('ALL');
              }}
              className="mt-3 glass-pill rounded-full px-4 py-1.5 text-[12.5px] font-semibold text-[#0F1B3D]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#0F1B3D]/10 text-[11.5px] font-semibold uppercase tracking-wider text-[#5B6785]">
                  <th className="py-3 px-3">Case / Channel</th>
                  <th className="py-3 px-3">Threat Score</th>
                  <th className="py-3 px-3">Duration</th>
                  <th className="py-3 px-3">Fraud Indicators</th>
                  <th className="py-3 px-3">Disposition</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0F1B3D]/8 text-[13px]">
                {filtered.map((item) => {
                  const isDanger =
                    item.threatScore.riskLevel === 'CRITICAL' ||
                    item.threatScore.riskLevel === 'HIGH';
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/55 transition-colors ${
                        item.id === activeCaseId ? 'bg-[#EFF6FF]/65' : ''
                      }`}
                    >
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-[#0F1B3D]">{item.title}</div>
                        <div className="text-[11.5px] text-[#5B6785]">
                          {item.id} · {item.sourceChannel}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 tabular-nums">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0F1B3D] text-[14px]">
                            {item.threatScore.score.toFixed(1)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isDanger
                                ? 'bg-[#FDD5DC] text-[#DC2626]'
                                : 'bg-[#CFF5E7] text-[#0E9F7E]'
                            }`}
                          >
                            {item.threatScore.riskLevel}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-medium text-[#394563] tabular-nums">
                        {formatDuration(item.durationSec)}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {item.engines.fraudIntent.indicators.slice(0, 2).map((ind) => (
                            <span
                              key={ind}
                              className="glass-inset-tile px-2 py-0.5 rounded-full text-[10px] font-semibold text-[#394563]"
                            >
                              {ind}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="inline-flex items-center gap-1.5">
                          {isDanger ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#0E9F7E] shrink-0" />
                          )}
                          <select
                            aria-label={`Disposition for ${item.id}`}
                            value={item.disposition}
                            onChange={(e) =>
                              onUpdateDisposition(
                                item.id,
                                e.target.value as InvestigationDisposition,
                              )
                            }
                            className="glass-pill rounded-full px-2.5 py-1 text-[11.5px] font-semibold text-[#0F1B3D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
                          >
                            <option value="RESTRICTED">RESTRICTED</option>
                            <option value="ESCALATED">ESCALATED</option>
                            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                            <option value="CLEARED">CLEARED</option>
                          </select>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-[12px] text-[#5B6785] tabular-nums whitespace-nowrap">
                        {item.summary.analysisTime}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {onOpenEvidence && (
                            <button
                              type="button"
                              onClick={() => onOpenEvidence(item.id)}
                              aria-label={`Open evidence for ${item.id}`}
                              className="glass-pill rounded-full px-3 py-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#1D4ED8] whitespace-nowrap"
                            >
                              <Fingerprint className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                              <span>Evidence</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleInspect(item.id)}
                            className="glass-pill rounded-full px-3.5 py-1.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#0F1B3D] whitespace-nowrap"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#2563EB]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </motion.div>
  );
}
