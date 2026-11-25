import { motion } from 'motion/react';
import type { NavItemConfig } from '../data';

interface AnimatedNavIconProps {
  name: NavItemConfig['iconName'];
  active: boolean;
  hovered: boolean;
  isAudioPlaying?: boolean;
}

export function AnimatedNavIcon({
  name,
  active,
  hovered,
  isAudioPlaying = false,
}: AnimatedNavIconProps) {
  const colorClass = active ? 'text-[#2563EB]' : hovered ? 'text-[#0F1B3D]' : 'text-[#475577]';
  const animateState = active ? 'active' : hovered ? 'hovered' : 'idle';

  return (
    <motion.span
      data-testid={`nav-icon-${name}`}
      data-icon-state={animateState}
      className={`inline-flex items-center justify-center w-[19px] h-[19px] shrink-0 transition-colors duration-150 ${colorClass}`}
      animate={{
        scale: active ? 1.08 : hovered ? 1.1 : 1,
        y: hovered && !active ? -1 : 0,
      }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      {name === 'home' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <path
            d="M3 10.5L12 3L21 10.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V10.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9 21V13C9 12.45 9.45 12 10 12H14C14.55 12 15 12.45 15 13V21"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`vox-icon-door ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
        </svg>
      )}

      {name === 'waveform' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <line
            x1="3"
            y1="12"
            x2="3"
            y2="12"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
            className={`vox-icon-wave-bar vox-wave-1 ${active ? 'is-active' : hovered ? 'is-hovered' : ''} ${isAudioPlaying ? 'is-playing' : ''}`}
          />
          <line
            x1="7.5"
            y1="7"
            x2="7.5"
            y2="17"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-wave-bar vox-wave-2 ${active ? 'is-active' : hovered ? 'is-hovered' : ''} ${isAudioPlaying ? 'is-playing' : ''}`}
          />
          <line
            x1="12"
            y1="4"
            x2="12"
            y2="20"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-wave-bar vox-wave-3 ${active ? 'is-active' : hovered ? 'is-hovered' : ''} ${isAudioPlaying ? 'is-playing' : ''}`}
          />
          <line
            x1="16.5"
            y1="7"
            x2="16.5"
            y2="17"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-wave-bar vox-wave-4 ${active ? 'is-active' : hovered ? 'is-hovered' : ''} ${isAudioPlaying ? 'is-playing' : ''}`}
          />
          <line
            x1="21"
            y1="10"
            x2="21"
            y2="14"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-wave-bar vox-wave-5 ${active ? 'is-active' : hovered ? 'is-hovered' : ''} ${isAudioPlaying ? 'is-playing' : ''}`}
          />
        </svg>
      )}

      {name === 'history' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <g className={`vox-icon-history-ring ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}>
            <path
              d="M3 12A9 9 0 1 0 6 5.3L3 8"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 3V8H8"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
          <path
            d="M12 7.5V12L15.2 13.8"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`vox-icon-clock-hand ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
        </svg>
      )}

      {name === 'reports' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <path
            d="M14 2.5H6C4.9 2.5 4 3.4 4 4.5V19.5C4 20.6 4.9 21.5 6 21.5H18C19.1 21.5 20 20.6 20 19.5V8.5L14 2.5Z"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 2.5V8.5H20"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="8.5"
            y1="13"
            x2="15.5"
            y2="13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className={`vox-icon-doc-line vox-doc-1 ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
          <line
            x1="8.5"
            y1="16.8"
            x2="13.5"
            y2="16.8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className={`vox-icon-doc-line vox-doc-2 ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
        </svg>
      )}

      {name === 'users' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <g className={`vox-icon-user-primary ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}>
            <circle cx="9.2" cy="7.5" r="3.4" stroke="currentColor" strokeWidth="1.9" />
            <path
              d="M3.2 20V18.4C3.2 15.8 5.3 13.7 7.9 13.7H10.5C13.1 13.7 15.2 15.8 15.2 18.4V20"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </g>
          <g className={`vox-icon-user-secondary ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}>
            <path
              d="M15.8 4.4C17.4 4.8 18.6 6.2 18.6 7.8C18.6 9.4 17.4 10.8 15.8 11.2"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            <path
              d="M17.2 14.1C19.3 14.6 20.8 16.4 20.8 18.6V20"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
            />
          </g>
        </svg>
      )}

      {name === 'telemetry' && (
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] overflow-visible" fill="none" aria-hidden="true">
          <path
            d="M3.5 3.5V19.5H20.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line
            x1="8.5"
            y1="16.5"
            x2="8.5"
            y2="11.5"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-eq-bar vox-eq-1 ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
          <line
            x1="13"
            y1="16.5"
            x2="13"
            y2="6.5"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-eq-bar vox-eq-2 ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
          <line
            x1="17.5"
            y1="16.5"
            x2="17.5"
            y2="9.5"
            stroke="currentColor"
            strokeWidth="2.0"
            strokeLinecap="round"
            className={`vox-icon-eq-bar vox-eq-3 ${active ? 'is-active' : hovered ? 'is-hovered' : ''}`}
          />
        </svg>
      )}
    </motion.span>
  );
}
