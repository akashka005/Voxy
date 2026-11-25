import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { SIDEBAR_NAV_ITEMS, SIDEBAR_SPARKLINE } from '../data';
import type { RiskLevel } from '../data';
import { AnimatedNavIcon } from './AnimatedNavIcon';
import { VoxSentinelLogo } from './VoxSentinelLogo';

interface SidebarProps {
  activeRiskLevel?: RiskLevel;
  isAudioPlaying?: boolean;
}

export function Sidebar({ activeRiskLevel = 'CRITICAL', isAudioPlaying = false }: SidebarProps) {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const width = 188;
  const height = 42;
  const maxVal = 76;
  const points = SIDEBAR_SPARKLINE.map((pt, idx) => {
    const x = (idx / (SIDEBAR_SPARKLINE.length - 1)) * width;
    const y = height - (pt.value / maxVal) * (height - 8) - 4;
    return { x, y };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <aside
      aria-label="Primary Sidebar"
      className="glass-sidebar shrink-0 w-[76px] lg:w-[260px] flex flex-col justify-between py-5 px-3 lg:px-5 h-screen sticky top-0 z-20 transition-[width] duration-200"
    >
      <div>
        {/* Brand Header */}
        <NavLink
          to="/"
          title="VoxSentinel — Detect. Verify. Protect."
          aria-label="VoxSentinel Detect. Verify. Protect."
          className="flex items-center justify-center lg:justify-start gap-3 px-1 lg:px-1.5 mb-4 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0] rounded-xl"
        >
          <VoxSentinelLogo riskLevel={activeRiskLevel} isAudioPlaying={isAudioPlaying} />
          <div className="hidden lg:block min-w-0">
            <div className="font-serif-display text-[24px] leading-tight text-[#0F1B3D] tracking-[-0.01em] whitespace-nowrap transition-colors group-hover:text-[#1D4ED8]">
              VoxSentinel
            </div>
            <div className="text-[12px] text-[#5B6785] leading-tight whitespace-nowrap">
              Detect. Verify. Protect.
            </div>
          </div>
        </NavLink>

        <div
          aria-hidden="true"
          className="hidden lg:block h-[1px] mx-1.5 mb-4 bg-gradient-to-r from-[#0F1B3D]/10 via-[#0F1B3D]/5 to-transparent"
        />

        {/* Navigation Links with Shared Layout Active Pill + Bespoke Animated Icons */}
        <nav aria-label="Main navigation" className="space-y-1.5 relative">
          {SIDEBAR_NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={item.label}
              onPointerEnter={() => setHoveredPath(item.path)}
              onPointerLeave={() => setHoveredPath((prev) => (prev === item.path ? null : prev))}
              className={({ isActive }) =>
                `relative h-12 flex items-center justify-center lg:justify-start gap-3.5 px-2.5 lg:px-4 rounded-2xl text-[15px] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0] whitespace-nowrap ${
                  isActive
                    ? 'text-[#0F1B3D] font-semibold'
                    : 'text-[#394563] font-medium hover:bg-white/48 hover:text-[#0F1B3D]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/95 to-white/74 shadow-[0_10px_24px_-6px_rgba(37,99,235,0.18),0_2px_6px_rgba(15,27,61,0.04),inset_0_1.5px_0_rgba(255,255,255,1)] border border-white/90 -z-10"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center">
                    <AnimatedNavIcon
                      name={item.iconName}
                      active={isActive}
                      hovered={hoveredPath === item.path}
                      isAudioPlaying={isAudioPlaying}
                    />
                  </span>
                  <span className="hidden lg:inline truncate relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom System Status Card */}
      <div className="mt-6">
        <NavLink
          to="/telemetry"
          className="hidden lg:block glass-inset-tile rounded-[20px] p-3.5 hover:bg-white/78 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B89A] opacity-55" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#14B89A] shadow-[0_0_8px_rgba(20,184,154,0.65)]" />
            </span>
            <span className="text-[13.5px] font-semibold text-[#0F1B3D] whitespace-nowrap">
              System Online
            </span>
          </div>
          <p className="text-[11.5px] text-[#5B6785] mt-0.5 pl-[18px]">
            All Engines Operational
          </p>

          <div className="mt-2.5 pt-1">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-[42px] overflow-visible"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="sidebarSparkArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14B89A" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#14B89A" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <line x1="0" y1={height - 1} x2={width} y2={height - 1} stroke="rgba(148,163,184,0.28)" strokeWidth="1" />
              <path d={areaPath} fill="url(#sidebarSparkArea)" />
              <path d={linePath} fill="none" stroke="#14B89A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r="2.1"
                  fill="#14B89A"
                  stroke="#FFFFFF"
                  strokeWidth="0.9"
                />
              ))}
            </svg>
          </div>
        </NavLink>

        {/* Collapsed tablet indicator */}
        <NavLink
          to="/telemetry"
          className="lg:hidden flex justify-center mb-2"
          title="System Online: All Engines Operational"
          aria-label="System Telemetry"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#14B89A] opacity-55" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#14B89A]" />
          </span>
        </NavLink>

        <div className="hidden lg:block text-center text-[11px] text-[#5B6785] mt-3.5 tracking-tight">
          v1.0.0 • VoxSentinel
        </div>
      </div>
    </aside>
  );
}
