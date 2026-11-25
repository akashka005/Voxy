import type { MutableRefObject } from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AudioWaveform,
  ChevronDown,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AudioSegment } from '../data';
import {
  generateDeterministicSpectrogram,
  getDecodedAudioBuffer,
} from '../utils/audioAnalyzer';
import {
  computeFrequencyBarScale,
  findActiveSegment,
  formatDuration,
  generateWaveformBars,
} from '../utils/forensics';

export type AudioViewMode = 'waveform' | 'spectrogram';

interface AudioAnalysisProps {
  caseId: string;
  initialPlayheadSec: number;
  syncedTimeSec?: number;
  durationSec: number;
  waveformSeed: number;
  customBars?: number[];
  spectrogramColumns?: number[][];
  hasSpoofArtifacts?: boolean;
  segments: AudioSegment[];
  isPlaying: boolean;
  playbackSpeed: number;
  volume: number;
  selectedSegmentId: string;
  zoomLevel: number;
  isExpanded: boolean;
  onTogglePlay: () => void;
  onStopPlayback: () => void;
  onSegmentChange: (segmentId: string) => void;
  onTimeUpdate?: (sec: number) => void;
  onSpeedChange: (speed: number) => void;
  onVolumeChange: (vol: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onToggleExpand: () => void;
}

const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

function resampleBars(source: number[], targetCount: number): number[] {
  if (source.length === targetCount) return source;
  return Array.from({ length: targetCount }, (_, i) => {
    const idx = Math.min(source.length - 1, Math.floor((i / targetCount) * source.length));
    return source[idx] ?? 0.25;
  });
}

function getSpectrogramPaletteColor(intensity: number): [number, number, number, number] {
  const v = Math.max(0, Math.min(1, intensity));
  if (v < 0.28) {
    const t = v / 0.28;
    return [
      Math.round(22 + t * 18),
      Math.round(36 + t * 54),
      Math.round(88 + t * 105),
      Math.round(90 + t * 120),
    ];
  }
  if (v < 0.58) {
    const t = (v - 0.28) / 0.3;
    return [
      Math.round(40 - t * 18),
      Math.round(90 + t * 112),
      Math.round(193 + t * 52),
      230,
    ];
  }
  if (v < 0.82) {
    const t = (v - 0.58) / 0.24;
    return [
      Math.round(22 + t * 222),
      Math.round(202 - t * 22),
      Math.round(245 - t * 180),
      245,
    ];
  }
  const t = (v - 0.82) / 0.18;
  return [
    244,
    Math.round(180 - t * 112),
    Math.round(65 + t * 35),
    255,
  ];
}

const WaveformBars = memo(function WaveformBars({
  bars,
  barCount,
  svgRef,
}: {
  bars: number[];
  barCount: number;
  svgRef: MutableRefObject<SVGSVGElement | null>;
}) {
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${barCount * 3} 96`}
      preserveAspectRatio="none"
      className="w-full h-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="waveformBarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#2563EB" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <line
        x1="0"
        y1="48"
        x2={barCount * 3}
        y2="48"
        stroke="rgba(59, 130, 246, 0.25)"
        strokeWidth="0.8"
      />
      {bars.map((amp, i) => {
        const barHeight = Math.min(72, Math.max(4, amp * 64));
        const y = 48 - barHeight / 2;
        return (
          <rect
            key={i}
            data-waveform-bar={i}
            x={i * 3 + 0.5}
            y={y}
            width="1.8"
            height={barHeight}
            rx="0.9"
            fill="url(#waveformBarGrad)"
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
            }}
          />
        );
      })}
    </svg>
  );
});

export function AudioAnalysis({
  caseId,
  initialPlayheadSec,
  syncedTimeSec,
  durationSec,
  waveformSeed,
  customBars,
  spectrogramColumns,
  hasSpoofArtifacts = true,
  segments,
  isPlaying,
  playbackSpeed,
  volume,
  selectedSegmentId,
  zoomLevel,
  isExpanded,
  onTogglePlay,
  onStopPlayback,
  onSegmentChange,
  onTimeUpdate,
  onSpeedChange,
  onVolumeChange,
  onZoomIn,
  onZoomOut,
  onToggleExpand,
}: AudioAnalysisProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rectNodesRef = useRef<SVGRectElement[]>([]);

  const [viewMode, setViewMode] = useState<AudioViewMode>('waveform');
  const [currentTimeSec, setCurrentTimeSec] = useState(initialPlayheadSec);
  const liveTimeRef = useRef(initialPlayheadSec);
  const phaseSecRef = useRef(0);
  const lastSyncEmitRef = useRef(0);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;

  // Web Audio real AudioBuffer playback & live FFT AnalyserNode refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const fftBinsRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const barCount = Math.round(220 * zoomLevel);
  const bars = useMemo(() => {
    if (customBars && customBars.length > 0) {
      return resampleBars(customBars, barCount);
    }
    return generateWaveformBars(barCount, waveformSeed);
  }, [barCount, waveformSeed, customBars]);

  const barsRef = useRef(bars);
  barsRef.current = bars;

  const spectrogramMatrix = useMemo(() => {
    if (spectrogramColumns && spectrogramColumns.length > 0) {
      return spectrogramColumns;
    }
    return generateDeterministicSpectrogram(waveformSeed, 96, 28, hasSpoofArtifacts);
  }, [spectrogramColumns, waveformSeed, hasSpoofArtifacts]);

  // Cache SVG bar DOM nodes whenever bar count, seed, or viewMode changes
  useEffect(() => {
    if (viewMode !== 'waveform' || !svgRef.current) {
      rectNodesRef.current = [];
      return;
    }
    rectNodesRef.current = Array.from(
      svgRef.current.querySelectorAll<SVGRectElement>('rect[data-waveform-bar]'),
    );
  }, [bars, viewMode]);

  // Render high-DPI Mel-Spectrogram onto canvas when in spectrogram mode
  useEffect(() => {
    if (viewMode !== 'spectrogram') return;
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cols = spectrogramMatrix.length;
    const bands = spectrogramMatrix[0]?.length ?? 0;
    if (cols === 0 || bands === 0) return;

    const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
    const rect = canvas.getBoundingClientRect();
    const targetW = Math.max(320, Math.round((rect.width || 640) * dpr));
    const targetH = Math.max(84, Math.round((rect.height || 100) * dpr));
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.clearRect(0, 0, targetW, targetH);
    const cellW = targetW / cols;
    const cellH = targetH / bands;

    for (let c = 0; c < cols; c++) {
      const col = spectrogramMatrix[c];
      for (let b = 0; b < bands; b++) {
        const [r, g, bl, a] = getSpectrogramPaletteColor(col[b] ?? 0.05);
        ctx.fillStyle = `rgba(${r}, ${g}, ${bl}, ${(a / 255).toFixed(2)})`;
        const x = Math.floor(c * cellW);
        const y = Math.floor((bands - 1 - b) * cellH);
        ctx.fillRect(x, y, Math.ceil(cellW) + 0.6, Math.ceil(cellH) + 0.6);
      }
    }

    // Subtle horizontal frequency reference grid lines (4 kHz vocoder boundary)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.setLineDash([4 * dpr, 4 * dpr]);
    ctx.beginPath();
    ctx.moveTo(0, targetH * 0.5);
    ctx.lineTo(targetW, targetH * 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [viewMode, spectrogramMatrix, isExpanded]);

  // Reset playhead cleanly when switching cases
  useEffect(() => {
    liveTimeRef.current = initialPlayheadSec;
    setCurrentTimeSec(initialPlayheadSec);
    if (playheadRef.current) {
      const pct = Math.max(0, Math.min(100, (initialPlayheadSec / durationSec) * 100));
      playheadRef.current.style.transform = `translate3d(${pct}%, 0, 0)`;
    }
  }, [caseId, initialPlayheadSec, durationSec]);

  // Sync playhead when parent updates syncedTimeSec externally (e.g. clicking inside TranscriptDrawer)
  useEffect(() => {
    if (typeof syncedTimeSec !== 'number' || isPlaying) return;
    if (Math.abs(syncedTimeSec - liveTimeRef.current) < 0.02) return;
    const clamped = Math.max(0, Math.min(durationSec, syncedTimeSec));
    liveTimeRef.current = clamped;
    setCurrentTimeSec(clamped);
    if (playheadRef.current) {
      const pct = Math.max(0, Math.min(100, (clamped / durationSec) * 100));
      playheadRef.current.style.transform = `translate3d(${pct.toFixed(3)}%, 0, 0)`;
    }
  }, [syncedTimeSec, durationSec, isPlaying]);

  // Update real AudioBuffer Gain & PlaybackRate immediately when user tweaks sliders
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.playbackRate.value = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Start/stop real decoded AudioBuffer + AnalyserNode when available
  useEffect(() => {
    const cleanupAudioNodes = () => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.onended = null;
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        } catch {
          // Already stopped
        }
        sourceNodeRef.current = null;
      }
      analyserNodeRef.current = null;
      gainNodeRef.current = null;
      fftBinsRef.current = null;
    };

    if (!isPlaying) {
      cleanupAudioNodes();
      return;
    }

    const decodedBuffer = getDecodedAudioBuffer(caseId);
    if (!decodedBuffer) {
      cleanupAudioNodes();
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const source = ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.playbackRate.value = playbackSpeed;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;

      const gain = ctx.createGain();
      gain.gain.value = volumeRef.current;

      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);

      const offsetSec =
        liveTimeRef.current >= durationSec - 0.05 ? 0 : Math.max(0, liveTimeRef.current);
      source.start(0, Math.min(offsetSec, Math.max(0, decodedBuffer.duration - 0.02)));

      sourceNodeRef.current = source;
      analyserNodeRef.current = analyser;
      gainNodeRef.current = gain;
      fftBinsRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    } catch {
      cleanupAudioNodes();
    }

    return cleanupAudioNodes;
  }, [isPlaying, caseId, durationSec]);

  // Apply volume-correlated resting scale & opacity smoothly whenever paused or muted
  useEffect(() => {
    if (viewMode !== 'waveform') return;
    const rects = rectNodesRef.current;
    const currentBars = barsRef.current;
    const playheadRatio = Math.max(0, Math.min(1, currentTimeSec / durationSec));
    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isPlaying || volume === 0 || isReducedMotion) {
      for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const amp = currentBars[i] ?? 0.5;
        const { scaleY, opacity } = computeFrequencyBarScale({
          baseAmplitude: amp,
          barIndex: i,
          barCount: currentBars.length,
          volume,
          isPlaying: false,
          playheadRatio,
          phaseSec: phaseSecRef.current,
        });
        rect.style.transition =
          'transform 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 160ms ease';
        rect.style.transform = `scaleY(${scaleY})`;
        rect.style.opacity = String(opacity);
      }
    }
  }, [bars, volume, isPlaying, currentTimeSec, durationSec, viewMode]);

  // 60fps frequency-reactive playback + playhead transform loop
  useEffect(() => {
    if (!isPlaying) {
      setCurrentTimeSec(liveTimeRef.current);
      return;
    }

    if (liveTimeRef.current >= durationSec - 0.05) {
      liveTimeRef.current = 0;
      setCurrentTimeSec(0);
      onTimeUpdateRef.current?.(0);
    }

    const isReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const rects = rectNodesRef.current;
    for (let i = 0; i < rects.length; i++) {
      rects[i].style.transition = 'none';
    }

    let lastTs = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const dtSec = rawDt * playbackSpeed;
      const next = liveTimeRef.current + dtSec;
      phaseSecRef.current += dtSec;

      if (next >= durationSec) {
        liveTimeRef.current = durationSec;
        if (playheadRef.current) {
          playheadRef.current.style.transform = 'translate3d(100%, 0, 0)';
        }
        setCurrentTimeSec(durationSec);
        onTimeUpdateRef.current?.(durationSec);
        onStopPlayback();
        return;
      }

      liveTimeRef.current = next;
      const ratio = Math.max(0, Math.min(1, next / durationSec));
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translate3d(${(ratio * 100).toFixed(3)}%, 0, 0)`;
      }

      if (now - lastSyncEmitRef.current >= 120) {
        lastSyncEmitRef.current = now;
        onTimeUpdateRef.current?.(Number(next.toFixed(2)));
      }

      if (!isReducedMotion && viewMode === 'waveform') {
        const currentBars = barsRef.current;
        const activeRects = rectNodesRef.current;
        const liveVol = volumeRef.current;
        const phase = phaseSecRef.current;
        const analyser = analyserNodeRef.current;
        const fftBins = fftBinsRef.current;

        if (analyser && fftBins && liveVol > 0) {
          analyser.getByteFrequencyData(fftBins);
          const usableBins = Math.max(1, Math.floor(fftBins.length * 0.72));
          for (let i = 0; i < activeRects.length; i++) {
            const binIdx = Math.min(
              usableBins - 1,
              Math.floor((i / Math.max(1, activeRects.length)) * usableBins),
            );
            const liveEnergy = (fftBins[binIdx] ?? 0) / 255;
            const baseAmp = currentBars[i] ?? 0.4;
            const barCenter = i / Math.max(1, activeRects.length);
            const dist = Math.abs(barCenter - ratio);
            const focus = dist < 0.07 ? 1 + (1 - dist / 0.07) * 0.25 : 1;
            const scaleY = Number(
              Math.max(0.28, Math.min(1.42, (0.45 + liveEnergy * 0.95 * focus) * (0.4 + liveVol * 0.75))).toFixed(3),
            );
            const opacity = Number(Math.min(1, 0.45 + liveEnergy * 0.55).toFixed(3));
            const el = activeRects[i];
            el.style.transform = `scaleY(${scaleY})`;
            el.style.opacity = String(opacity);
            void baseAmp;
          }
        } else {
          for (let i = 0; i < activeRects.length; i++) {
            const { scaleY, opacity } = computeFrequencyBarScale({
              baseAmplitude: currentBars[i] ?? 0.5,
              barIndex: i,
              barCount: currentBars.length,
              volume: liveVol,
              isPlaying: true,
              playheadRatio: ratio,
              phaseSec: phase,
            });
            const el = activeRects[i];
            el.style.transform = `scaleY(${scaleY})`;
            el.style.opacity = String(opacity);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackSpeed, durationSec, onStopPlayback, viewMode]);

  const progressPct = Math.max(0, Math.min(100, (currentTimeSec / durationSec) * 100));
  const timeTicks = useMemo(() => {
    if (durationSec >= 11.8 && durationSec <= 12.6) {
      return [0, 2, 4, 6, 8, 10, 12];
    }
    const stepCount = 6;
    return Array.from({ length: stepCount + 1 }, (_, i) =>
      Number(((i / stepCount) * durationSec).toFixed(durationSec >= 15 ? 0 : 1)),
    );
  }, [durationSec]);

  const seekToSecond = (sec: number) => {
    const clamped = Math.max(0, Math.min(durationSec, sec));
    liveTimeRef.current = clamped;
    setCurrentTimeSec(clamped);
    onTimeUpdateRef.current?.(clamped);
    if (playheadRef.current) {
      const pct = Math.max(0, Math.min(100, (clamped / durationSec) * 100));
      playheadRef.current.style.transform = `translate3d(${pct.toFixed(3)}%, 0, 0)`;
    }
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const sec = Number((ratio * durationSec).toFixed(2));
    seekToSecond(sec);
    const matching = findActiveSegment(sec, segments);
    if (matching && matching.id !== selectedSegmentId) {
      onSegmentChange(matching.id);
    }
  };

  const hasDecodedBuffer = Boolean(getDecodedAudioBuffer(caseId));

  return (
    <section
      aria-label="Audio Analysis"
      className={`glass-card glass-card-hover p-4 sm:px-5 sm:py-4 flex flex-col justify-between ${
        isExpanded ? 'ring-2 ring-[#3B9BF0]/40' : ''
      }`}
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl glass-inset-tile flex items-center justify-center">
            <AudioWaveform className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
          </div>
          <h2 className="text-[16px] font-semibold text-[#0F1B3D]">Audio Analysis</h2>
          {hasDecodedBuffer && (
            <span className="px-2 py-0.5 rounded-full bg-[#CFF5E7] text-[#0E9F7E] text-[10px] font-bold uppercase tracking-wide">
              LIVE FFT
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Segmented Waveform / Mel-Spectrogram Toggle */}
          <div
            role="tablist"
            aria-label="Acoustic visualization mode"
            className="glass-pill rounded-full p-0.5 flex items-center gap-0.5"
          >
            {(['waveform', 'spectrogram'] as const).map((mode) => {
              const active = viewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setViewMode(mode)}
                  className={`relative px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-colors ${
                    active ? 'text-white' : 'text-[#475577] hover:text-[#0F1B3D]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="audio-view-mode-pill"
                      transition={{ type: 'spring', stiffness: 480, damping: 34 }}
                      className="absolute inset-0 rounded-full bg-[#0F1B3D] shadow-xs"
                      aria-hidden="true"
                    />
                  )}
                  <span className="relative z-10 capitalize">
                    {mode === 'waveform' ? 'Waveform' : 'Spectrogram'}
                  </span>
                </button>
              );
            })}
          </div>

          <span className="text-[12.5px] font-medium text-[#5B6785] tabular-nums whitespace-nowrap">
            Duration: <span className="text-[#0F1B3D] font-semibold">{formatDuration(durationSec)}</span>
          </span>

          <div className="relative">
            <select
              aria-label="Playback speed"
              value={playbackSpeed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              className="appearance-none glass-pill rounded-full pl-3 pr-7 py-1 text-[12px] font-semibold text-[#0F1B3D] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
            >
              {SPEED_OPTIONS.map((spd) => (
                <option key={spd} value={spd}>
                  {spd.toFixed(1)}x
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 text-[#5B6785] pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Main Waveform / Spectrogram Body */}
      <div className="flex-1 flex items-center gap-4 sm:gap-5">
        {/* Left Play & Volume Controls */}
        <div className="flex flex-col items-center gap-3.5 shrink-0 w-[74px]">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause audio playback' : 'Play audio playback'}
            className="glass-lens-orb w-16 h-16 rounded-full flex items-center justify-center text-[#0F1B3D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-[#0F1B3D]" />
            ) : (
              <Play className="w-6 h-6 fill-[#0F1B3D] ml-0.5" />
            )}
          </button>

          <div className="glass-inset-tile flex items-center gap-1.5 w-full px-1.5 py-1 rounded-full">
            <button
              type="button"
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              aria-label={volume === 0 ? 'Unmute audio' : 'Mute audio'}
              className="text-[#394563] hover:text-[#0F1B3D] shrink-0 p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0] rounded"
            >
              {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              aria-label="Audio volume"
              className="vox-slider w-full"
            />
          </div>
        </div>

        {/* Center Segment Overlays + Mirrored Waveform or Mel-Spectrogram + Time Axis */}
        <div className="flex-1 min-w-0">
          <div
            ref={waveformRef}
            onClick={handleWaveformClick}
            data-testid="waveform-surface"
            data-view-mode={viewMode}
            data-volume={volume.toFixed(2)}
            data-playing={String(isPlaying)}
            className={`relative rounded-2xl transition-all cursor-pointer select-none overflow-hidden ${
              isExpanded ? 'h-[156px]' : 'h-[108px]'
            }`}
          >
            {/* Three Segment Overlays */}
            <div className="absolute inset-0 flex gap-1 pointer-events-none z-10">
              {segments.map((seg) => {
                const widthPct = ((seg.endSec - seg.startSec) / durationSec) * 100;
                const isSelected = seg.id === selectedSegmentId;

                const themeClasses =
                  viewMode === 'spectrogram'
                    ? isSelected
                      ? 'bg-[#3B9BF0]/12 border-[#93C5FD]/85'
                      : 'bg-transparent border-white/25'
                    : seg.theme === 'blue'
                      ? isSelected
                        ? 'bg-[#BFE3FF]/50 border-[#60A5FA]/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                        : 'bg-[#CFE9FF]/35 border-[#93C5FD]/45'
                      : seg.theme === 'purple'
                        ? isSelected
                          ? 'bg-[#D8CEFF]/52 border-[#A78BFA]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
                          : 'bg-[#E5DFFF]/38 border-[#C4B5FD]/45'
                        : isSelected
                          ? 'bg-white/65 border-[#94A3B8]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]'
                          : 'bg-white/32 border-white/60';

                const chipClasses =
                  seg.theme === 'blue'
                    ? 'bg-[#CBE6FF]/92 text-[#1D6CE0] border-[#93C5FD]/70'
                    : seg.theme === 'purple'
                      ? 'bg-[#E5DCFF]/92 text-[#6D28D9] border-[#C4B5FD]/70'
                      : 'bg-white/85 text-[#5B6785] border-white';

                return (
                  <div
                    key={seg.id}
                    style={{ width: `${widthPct}%` }}
                    className={`h-full rounded-xl border transition-all duration-150 flex justify-center pt-1.5 ${themeClasses}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        seekToSecond(seg.startSec);
                        onSegmentChange(seg.id);
                      }}
                      aria-pressed={isSelected}
                      className={`pointer-events-auto h-6 px-3 rounded-full text-[11.5px] font-semibold border transition-transform hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0] whitespace-nowrap tabular-nums ${chipClasses} ${
                        isSelected ? 'ring-2 ring-white/80 shadow-sm' : ''
                      }`}
                    >
                      {seg.label}
                    </button>
                  </div>
                );
              })}
            </div>

            {viewMode === 'waveform' ? (
              <div className="absolute inset-x-1 bottom-1.5 top-7 flex items-center pointer-events-none">
                <WaveformBars bars={bars} barCount={barCount} svgRef={svgRef} />
              </div>
            ) : (
              <div className="absolute inset-0 rounded-xl overflow-hidden bg-[#101C3D] pointer-events-none">
                <canvas
                  ref={spectrogramCanvasRef}
                  data-testid="spectrogram-canvas"
                  className="w-full h-full block"
                  aria-label="Mel-Spectrogram time-frequency canvas"
                />
                <div className="absolute left-2 top-8 bottom-1.5 flex flex-col justify-between text-[9.5px] font-bold text-white/85 pointer-events-none drop-shadow">
                  <span>8 kHz</span>
                  <span>4 kHz</span>
                  <span>0.1 kHz</span>
                </div>
              </div>
            )}

            {/* GPU-composited Playhead & Acoustic Sweep Trail */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl z-20">
              <div
                ref={playheadRef}
                className="w-full h-full"
                style={{
                  transform: `translate3d(${progressPct}%, 0, 0)`,
                  willChange: 'transform',
                }}
              >
                {isPlaying && (
                  <div
                    aria-hidden="true"
                    className="absolute top-1 bottom-1 left-0 w-14 -translate-x-full rounded-r-lg"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(59, 155, 240, 0.16) 75%, rgba(59, 155, 240, 0.34) 100%)',
                    }}
                  />
                )}
                <div className="absolute top-0 bottom-0 left-0 w-[1.5px] bg-[#3B9BF0] shadow-[0_0_8px_rgba(59,155,240,0.75)]">
                  <span className="absolute -top-1 -left-[4px] w-2.5 h-2.5 rounded-full bg-[#3B9BF0] border-2 border-white shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Time Axis */}
          <div className="flex items-center justify-between text-[12px] font-medium text-[#5B6785] mt-1.5 px-0.5 tabular-nums">
            {timeTicks.map((t, idx) => (
              <span key={`${t}-${idx}`}>{t}s</span>
            ))}
          </div>
        </div>

        {/* Right Vertical Tool Stack */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onZoomIn}
            disabled={zoomLevel >= 1.5}
            aria-label="Zoom in waveform"
            title="Zoom in"
            className="glass-lens-orb w-8 h-8 rounded-full flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] disabled:opacity-45 disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onZoomOut}
            disabled={zoomLevel <= 0.75}
            aria-label="Zoom out waveform"
            title="Zoom out"
            className="glass-lens-orb w-8 h-8 rounded-full flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] disabled:opacity-45 disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Collapse waveform height' : 'Expand waveform height'}
            title={isExpanded ? 'Exit expanded view' : 'Expand waveform'}
            className="glass-lens-orb w-8 h-8 rounded-full flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </section>
  );
}
