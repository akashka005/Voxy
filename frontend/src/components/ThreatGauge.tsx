import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Sparkles } from 'lucide-react';
import type { RiskLevel } from '../data';
import { computeGaugeArc } from '../utils/forensics';

interface ThreatGaugeProps {
  score: number;
  riskLevel: RiskLevel;
  evidenceSufficiency: number;
  uncertainty: number;
  rationale: string;
}

export function ThreatGauge({
  score,
  riskLevel,
  evidenceSufficiency,
  uncertainty,
  rationale,
}: ThreatGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [barsMounted, setBarsMounted] = useState(false);

  useEffect(() => {
    setBarsMounted(false);
    const barTimer = requestAnimationFrame(() => setBarsMounted(true));

    const startTime = performance.now();
    const duration = 1200;
    const from = 0;
    const to = score;
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = Math.max(0, now - startTime);
      const t = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Number((from + (to - from) * eased).toFixed(1)));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(barTimer);
    };
  }, [score]);

  const { trackPath, activePath, knob } = computeGaugeArc(animatedScore, 92, 90, 68);

  const isCritical = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
  const badgeColors = isCritical
    ? 'bg-gradient-to-b from-[#FDD6DE] to-[#F9C0CD] text-[#D92D4A] border-[#F8AEBF] shadow-[0_8px_20px_rgba(239,68,68,0.22),inset_0_1.5px_0_rgba(255,255,255,0.75)]'
    : 'bg-gradient-to-b from-[#D7F7EC] to-[#BFEFE0] text-[#0E9F7E] border-[#9EEBD0] shadow-[0_8px_18px_rgba(20,184,154,0.18),inset_0_1.5px_0_rgba(255,255,255,0.8)]';

  return (
    <section
      aria-label="Threat Score"
      className="glass-card glass-card-hover p-4 sm:px-5 sm:py-4 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <Sparkles className="w-[18px] h-[18px] text-[#B08D57]" aria-hidden="true" />
        <h2 className="text-[16px] font-semibold text-[#0F1B3D]">Threat Score</h2>
      </div>

      {/* Main Split Body */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center flex-1">
        {/* Left: Semicircular 240° Gauge + Risk Badge */}
        <div className="sm:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-[172px] h-[140px] flex items-center justify-center">
            <svg viewBox="0 0 184 158" className="w-full h-full overflow-visible" aria-hidden="true">
              <defs>
                <linearGradient
                  id="threatGaugeGrad"
                  gradientUnits="userSpaceOnUse"
                  x1="24"
                  y1="126"
                  x2="160"
                  y2="68"
                >
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="38%" stopColor="#FBBF24" />
                  <stop offset="70%" stopColor="#F97316" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>

              {/* Subtle Telemetry Ring */}
              <circle
                cx="92"
                cy="90"
                r="56"
                fill="none"
                stroke="rgba(148, 163, 184, 0.26)"
                strokeWidth="1"
                strokeDasharray="3 7"
              />

              {/* Background Track */}
              <path
                d={trackPath}
                fill="none"
                stroke="rgba(186, 198, 224, 0.45)"
                strokeWidth="9"
                strokeLinecap="round"
              />

              {/* Active Gradient Arc */}
              <path
                d={activePath}
                fill="none"
                stroke="url(#threatGaugeGrad)"
                strokeWidth="9.5"
                strokeLinecap="round"
              />

              {/* Soft Knob Halo */}
              <circle
                cx={knob.x}
                cy={knob.y}
                r="10.5"
                fill={isCritical ? 'rgba(239, 68, 68, 0.22)' : 'rgba(20, 184, 154, 0.22)'}
              />

              {/* End Knob */}
              <circle
                cx={knob.x}
                cy={knob.y}
                r="6.2"
                fill={isCritical ? '#EF4444' : '#14B89A'}
                stroke="#FFFFFF"
                strokeWidth="2.4"
              />
            </svg>

            {/* Center Score Readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pt-3">
              <div
                data-testid="threat-score-value"
                className="text-[42px] leading-none font-bold text-[#0F1B3D] tracking-tight tabular-nums"
              >
                {animatedScore.toFixed(1)}
              </div>
              <div className="text-[13px] font-medium text-[#5B6785] mt-1 tabular-nums">
                /100
              </div>
            </div>
          </div>

          <div
            className={`mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-[12px] font-bold tracking-wider uppercase whitespace-nowrap ${badgeColors}`}
          >
            {isCritical ? (
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            )}
            <span>{riskLevel}</span>
          </div>
        </div>

        {/* Right: Metrics & Info Callout */}
        <div className="sm:col-span-6 flex flex-col justify-between gap-4 min-w-0">
          <div className="space-y-3.5">
            {/* Evidence Sufficiency */}
            <div>
              <div className="flex items-center justify-between gap-2 text-[13px] mb-1.5">
                <span className="font-medium text-[#2A3656] whitespace-nowrap">
                  Evidence Sufficiency
                </span>
                <span className="font-bold text-[#0F1B3D] tabular-nums shrink-0">
                  {evidenceSufficiency.toFixed(2)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#DCE6F7]/75 border border-white/80 overflow-hidden shadow-[inset_0_1px_2px_rgba(30,50,110,0.08)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#60A5FA] to-[#2563EB] transition-all duration-1000 ease-out"
                  style={{
                    width: barsMounted ? `${Math.round(evidenceSufficiency * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Uncertainty */}
            <div>
              <div className="flex items-center justify-between gap-2 text-[13px] mb-1.5">
                <span className="font-medium text-[#2A3656] whitespace-nowrap">Uncertainty</span>
                <span className="font-bold text-[#0F1B3D] tabular-nums shrink-0">
                  {uncertainty.toFixed(2)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#DCE6F7]/75 border border-white/80 overflow-hidden shadow-[inset_0_1px_2px_rgba(30,50,110,0.08)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] transition-all duration-1000 ease-out"
                  style={{
                    width: barsMounted ? `${Math.round(uncertainty * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Info Callout Box */}
          <div className="glass-inset-tile rounded-[16px] bg-[#E8F1FF]/65 px-3.5 py-2.5 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#47608E] shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-[12px] leading-[1.4] text-[#2A3656] font-medium">
              {rationale}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
