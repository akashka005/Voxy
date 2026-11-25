import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AssessmentCase, TopEngineStatus } from '../data';
import { TopBar } from '../components/TopBar';
import { computeOverviewMetrics } from '../utils/forensics';

interface OverviewPageProps {
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  onSelectCase: (caseId: string) => void;
}

/** Compute call-volume chart data from real case history instead of hardcoded values. */
function computeVolumeSeries(
  cases: AssessmentCase[],
  range: '24H' | '7D',
): { hour: string; calls: number; flagged: number }[] {
  const isFlagged = (c: AssessmentCase) =>
    c.threatScore.riskLevel === 'CRITICAL' || c.threatScore.riskLevel === 'HIGH';

  if (range === '7D') {
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return dayLabels.map((day, i) => {
      const dayCases = cases.filter((c) => {
        const d = new Date(c.summary.analysisTime);
        // getDay(): 0=Sun … 6=Sat → map to Mon-first index
        return ((d.getDay() + 6) % 7) === i;
      });
      return { hour: day, calls: dayCases.length, flagged: dayCases.filter(isFlagged).length };
    });
  }

  // 24H: bucket by hour label for the last 24 h
  const now = new Date();
  const buckets: { hour: string; calls: number; flagged: number }[] = [];
  for (let h = 23; h >= 0; h--) {
    const d = new Date(now.getTime() - h * 3_600_000);
    buckets.push({ hour: `${String(d.getHours()).padStart(2, '0')}:00`, calls: 0, flagged: 0 });
  }
  cases.forEach((c) => {
    const d = new Date(c.summary.analysisTime);
    const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
    if (diffH >= 0 && diffH < 24) {
      const idx = 23 - diffH;
      buckets[idx].calls++;
      if (isFlagged(c)) buckets[idx].flagged++;
    }
  });
  // Show last 8 h for a tidy chart; show at least all non-zero buckets
  const nonZeroStart = buckets.findIndex((b) => b.calls > 0);
  const start = nonZeroStart >= 0 ? Math.max(0, Math.min(nonZeroStart, 16)) : 16;
  return buckets.slice(start);
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.055 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.16, 1, 0.3, 1] as const } },
};

export function OverviewPage({
  cases,
  activeCaseId,
  engineStatuses,
  onSelectCase,
}: OverviewPageProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [rangeFilter, setRangeFilter] = useState<'24H' | '7D'>('24H');

  const metrics = computeOverviewMetrics(cases);
  const seriesData = computeVolumeSeries(cases, rangeFilter);

  const handleOpenCase = (caseId: string) => {
    onSelectCase(caseId);
    navigate('/');
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 min-w-0 p-4 sm:p-5 lg:px-8 lg:py-5 relative z-10 max-w-[1460px] mx-auto w-full"
    >
      <motion.div variants={cardVariants}>
        <TopBar
          statuses={engineStatuses}
          cases={cases}
          activeCaseId={activeCaseId}
          onSelectCase={handleOpenCase}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </motion.div>

      {/* Header */}
      <motion.div
        variants={cardVariants}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5"
      >
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577]">
              EXECUTIVE COMMAND POSTURE
            </span>
          </div>
          <h1 className="font-serif-display text-[40px] sm:text-[46px] leading-[1.03] text-[#0F1B3D]">
            Overview
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] text-[#475577]">
              Real-time voice channel risk telemetry and active social-engineering triage queue.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="glass-pill rounded-full h-10 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] whitespace-nowrap self-start sm:self-auto shrink-0"
        >
          <span>Open Active Assessment</span>
          <ArrowUpRight className="w-4 h-4 text-[#2563EB]" />
        </button>
      </motion.div>

      {/* KPI Strip */}
      <motion.div
        variants={cardVariants}
        className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5"
      >
        <article className="glass-card glass-card-hover engine-card-a p-4 sm:p-5">
          <div className="flex items-center justify-between text-[12.5px] font-medium text-[#5B6785]">
            <span>Analyzed Voice Captures</span>
            <Activity className="w-4 h-4 text-[#0E9F7E]" />
          </div>
          <div className="text-[34px] font-bold text-[#0F1B3D] mt-2 leading-none tabular-nums">
            {metrics.totalCases}
          </div>
          <div className="text-[12px] text-[#0E9F7E] font-semibold mt-2">
            Live queue synchronized
          </div>
        </article>

        <article className="glass-card glass-card-hover engine-card-d p-4 sm:p-5">
          <div className="flex items-center justify-between text-[12.5px] font-medium text-[#5B6785]">
            <span>Critical / High Alerts</span>
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="text-[34px] font-bold text-[#0F1B3D] mt-2 leading-none tabular-nums">
            {metrics.criticalOrHighCount}
          </div>
          <div className="text-[12px] text-[#DC2626] font-semibold mt-2">
            Immediate review recommended
          </div>
        </article>

        <article className="glass-card glass-card-hover engine-card-c p-4 sm:p-5">
          <div className="flex items-center justify-between text-[12.5px] font-medium text-[#5B6785]">
            <span>Mean Composite Threat</span>
            <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
          </div>
          <div className="text-[34px] font-bold text-[#0F1B3D] mt-2 leading-none tabular-nums">
            {metrics.avgThreatScore.toFixed(1)}
            <span className="text-[14px] font-medium text-[#5B6785]">/100</span>
          </div>
          <div className="text-[12px] text-[#7C3AED] font-semibold mt-2">
            Multi-engine weighted mean
          </div>
        </article>

        <article className="glass-card glass-card-hover engine-card-b p-4 sm:p-5">
          <div className="flex items-center justify-between text-[12.5px] font-medium text-[#5B6785]">
            <span>Action Restriction Rate</span>
            <ShieldAlert className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="text-[34px] font-bold text-[#0F1B3D] mt-2 leading-none tabular-nums">
            {metrics.restrictedRatePct}%
          </div>
          <div className="text-[12px] text-[#B7791F] font-semibold mt-2">
            Policy blocks &amp; SOC escalations
          </div>
        </article>
      </motion.div>

      {/* Main Split: Volume Chart + Priority Triage Queue */}
      <motion.div
        variants={cardVariants}
        className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-4"
      >
        <section aria-label="Channel Traffic & Anomaly Volume" className="glass-card glass-card-hover p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-[#0F1B3D]">
                Channel Screening Volume vs. Flagged Threats
              </h2>
              <p className="text-[12.5px] text-[#5B6785]">
                Continuous screening across SIP, WebRTC, and PSTN voice trunks
              </p>
            </div>
            <div className="glass-pill rounded-full flex items-center gap-1 p-1">
              {(['24H', '7D'] as const).map((tab) => {
                const isSelected = rangeFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRangeFilter(tab)}
                    className={`relative px-3.5 py-1 rounded-full text-[12px] font-semibold transition-colors ${
                      isSelected ? 'text-white' : 'text-[#5B6785] hover:text-[#0F1B3D]'
                    }`}
                  >
                    {isSelected && (
                      <motion.span
                        layoutId="overview-range-pill"
                        transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                        className="absolute inset-0 rounded-full bg-[#0F1B3D] shadow-[0_6px_16px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{tab}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-[245px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={seriesData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="overviewCallsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B9BF0" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#3B9BF0" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="overviewFlaggedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,0.25)" strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fill: '#394563', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#394563', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '14px',
                    background: 'rgba(15,27,61,0.92)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="Screened Calls"
                  stroke="#3B9BF0"
                  strokeWidth={2.2}
                  fill="url(#overviewCallsGrad)"
                  animationDuration={450}
                />
                <Area
                  type="monotone"
                  dataKey="flagged"
                  name="Flagged Anomalies"
                  stroke="#EF4444"
                  strokeWidth={2.2}
                  fill="url(#overviewFlaggedGrad)"
                  animationDuration={450}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Priority Triage Queue */}
        <section aria-label="Priority Triage Queue" className="glass-card glass-card-hover p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#0F1B3D]">Priority Triage Queue</h2>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="text-[12px] font-semibold text-[#2563EB] hover:underline"
              >
                View all cases
              </button>
            </div>

            <div className="space-y-2.5">
              {cases.slice(0, 4).map((item) => {
                const isDanger =
                  item.threatScore.riskLevel === 'CRITICAL' ||
                  item.threatScore.riskLevel === 'HIGH';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleOpenCase(item.id)}
                    className="w-full text-left glass-inset-tile rounded-[18px] hover:bg-white/82 p-3 flex items-center justify-between gap-3 transition-all hover:translate-x-0.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold text-[#0F1B3D] truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="text-[11.5px] text-[#5B6785] truncate mt-0.5">
                        {item.id} · {item.sourceChannel}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                          isDanger
                            ? 'bg-[#FDD5DC] text-[#DC2626]'
                            : 'bg-[#CFF5E7] text-[#0E9F7E]'
                        }`}
                      >
                        {item.threatScore.score.toFixed(1)}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-[#5B6785]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/70 flex items-center justify-between text-[12px] text-[#5B6785]">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#0E9F7E]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Risk Distribution: {metrics.distribution.map((d) => `${d.level} (${d.count})`).join(' · ')}
            </span>
          </div>
        </section>
      </motion.div>
    </motion.div>
  );
}
