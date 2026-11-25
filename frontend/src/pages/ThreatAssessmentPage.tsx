import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AudioWaveform, Check, Download, Loader2, Plus, Share2, Sparkles, UploadCloud } from 'lucide-react';
import type { ExportStatus } from '../App';
import type { AssessmentCase, AudioSegment, TopEngineStatus } from '../data';
import { AudioAnalysis } from '../components/AudioAnalysis';
import { EngineCard } from '../components/EngineCard';
import { SummaryCard } from '../components/SummaryCard';
import { TemporalChart } from '../components/TemporalChart';
import { ThreatGauge } from '../components/ThreatGauge';
import { TopBar } from '../components/TopBar';
import { TranscriptDrawer } from '../components/TranscriptDrawer';
import { findActiveSegment } from '../utils/forensics';
import { APP_SHORTCUTS, detectMacOS, formatShortcutBadge } from '../utils/shortcuts';

interface ThreatAssessmentPageProps {
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  exportStatus: ExportStatus;
  onSelectCase: (caseId: string) => void;
  onOpenNewAnalysis: () => void;
  onExportReport: () => void;
  onOpenEvidence: (caseId: string) => void;
  onResetWorkspace: () => void;
  onNotify: (message: string) => void;
  onPlaybackChange?: (playing: boolean) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function ThreatAssessmentPage({
  cases,
  activeCaseId,
  engineStatuses,
  exportStatus,
  onSelectCase,
  onOpenNewAnalysis,
  onExportReport,
  onOpenEvidence,
  onResetWorkspace,
  onNotify,
  onPlaybackChange,
}: ThreatAssessmentPageProps) {
  const activeCase = (cases.find((c) => c.id === activeCaseId) ?? cases[0]) as AssessmentCase | undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(0.75);
  const [selectedSegmentId, setSelectedSegmentId] = useState(activeCase?.segments?.[0]?.id ?? '');
  const [syncedTimeSec, setSyncedTimeSec] = useState(activeCase?.initialPlayheadSec ?? 0);
  const [hasUserScrubbed, setHasUserScrubbed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const isMac = useMemo(() => detectMacOS(), []);
  const newAnalysisBadge = useMemo(
    () => formatShortcutBadge(APP_SHORTCUTS.find((s) => s.id === 'new-analysis')!, isMac),
    [isMac],
  );
  const exportReportBadge = useMemo(
    () => formatShortcutBadge(APP_SHORTCUTS.find((s) => s.id === 'export-report')!, isMac),
    [isMac],
  );

  // Notify parent when audio playback state changes (and reset on unmount)
  useEffect(() => {
    onPlaybackChange?.(isPlaying);
    return () => {
      onPlaybackChange?.(false);
    };
  }, [isPlaying, onPlaybackChange]);

  // Sync selected segment and playhead cursor when switching cases
  useEffect(() => {
    if (!activeCase) return;
    setIsPlaying(false);
    setHasUserScrubbed(false);
    setSelectedSegmentId(activeCase.segments[0]?.id ?? '');
    setSyncedTimeSec(activeCase.initialPlayheadSec ?? 0);
  }, [activeCase?.id, activeCase?.initialPlayheadSec, activeCase?.segments]);

  const handleTogglePlay = useCallback(() => {
    setHasUserScrubbed(true);
    setIsPlaying((p) => !p);
  }, []);

  const handleStopPlayback = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const handleSegmentChange = useCallback(
    (segmentId: string) => {
      if (!activeCase) return;
      setHasUserScrubbed(true);
      setSelectedSegmentId(segmentId);
      const matched = activeCase.segments.find((s) => s.id === segmentId);
      if (matched) {
        setSyncedTimeSec(matched.startSec);
      }
    },
    [activeCase],
  );

  const handleTimeUpdate = useCallback((sec: number) => {
    setHasUserScrubbed(true);
    setSyncedTimeSec(sec);
  }, []);

  const handleSeekFromTranscript = useCallback((seg: AudioSegment) => {
    setHasUserScrubbed(true);
    setSelectedSegmentId(seg.id);
    setSyncedTimeSec(seg.startSec);
  }, []);

  const activeSegment = useMemo(() => {
    if (!activeCase || activeCase.segments.length === 0) return undefined;
    return (
      findActiveSegment(syncedTimeSec, activeCase.segments) ??
      activeCase.segments.find((s) => s.id === selectedSegmentId) ??
      activeCase.segments[0]
    );
  }, [syncedTimeSec, activeCase, selectedSegmentId]);

  const handleShare = async () => {
    if (!activeCase) return;
    const shareUrl = `${window.location.origin}/?case=${encodeURIComponent(activeCase.id)}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback when clipboard permission is unavailable
    }
    onNotify(`Case link copied (${activeCase.id})`);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 min-w-0 p-4 sm:p-5 lg:px-8 lg:py-5 relative z-10 max-w-[1460px] mx-auto w-full"
    >
      {/* Row 1: Top Bar with LIVE engine statuses */}
      <motion.div variants={itemVariants}>
        <TopBar
          statuses={engineStatuses}
          cases={cases}
          activeCaseId={activeCase?.id ?? ''}
          onSelectCase={onSelectCase}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onResetWorkspace={onResetWorkspace}
        />
      </motion.div>

      {/* Row 2: Page Header + Action Buttons */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4"
      >
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577] whitespace-nowrap">
              FORENSIC INTELLIGENCE PLATFORM
            </span>
          </div>

          <h1 className="font-serif-display text-[42px] sm:text-[48px] leading-[1.02] text-[#0F1B3D] tracking-[-0.015em]">
            Threat Assessment
          </h1>

          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] sm:text-[16.5px] text-[#475577] font-normal shrink-0">
              Analyze voice communications with multi-engine intelligence.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 pb-0.5">
          <button
            type="button"
            onClick={onOpenNewAnalysis}
            className="glass-pill rounded-full h-9.5 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <Plus className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
            <span>New Analysis</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/75 border border-white text-[10px] font-semibold text-[#5B6785]">
              {newAnalysisBadge}
            </kbd>
          </button>

          <AnimatePresence mode="popLayout" initial={false}>
            {exportStatus !== 'exported' ? (
              <motion.button
                key="export-report-button"
                type="button"
                layout
                disabled={exportStatus === 'pending'}
                onClick={onExportReport}
                initial={{ opacity: 0, scale: 0.94, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="glass-pill rounded-full h-9.5 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] whitespace-nowrap disabled:cursor-wait focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
              >
                {exportStatus === 'pending' ? (
                  <>
                    <Loader2 className="w-4 h-4 text-[#2563EB] animate-spin" aria-hidden="true" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#394563]" aria-hidden="true" />
                    <span>Export Report</span>
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/75 border border-white text-[10px] font-semibold text-[#5B6785]">
                      {exportReportBadge}
                    </kbd>
                  </>
                )}
              </motion.button>
            ) : (
              <motion.div
                key="export-report-done"
                layout
                role="status"
                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -4 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-full h-9.5 px-4 bg-[#CFF5E7]/90 border border-[#9EEBD0] inline-flex items-center gap-2 text-[13px] font-semibold text-[#0E9F7E] whitespace-nowrap shadow-sm"
              >
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Report Ready</span>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={handleShare}
            className="glass-pill rounded-full h-9.5 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <Share2 className="w-4 h-4 text-[#394563]" aria-hidden="true" />
            <span>Share</span>
          </button>
        </div>
      </motion.div>

      {/* Main Dashboard Grid or Clean Empty State */}
      {!activeCase ? (
        <motion.div
          variants={itemVariants}
          className="mt-6 flex flex-col items-center justify-center text-center p-12 sm:p-16 glass-card rounded-[28px] max-w-xl mx-auto shadow-sm border border-white/80"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center mb-4 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.9)]">
            <AudioWaveform className="w-8 h-8" />
          </div>
          <h2 className="text-[22px] font-semibold text-[#0F1B3D] mb-2 font-serif-display">
            No Voice Captures Ingested
          </h2>
          <p className="text-[14px] text-[#5B6785] max-w-md mb-6 leading-relaxed">
            The forensic pipeline is ready for live neural inference. Ingest or upload any raw audio recording (.wav, .mp3, .m4a) to generate real acoustic authenticity scores, Whisper transcription, and social engineering intent classification.
          </p>
          <button
            type="button"
            onClick={onOpenNewAnalysis}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#0F1B3D] hover:bg-[#1E3063] text-white text-[13.5px] font-semibold shadow-md transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Ingest Voice Audio</span>
            <kbd className="ml-1 inline-flex items-center px-2 py-0.5 rounded bg-white/20 text-[11px] font-semibold text-white">
              {newAnalysisBadge}
            </kbd>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Row 3: Audio Analysis (~65%) | Threat Score (~33%) */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 xl:grid-cols-[1.97fr_1fr] gap-4 items-stretch"
          >
            <AudioAnalysis
              caseId={activeCase.id}
              initialPlayheadSec={activeCase.initialPlayheadSec}
              syncedTimeSec={syncedTimeSec}
              durationSec={activeCase.durationSec}
              waveformSeed={activeCase.waveformSeed}
              customBars={activeCase.uploadedAudioSummary?.customBars}
              spectrogramColumns={activeCase.uploadedAudioSummary?.spectrogramColumns}
              hasSpoofArtifacts={
                activeCase.threatScore.riskLevel === 'CRITICAL' ||
                activeCase.threatScore.riskLevel === 'HIGH'
              }
              segments={activeCase.segments}
              isPlaying={isPlaying}
              playbackSpeed={playbackSpeed}
              volume={volume}
              selectedSegmentId={selectedSegmentId}
              zoomLevel={zoomLevel}
              isExpanded={isExpanded}
              onTogglePlay={handleTogglePlay}
              onStopPlayback={handleStopPlayback}
              onSegmentChange={handleSegmentChange}
              onTimeUpdate={handleTimeUpdate}
              onSpeedChange={setPlaybackSpeed}
              onVolumeChange={setVolume}
              onZoomIn={() => setZoomLevel((z) => Math.min(1.5, Number((z + 0.25).toFixed(2))))}
              onZoomOut={() => setZoomLevel((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
              onToggleExpand={() => setIsExpanded((e) => !e)}
            />

            <ThreatGauge
              score={activeCase.threatScore.score}
              riskLevel={activeCase.threatScore.riskLevel}
              evidenceSufficiency={activeCase.threatScore.evidenceSufficiency}
              uncertainty={activeCase.threatScore.uncertainty}
              rationale={activeCase.threatScore.rationale}
            />
          </motion.div>

          {/* Row 4: Four Engine Cards (A, B, C, D) */}
          <motion.div variants={itemVariants}>
            <EngineCard
              engines={activeCase.engines}
              isPlaying={isPlaying}
              activeSegment={activeSegment}
              onTogglePlayTranscript={handleTogglePlay}
              onOpenFullTranscript={() => setTranscriptOpen(true)}
            />
          </motion.div>

          {/* Row 5: Temporal Anomaly Analysis (~68%) | Threat Assessment Summary (~30%) */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 xl:grid-cols-[2.25fr_1fr] gap-4 items-stretch"
          >
            <TemporalChart
              data={activeCase.temporalSeries}
              syncedTimeSec={hasUserScrubbed ? syncedTimeSec : undefined}
            />
            <SummaryCard
              assessment={activeCase}
              onExportReport={onExportReport}
              onOpenEvidence={() => onOpenEvidence(activeCase.id)}
            />
          </motion.div>
        </div>
      )}

      {/* Synced Full Call Transcript Drawer */}
      {activeCase && (
        <TranscriptDrawer
          open={transcriptOpen}
          caseTitle={activeCase.title}
          caseId={activeCase.id}
          language={activeCase.engines.speechIntelligence.language}
          confidence={activeCase.engines.speechIntelligence.confidence}
          segments={activeCase.segments}
          syncedTimeSec={syncedTimeSec}
          onSeekToSegment={handleSeekFromTranscript}
          onClose={() => setTranscriptOpen(false)}
        />
      )}
    </motion.div>
  );
}
