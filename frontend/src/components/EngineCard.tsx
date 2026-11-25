import {
  AlertTriangle,
  AudioWaveform,
  FileText,
  Info,
  Pause,
  Play,
  Shield,
  User,
} from 'lucide-react';
import type { AssessmentCase, AudioSegment, EngineAvailability } from '../data';

function StatusBadge({ status }: { status: EngineAvailability }) {
  const isAvailable = status === 'AVAILABLE';
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 whitespace-nowrap border shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ${
        isAvailable
          ? 'bg-[#CFF5E7]/92 border-[#9FEAD0]/70 text-[#0E9F7E]'
          : 'bg-[#FDE6B8]/92 border-[#F8D08A]/70 text-[#B7791F]'
      }`}
    >
      {status}
    </span>
  );
}

interface EngineCardsGridProps {
  engines: AssessmentCase['engines'];
  isPlaying: boolean;
  activeSegment?: AudioSegment | null;
  onTogglePlayTranscript: () => void;
  onOpenFullTranscript?: () => void;
}

export function EngineCard({
  engines,
  isPlaying,
  activeSegment,
  onTogglePlayTranscript,
  onOpenFullTranscript,
}: EngineCardsGridProps) {
  const { voiceAuthenticity, speakerVerification, speechIntelligence, fraudIntent } = engines;

  // Build SVG sparkline for Engine A
  const sparkWidth = 230;
  const sparkHeight = 28;
  const maxSpark = 50;
  const sparkPoints = voiceAuthenticity.sparkline.map((pt, idx) => {
    const x = 6 + (idx / Math.max(1, voiceAuthenticity.sparkline.length - 1)) * (sparkWidth - 12);
    const normalized = Math.min(1, Math.max(0, pt.value / Math.max(maxSpark, pt.value + 10)));
    const y = sparkHeight - 5 - normalized * (sparkHeight - 10);
    return { x, y };
  });

  const sparkPath = sparkPoints.reduce((acc, p, idx, arr) => {
    if (idx === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = arr[idx - 1];
    const cx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${cx} ${prev.y.toFixed(1)}, ${cx} ${p.y.toFixed(1)}, ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');

  const displayedTranscript = activeSegment
    ? `“${activeSegment.transcriptSnippet}”`
    : speechIntelligence.transcript;

  return (
    <section
      aria-label="Multi-Engine Intelligence Cards"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      {/* Card A: Voice Authenticity */}
      <article className="glass-card glass-card-hover engine-card-a px-4.5 py-4 flex flex-col justify-between min-h-[184px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#14B89A]/15 border border-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
              <Shield className="w-[17px] h-[17px] text-[#0E9F7E]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-semibold text-[#0F1B3D] leading-snug">
                A. Voice Authenticity
              </h3>
              <p className="text-[12px] text-[#5B6785] leading-tight">Anti-Spoofing</p>
            </div>
          </div>
          <StatusBadge status={voiceAuthenticity.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 my-2 items-center relative">
          <div>
            <div className="text-[28px] leading-none font-bold text-[#0F1B3D] tabular-nums">
              {voiceAuthenticity.syntheticProbability.toFixed(1)}%
            </div>
            <div className="text-[11.5px] font-medium text-[#5B6785] mt-1">
              Synthetic Probability
            </div>
          </div>

          <div className="border-l border-[#0F1B3D]/10 pl-3.5">
            <div className="text-[28px] leading-none font-bold text-[#0F1B3D] tabular-nums">
              {voiceAuthenticity.confidence}%
            </div>
            <div className="text-[11.5px] font-medium text-[#5B6785] mt-1">Confidence</div>
          </div>
        </div>

        <div>
          <svg
            viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
            className="w-full h-7 overflow-visible"
            aria-hidden="true"
          >
            <path
              d={sparkPath}
              fill="none"
              stroke="#14B89A"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {sparkPoints.map((pt, idx) => (
              <circle
                key={idx}
                cx={pt.x}
                cy={pt.y}
                r="2.3"
                fill="#14B89A"
                stroke="#FFFFFF"
                strokeWidth="1"
              />
            ))}
          </svg>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[#475577] mt-0.5">
            <Info className="w-3.5 h-3.5 text-[#5B6785] shrink-0" aria-hidden="true" />
            <span className="truncate">Model: {voiceAuthenticity.model}</span>
          </div>
        </div>
      </article>

      {/* Card B: Speaker Verification */}
      <article className="glass-card glass-card-hover engine-card-b px-4.5 py-4 flex flex-col justify-between min-h-[184px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#F59E0B]/15 border border-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
              <User className="w-[17px] h-[17px] text-[#D97706]" aria-hidden="true" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#0F1B3D] leading-snug min-w-0">
              B. Speaker Verification
            </h3>
          </div>
          <StatusBadge status={speakerVerification.status} />
        </div>

        <div className="flex flex-col items-center justify-center my-1.5 text-center">
          {speakerVerification.status === 'AVAILABLE' && speakerVerification.matchedSpeaker ? (
            <>
              <div className="text-[19px] font-bold text-[#0F1B3D]">
                {speakerVerification.matchedSpeaker}
              </div>
              <div className="text-[12.5px] text-[#5B6785] mt-1">
                Status:{' '}
                <span className="font-bold text-[#0E9F7E]">
                  {speakerVerification.inconclusiveLabel}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="text-[30px] font-bold text-[#0F1B3D] leading-none tracking-widest">
                —
              </div>
              <div className="text-[13px] text-[#5B6785] mt-1.5">
                Status:{' '}
                <span className="font-bold text-[#D97706]">
                  {speakerVerification.inconclusiveLabel}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="glass-inset-tile rounded-[16px] px-3 py-2 flex items-start gap-2">
          <Info className="w-4 h-4 text-[#5B6785] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-[11.5px] leading-[1.35] text-[#394563]">
            {speakerVerification.note}
          </p>
        </div>
      </article>

      {/* Card C: Speech Intelligence (ASR) */}
      <article className="glass-card glass-card-hover engine-card-c px-4.5 py-4 flex flex-col justify-between min-h-[184px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#8B5CF6]/15 border border-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
              <AudioWaveform className="w-[17px] h-[17px] text-[#7C3AED]" aria-hidden="true" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#0F1B3D] leading-snug">
              C. Speech Intelligence
              <span className="block">(ASR)</span>
            </h3>
          </div>
          <StatusBadge status={speechIntelligence.status} />
        </div>

        <div className="grid grid-cols-2 gap-3 my-1.5 items-center">
          <div>
            <div className="text-[28px] leading-none font-bold text-[#0F1B3D]">
              {speechIntelligence.language}
            </div>
            <div className="text-[11.5px] font-medium text-[#5B6785] mt-1">Language</div>
          </div>

          <div className="border-l border-[#0F1B3D]/10 pl-3.5">
            <div className="text-[28px] leading-none font-bold text-[#0F1B3D] tabular-nums">
              {speechIntelligence.confidence}%
            </div>
            <div className="text-[11.5px] font-medium text-[#5B6785] mt-1">Confidence</div>
          </div>
        </div>

        <div className="glass-inset-tile rounded-[16px] px-3 py-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-[11.5px] leading-[1.35] text-[#2A3656] line-clamp-2 flex-1"
              data-testid="card-c-transcript"
            >
              {displayedTranscript}
            </p>
            <button
              type="button"
              onClick={onTogglePlayTranscript}
              aria-label={isPlaying ? 'Pause transcript audio' : 'Play transcript audio'}
              className="glass-lens-orb w-8 h-8 rounded-full flex items-center justify-center text-[#0F1B3D] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-[#0F1B3D]" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-[#0F1B3D] ml-0.5" />
              )}
            </button>
          </div>
          {onOpenFullTranscript && (
            <div className="flex items-center justify-between pt-0.5 border-t border-[#0F1B3D]/[0.06]">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#7C3AED] tabular-nums">
                {activeSegment ? activeSegment.label : 'Full Call'}
              </span>
              <button
                type="button"
                onClick={onOpenFullTranscript}
                aria-label="Open full call transcript"
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] focus:outline-none focus-visible:underline"
              >
                <FileText className="w-3 h-3" aria-hidden="true" />
                <span>Full Transcript</span>
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Card D: Fraud Intent & Social Engineering */}
      <article className="glass-card glass-card-hover engine-card-d px-4.5 py-4 flex flex-col justify-between min-h-[184px]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#EF4444]/15 border border-white/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[17px] h-[17px] text-[#DC2626]" aria-hidden="true" />
            </div>
            <h3 className="text-[14px] font-semibold text-[#0F1B3D] leading-snug">
              D. Fraud Intent &amp;
              <span className="block">Social Engineering</span>
            </h3>
          </div>
          <StatusBadge status={fraudIntent.status} />
        </div>

        <div className="flex items-center justify-between gap-2 my-auto pt-2 min-w-0">
          <div className="shrink-0">
            <div className="text-[23px] 2xl:text-[30px] leading-none font-bold text-[#0F1B3D] tabular-nums">
              {fraudIntent.confidence}%
            </div>
            <div className="text-[11px] 2xl:text-[11.5px] font-medium text-[#5B6785] mt-1">
              Confidence
            </div>
          </div>

          <div className="flex flex-col items-start gap-1.5 min-w-0 flex-1">
            {fraudIntent.indicators.map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate px-1.5 2xl:px-2.5 py-0.5 rounded-full bg-[#FBD5DD]/92 border border-white/65 text-[#C81E3A] text-[8.8px] 2xl:text-[10px] font-bold uppercase tracking-[0.01em] 2xl:tracking-[0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                title={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
