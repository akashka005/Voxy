import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { TemporalDataPoint } from '../data';
import { findPeakRisk } from '../utils/forensics';

interface TemporalChartProps {
  data: TemporalDataPoint[];
  syncedTimeSec?: number;
}

function findNearestTemporalPoint(
  data: TemporalDataPoint[],
  targetTime: number,
): TemporalDataPoint | undefined {
  if (data.length === 0) return undefined;
  let best = data[0];
  let bestDiff = Math.abs(data[0].time - targetTime);
  for (let i = 1; i < data.length; i++) {
    const diff = Math.abs(data[i].time - targetTime);
    if (diff < bestDiff) {
      best = data[i];
      bestDiff = diff;
    }
  }
  return best;
}

export function TemporalChart({ data, syncedTimeSec }: TemporalChartProps) {
  const peakPoint = findPeakRisk(data);
  const [hoveredPoint, setHoveredPoint] = useState<TemporalDataPoint | null>(null);

  const syncedPoint =
    typeof syncedTimeSec === 'number'
      ? findNearestTemporalPoint(data, syncedTimeSec)
      : undefined;

  const activePoint = hoveredPoint ?? syncedPoint ?? peakPoint;
  const isAtPeak =
    activePoint && peakPoint && Math.abs(activePoint.time - peakPoint.time) < 0.05;
  const lastTime = data[data.length - 1]?.time ?? 12;
  const maxDomainTime =
    lastTime >= 11.5 && lastTime <= 12.5 ? 12 : Math.max(1, Number(lastTime.toFixed(1)));

  return (
    <section
      aria-label="Temporal Anomaly Analysis"
      className="glass-card glass-card-hover p-4 sm:px-5 sm:py-4 flex flex-col justify-between"
    >
      {/* Header + Inline Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="w-[18px] h-[18px] text-[#2563EB]" aria-hidden="true" />
          <h2 className="text-[16px] font-semibold text-[#0F1B3D]">
            Temporal Anomaly Analysis
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[12px] font-medium text-[#2A3656]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3B9BF0]" aria-hidden="true" />
            Authenticity
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14B89A]" aria-hidden="true" />
            Fraud Intent
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" aria-hidden="true" />
            Risk Score
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-4 border-t-2 border-dashed border-[#EF4444]"
              aria-hidden="true"
            />
            Anomaly Threshold
          </span>
        </div>
      </div>

      {/* Recharts LineChart */}
      <div
        className="relative h-[164px] w-full"
        data-testid="temporal-chart"
        data-synced-time={activePoint?.time.toFixed(1) ?? ''}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 28, right: 16, left: -18, bottom: 2 }}
            onMouseMove={(state) => {
              const idx =
                typeof state?.activeTooltipIndex === 'number'
                  ? state.activeTooltipIndex
                  : -1;
              if (idx >= 0 && data[idx]) {
                setHoveredPoint(data[idx]);
              }
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <CartesianGrid
              stroke="rgba(148, 163, 184, 0.28)"
              strokeDasharray="3 3"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="time"
              type="number"
              domain={[0, maxDomainTime]}
              ticks={maxDomainTime === 12 ? [0, 2, 4, 6, 8, 10, 12] : undefined}
              tickFormatter={(v) => `${v}s`}
              tick={{ fill: '#394563', fontSize: 12, fontWeight: 500 }}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.35)' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tick={{ fill: '#394563', fontSize: 12, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />

            {/* Anomaly Threshold at 65 */}
            <ReferenceLine
              y={65}
              stroke="#EF4444"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />

            {/* Active / Synced / Peak Cursor Line */}
            {activePoint && (
              <ReferenceLine
                x={activePoint.time}
                stroke="#3B9BF0"
                strokeWidth={2}
                strokeOpacity={0.85}
                label={{
                  value: isAtPeak
                    ? `Peak Risk: ${activePoint.riskScore.toFixed(1)}`
                    : `${activePoint.time.toFixed(1)}s · Risk: ${activePoint.riskScore.toFixed(1)}`,
                  position: 'top',
                  content: (props) => {
                    const vb = props?.viewBox as { x?: number; y?: number } | undefined;
                    const x = vb?.x ?? 0;
                    const pillWidth = isAtPeak ? 124 : 138;
                    const clampedX = Math.max(pillWidth / 2 + 4, x);
                    return (
                      <g transform={`translate(${clampedX - pillWidth / 2}, 1)`}>
                        <rect
                          width={pillWidth}
                          height={25}
                          rx={12.5}
                          fill="rgba(15, 27, 61, 0.92)"
                          stroke="rgba(255, 255, 255, 0.55)"
                          strokeWidth={1}
                        />
                        <text
                          x={pillWidth / 2}
                          y={16}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize={11.5}
                          fontWeight={600}
                        >
                          {isAtPeak
                            ? `Peak Risk: ${activePoint.riskScore.toFixed(1)}`
                            : `${activePoint.time.toFixed(1)}s · Risk: ${activePoint.riskScore.toFixed(1)}`}
                        </text>
                      </g>
                    );
                  },
                }}
              />
            )}

            <Tooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const pt = payload[0].payload as TemporalDataPoint;
                return (
                  <div className="rounded-2xl bg-[#0F1B3D]/95 text-white px-3.5 py-2.5 text-[11.5px] shadow-[0_14px_34px_rgba(15,27,61,0.34)] border border-white/25 tabular-nums">
                    <div className="font-semibold mb-1 text-white/95">
                      Timestamp: {pt.time.toFixed(1)}s
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#C4B5FD]">Risk Score:</span>
                      <span className="font-bold">{pt.riskScore.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#93C5FD]">Authenticity:</span>
                      <span className="font-bold">{pt.authenticity.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#5EEAD4]">Fraud Intent:</span>
                      <span className="font-bold">{pt.fraudIntent.toFixed(1)}</span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Authenticity Line (Blue) */}
            <Line
              type="monotone"
              dataKey="authenticity"
              stroke="#3B9BF0"
              strokeWidth={2}
              dot={{ r: 2.3, fill: '#3B9BF0', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#3B9BF0', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              animationDuration={450}
            />

            {/* Fraud Intent Line (Teal) */}
            <Line
              type="monotone"
              dataKey="fraudIntent"
              stroke="#14B89A"
              strokeWidth={2}
              dot={{ r: 2.3, fill: '#14B89A', strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#14B89A', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              animationDuration={450}
            />

            {/* Risk Score Line (Purple) */}
            <Line
              type="monotone"
              dataKey="riskScore"
              stroke="#8B5CF6"
              strokeWidth={2.2}
              dot={{ r: 2.4, fill: '#8B5CF6', strokeWidth: 0 }}
              activeDot={{ r: 4.5, fill: '#8B5CF6', stroke: '#FFFFFF', strokeWidth: 1.5 }}
              animationDuration={450}
            />

            {/* Highlighted Peak/Active Dot */}
            {activePoint && (
              <ReferenceDot
                x={activePoint.time}
                y={activePoint.riskScore}
                r={5}
                fill="#8B5CF6"
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
