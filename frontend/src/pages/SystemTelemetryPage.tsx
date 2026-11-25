import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  AssessmentCase,
  EngineTelemetryMetric,
  TopEngineStatus,
} from '../data';
import { TopBar } from '../components/TopBar';

interface SystemTelemetryPageProps {
  metrics: EngineTelemetryMetric[];
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  onSelectCase: (caseId: string) => void;
  onTickTelemetry: () => void;
  onRunDiagnostics: () => void;
}

export function SystemTelemetryPage({
  metrics,
  cases,
  activeCaseId,
  engineStatuses,
  onSelectCase,
  onTickTelemetry,
  onRunDiagnostics,
}: SystemTelemetryPageProps) {
  const navigate = useNavigate();
  const [liveStreaming, setLiveStreaming] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!liveStreaming) return;
    const timer = setInterval(() => {
      onTickTelemetry();
    }, 2200);
    return () => clearInterval(timer);
  }, [liveStreaming, onTickTelemetry]);

  const handleDiagnostics = () => {
    setScanning(true);
    setTimeout(() => {
      onRunDiagnostics();
      setScanning(false);
    }, 950);
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
        searchQuery=""
        onSearchChange={() => {}}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577]">
              INFERENCE CLUSTER DIAGNOSTICS
            </span>
          </div>
          <h1 className="font-serif-display text-[40px] sm:text-[46px] leading-[1.03] text-[#0F1B3D]">
            System Telemetry
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] text-[#475577]">
              Live p95 inference latency, GPU utilization, and multi-engine cluster health.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setLiveStreaming((v) => !v)}
            className="glass-pill rounded-full h-10 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]"
          >
            {liveStreaming ? (
              <Pause className="w-4 h-4 text-[#0E9F7E]" />
            ) : (
              <Play className="w-4 h-4 text-[#2563EB]" />
            )}
            <span>{liveStreaming ? 'Live Stream: On' : 'Live Stream: Paused'}</span>
          </button>

          <button
            type="button"
            onClick={handleDiagnostics}
            disabled={scanning}
            className="rounded-full h-10 px-4 bg-[#0F1B3D] hover:bg-[#1E3063] text-white inline-flex items-center gap-2 text-[13px] font-semibold shadow-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Running Diagnostics...' : 'Run Engine Diagnostics'}</span>
          </button>
        </div>
      </div>

      {/* Engine Telemetry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((eng) => {
          const isDegraded = eng.status === 'Degraded';
          const accent = isDegraded ? '#F59E0B' : '#14B89A';
          return (
            <article
              key={eng.id}
              className="glass-card glass-card-hover p-5 flex flex-col justify-between relative"
            >
              {scanning && (
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[#3B9BF0] to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                />
              )}

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isDegraded ? 'bg-[#FDE6B8] text-[#B7791F]' : 'bg-[#CFF5E7] text-[#0E9F7E]'
                    }`}
                  >
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="text-[15.5px] font-semibold text-[#0F1B3D]">{eng.name}</h2>
                    <p className="text-[12px] text-[#5B6785]">{eng.subtitle}</p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                    isDegraded
                      ? 'bg-[#FDE6B8] text-[#B7791F]'
                      : 'bg-[#CFF5E7] text-[#0E9F7E]'
                  }`}
                >
                  {eng.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                <div className="glass-inset-tile rounded-[16px] py-2 px-1">
                  <div className="text-[17px] font-bold text-[#0F1B3D] tabular-nums">
                    {eng.latencyMs}ms
                  </div>
                  <div className="text-[10.5px] text-[#5B6785]">p95 Latency</div>
                </div>
                <div className="glass-inset-tile rounded-[16px] py-2 px-1">
                  <div className="text-[17px] font-bold text-[#0F1B3D] tabular-nums">
                    {eng.throughputRps}/s
                  </div>
                  <div className="text-[10.5px] text-[#5B6785]">Throughput</div>
                </div>
                <div className="glass-inset-tile rounded-[16px] py-2 px-1">
                  <div className="text-[17px] font-bold text-[#0F1B3D] tabular-nums">
                    {eng.gpuUtilization}%
                  </div>
                  <div className="text-[10.5px] text-[#5B6785]">GPU Load</div>
                </div>
                <div className="glass-inset-tile rounded-[16px] py-2 px-1">
                  <div className="text-[17px] font-bold text-[#0F1B3D] tabular-nums">
                    {eng.uptimePct.toFixed(2)}%
                  </div>
                  <div className="text-[10.5px] text-[#5B6785]">Uptime</div>
                </div>
              </div>

              <div className="h-[110px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={eng.series} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${eng.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="tick" tick={{ fill: '#5B6785', fontSize: 10.5 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#5B6785', fontSize: 10.5 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        background: 'rgba(15,27,61,0.92)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11.5px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="latency"
                      name="Latency (ms)"
                      stroke={accent}
                      strokeWidth={2}
                      fill={`url(#grad-${eng.id})`}
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-[11.5px] text-[#5B6785] mt-2 pt-2 border-t border-white/60">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <BarChart3 className="w-3.5 h-3.5 text-[#2563EB]" />
                  Benchmark: {eng.accuracyMetric}
                </span>
                <span className="inline-flex items-center gap-1 font-medium text-[#0E9F7E]">
                  {isDegraded ? (
                    <>
                      <Activity className="w-3.5 h-3.5 text-[#D97706]" />
                      <span className="text-[#B7791F]">Auto-scaling workers</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Nominal</span>
                    </>
                  )}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </motion.div>
  );
}
