import { AnimatePresence, motion } from 'motion/react';
import { AudioWaveform, Clock, Play, X } from 'lucide-react';
import type { AudioSegment } from '../data';
import { findActiveSegment } from '../utils/forensics';

interface TranscriptDrawerProps {
  open: boolean;
  caseTitle: string;
  caseId: string;
  language: string;
  confidence: number;
  segments: AudioSegment[];
  syncedTimeSec: number;
  onSeekToSegment: (segment: AudioSegment) => void;
  onClose: () => void;
}

export function TranscriptDrawer({
  open,
  caseTitle,
  caseId,
  language,
  confidence,
  segments,
  syncedTimeSec,
  onSeekToSegment,
  onClose,
}: TranscriptDrawerProps) {
  const activeSeg = findActiveSegment(syncedTimeSec, segments);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transcript-drawer-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex justify-end bg-[#0F1B3D]/24"
        >
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="w-full max-w-md h-full bg-gradient-to-b from-[#F8FAFF] via-[#F2F5FE] to-[#EAF0FC] border-l border-white shadow-[-20px_0_60px_rgba(15,27,61,0.2),inset_1.5px_0_0_rgba(255,255,255,0.95)] flex flex-col overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-white/85 flex items-start justify-between gap-3 bg-white/65">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#7C3AED] mb-1">
                  <AudioWaveform className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Full Call Transcript · {caseId}</span>
                </div>
                <h2
                  id="transcript-drawer-title"
                  className="text-[18px] font-semibold text-[#0F1B3D] truncate"
                >
                  {caseTitle}
                </h2>
                <div className="mt-1 flex items-center gap-3 text-[12px] text-[#5B6785]">
                  <span>Language: <strong className="text-[#0F1B3D]">{language}</strong></span>
                  <span>ASR Confidence: <strong className="text-[#0F1B3D]">{confidence}%</strong></span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close transcript drawer"
                className="glass-lens-orb w-9 h-9 rounded-full flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <div className="glass-inset-tile rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-[12px]">
                <span className="text-[#5B6785] inline-flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#3B9BF0]" />
                  Synced Playhead Cursor
                </span>
                <span className="font-bold text-[#0F1B3D] tabular-nums">
                  {syncedTimeSec.toFixed(1)}s
                </span>
              </div>

              {segments.map((seg) => {
                const isActive = activeSeg?.id === seg.id;
                const segSpan = Math.max(0.1, seg.endSec - seg.startSec);
                const localProgress = isActive
                  ? Math.max(0, Math.min(1, (syncedTimeSec - seg.startSec) / segSpan))
                  : syncedTimeSec > seg.endSec
                    ? 1
                    : 0;
                const words = seg.transcriptSnippet.split(/\s+/);
                const activeWordIdx = isActive
                  ? Math.min(words.length - 1, Math.floor(localProgress * words.length))
                  : -1;

                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => onSeekToSegment(seg)}
                    className={`w-full text-left rounded-[20px] p-4 border transition-all ${
                      isActive
                        ? 'bg-gradient-to-b from-white/95 to-[#F3EEFF]/85 border-[#A78BFA] shadow-[0_10px_26px_rgba(124,58,237,0.14),inset_0_1.5px_0_rgba(255,255,255,1)]'
                        : 'glass-inset-tile hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                          isActive
                            ? 'bg-[#7C3AED] text-white'
                            : 'bg-white/80 text-[#475577] border border-white'
                        }`}
                      >
                        {seg.label}
                      </span>
                      <span className="text-[11px] font-medium text-[#5B6785] inline-flex items-center gap-1">
                        <Play className="w-3 h-3 text-[#2563EB]" />
                        Jump to window
                      </span>
                    </div>

                    <p className="text-[14px] leading-[1.55] text-[#0F1B3D] font-medium">
                      “
                      {words.map((word, wIdx) => {
                        const highlighted = isActive && wIdx <= activeWordIdx;
                        return (
                          <span
                            key={`${seg.id}-w-${wIdx}`}
                            className={`transition-colors ${
                              highlighted
                                ? wIdx === activeWordIdx
                                  ? 'bg-[#DDD6FE] text-[#4C1D95] rounded px-1 py-0.5 font-semibold'
                                  : 'text-[#1D4ED8]'
                                : ''
                            }`}
                          >
                            {word}
                            {wIdx < words.length - 1 ? ' ' : ''}
                          </span>
                        );
                      })}
                      ”
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-[#0F1B3D]/[0.06] text-[11.5px] font-medium text-[#5B6785]">
                      Signal Note: <span className="text-[#2A3656]">{seg.riskNote}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
