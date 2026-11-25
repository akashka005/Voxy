import { useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import type { RiskLevel } from '../data';
import { computeLogoTilt, getLogoReactiveTheme } from '../utils/forensics';

interface VoxSentinelLogoProps {
  riskLevel?: RiskLevel;
  isAudioPlaying?: boolean;
  className?: string;
}

const HARMONIC_BARS = [
  { x: 15.5, baseH: 7.5, delay: '0s' },
  { x: 19.25, baseH: 12.5, delay: '0.1s' },
  { x: 23, baseH: 17, delay: '0.2s' },
  { x: 26.75, baseH: 12.5, delay: '0.3s' },
  { x: 30.5, baseH: 7.5, delay: '0.4s' },
];

export function VoxSentinelLogo({
  riskLevel = 'CRITICAL',
  isAudioPlaying = false,
  className = '',
}: VoxSentinelLogoProps) {
  const uid = useId().replace(/:/g, '');
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);

  const theme = getLogoReactiveTheme(riskLevel, isAudioPlaying);

  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const rawGlareX = useMotionValue(50);
  const rawGlareY = useMotionValue(35);

  const rotateX = useSpring(rawRotateX, { stiffness: 340, damping: 26 });
  const rotateY = useSpring(rawRotateY, { stiffness: 340, damping: 26 });
  const glareX = useSpring(rawGlareX, { stiffness: 280, damping: 28 });
  const glareY = useSpring(rawGlareY, { stiffness: 280, damping: 28 });

  const glareGradient = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.52) 0%, rgba(186,230,253,0.14) 42%, transparent 72%)`;

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const relX = (e.clientX - rect.left) / rect.width;
    const relY = (e.clientY - rect.top) / rect.height;
    const tilt = computeLogoTilt(relX, relY, 13);
    rawRotateX.set(tilt.rotateX);
    rawRotateY.set(tilt.rotateY);
    rawGlareX.set(tilt.glareX);
    rawGlareY.set(tilt.glareY);
  };

  const handlePointerEnter = () => {
    setIsHovered(true);
  };

  const handlePointerLeave = () => {
    setIsHovered(false);
    rawRotateX.set(0);
    rawRotateY.set(0);
    rawGlareX.set(50);
    rawGlareY.set(35);
  };

  const handleTriggerPulse = () => {
    setPulseCount((c) => c + 1);
  };

  const stateClass = isAudioPlaying ? 'is-playing' : isHovered ? 'is-hovered' : '';

  return (
    <motion.div
      ref={containerRef}
      data-testid="voxsentinel-logo"
      data-reactive-mode={theme.mode}
      data-hovered={isHovered ? 'true' : 'false'}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleTriggerPulse}
      style={{
        perspective: 360,
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
      }}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      className={`relative w-10 h-10 lg:w-11 lg:h-11 shrink-0 select-none ${className}`}
    >
      {/* Expanding click / activation sonar pulse */}
      <AnimatePresence>
        {pulseCount > 0 && (
          <motion.span
            key={pulseCount}
            aria-hidden="true"
            initial={{ scale: 0.85, opacity: 0.72 }}
            animate={{ scale: 1.65, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ borderColor: theme.accentHex }}
            className="pointer-events-none absolute inset-0 rounded-full border-2"
          />
        )}
      </AnimatePresence>

      {/* GPU-composited radial halo without runtime blur filter */}
      <span
        aria-hidden="true"
        style={{
          background: `radial-gradient(circle, ${theme.accentHex}48 0%, rgba(29,78,216,0.16) 52%, transparent 74%)`,
        }}
        className={`vox-logo-halo pointer-events-none absolute -inset-2 rounded-full ${stateClass}`}
      />

      {/* Precision SVG Sentinel Crest */}
      <svg
        viewBox="0 0 48 48"
        className="relative z-10 w-full h-full"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${uid}-crest-bg`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F1B3D" />
            <stop offset="52%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <linearGradient id={`${uid}-crest-rim`} x1="8" y1="4" x2="40" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
            <stop offset="50%" stopColor="rgba(186,230,253,0.48)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.82)" />
          </linearGradient>

          <linearGradient id={`${uid}-bars`} x1="24" y1="14" x2="24" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor={theme.accentHex} />
          </linearGradient>
        </defs>

        {/* Faceted octagonal sentinel shield silhouette */}
        <path
          d="M24 3.5L38.2 8.2C39.9 8.76 41 10.35 41 12.14V24.2C41 33.4 33.9 41.3 24 44.5C14.1 41.3 7 33.4 7 24.2V12.14C7 10.35 8.1 8.76 9.8 8.2L24 3.5Z"
          fill={`url(#${uid}-crest-bg)`}
          stroke={`url(#${uid}-crest-rim)`}
          strokeWidth="1.5"
        />

        {/* Subtle inner frosted bezel */}
        <path
          d="M24 6.6L35.8 10.5C37.1 10.95 38 12.18 38 13.56V24C38 31.6 32.1 38.2 24 41C15.9 38.2 10 31.6 10 24V13.56C10 12.18 10.9 10.95 12.2 10.5L24 6.6Z"
          fill="rgba(15, 27, 61, 0.28)"
          stroke="rgba(255, 255, 255, 0.24)"
          strokeWidth="0.9"
        />

        {/* CSS-composited rotating orbital telemetry scan reticle */}
        <g className={`vox-logo-reticle ${stateClass}`}>
          <circle
            cx="24"
            cy="24"
            r="12.6"
            stroke={theme.ringHex}
            strokeOpacity={isAudioPlaying || isHovered ? 0.88 : 0.58}
            strokeWidth="1.2"
            strokeDasharray="6 4 2 4"
            strokeLinecap="round"
          />
          <circle cx="24" cy="11.4" r="1.25" fill="#FFFFFF" />
        </g>

        {/* Protective acoustic V-chevron anchor under voice core */}
        <path
          d="M15.5 31.6L24 36.2L32.5 31.6"
          stroke="rgba(186,230,253,0.75)"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* GPU-composited 5-bar harmonic voice spectrum */}
        {HARMONIC_BARS.map((bar, idx) => {
          const yTop = 23.5 - bar.baseH / 2;
          return (
            <rect
              key={idx}
              x={bar.x}
              y={yTop}
              width="2.1"
              height={bar.baseH}
              rx="1.05"
              fill={`url(#${uid}-bars)`}
              style={{ animationDelay: bar.delay }}
              className={`vox-logo-bar ${stateClass}`}
            />
          );
        })}
      </svg>

      {/* Pointer-following dynamic glass specular glare */}
      <motion.div
        aria-hidden="true"
        style={{
          background: glareGradient,
          clipPath: 'polygon(50% 6%, 86% 18%, 86% 52%, 72% 79%, 50% 93%, 28% 79%, 14% 52%, 14% 18%)',
        }}
        animate={{ opacity: isHovered ? 0.9 : 0.35 }}
        transition={{ duration: 0.18 }}
        className="pointer-events-none absolute inset-0 z-20"
      />
    </motion.div>
  );
}
