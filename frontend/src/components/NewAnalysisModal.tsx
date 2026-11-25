import { useRef, useState } from 'react';
import { AudioWaveform, Check, FileAudio, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import type { AssessmentCase } from '../data';
import {
  buildAssessmentFromDecodedAudio,
  computeSha256Hex,
  registerDecodedAudioBuffer,
} from '../utils/audioAnalyzer';

interface DecodedFilePreview {
  fileName: string;
  fileSizeBytes: number;
  durationSec: number;
  sampleRate: number;
  channels: number;
  samples: Float32Array;
  sha256: string;
  buffer: AudioBuffer;
}

interface NewAnalysisModalProps {
  open: boolean;
  cases: AssessmentCase[];
  activeCaseId: string;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
  onCreateCustomCase: (title: string, channel: string, transcript: string) => void;
  onCreateAudioCase: (newCase: AssessmentCase) => void;
  onDeleteCase?: (caseId: string) => void;
  onSubmitAudioToBackend?: (
    file: File,
    title: string,
    channel: string,
    buffer: AudioBuffer,
    preview: DecodedFilePreview,
  ) => Promise<void>;
}

function downmixAudioBufferToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  if (channels <= 1) {
    return new Float32Array(buffer.getChannelData(0));
  }
  const mono = new Float32Array(length);
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      mono[i] += data[i] / channels;
    }
  }
  return mono;
}

export function NewAnalysisModal({
  open,
  cases,
  activeCaseId,
  onClose,
  onSelectCase,
  onCreateCustomCase,
  onCreateAudioCase,
  onDeleteCase,
  onSubmitAudioToBackend,
}: NewAnalysisModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [channel, setChannel] = useState('SIP Trunk · +1 (650) 555-0148');
  const [transcript, setTranscript] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [decodedPreview, setDecodedPreview] = useState<DecodedFilePreview | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const processAudioFile = async (file: File) => {
    setError('');
    setIsDecoding(true);
    setRawFile(file);
    let ctx: AudioContext | null = null;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const sha256 = await computeSha256Hex(arrayBuffer.slice(0));
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AudioCtx();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const samples = downmixAudioBufferToMono(audioBuffer);

      setDecodedPreview({
        fileName: file.name,
        fileSizeBytes: file.size,
        durationSec: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels,
        samples,
        sha256,
        buffer: audioBuffer,
      });

      if (!title.trim()) {
        setTitle(`Capture — ${file.name.replace(/\.[^.]+$/, '')}`);
      }
      if (channel === 'SIP Trunk · +1 (650) 555-0148') {
        setChannel(`Uploaded File · ${file.name}`);
      }
    } catch {
      setDecodedPreview(null);
      setError(
        `Could not decode "${file.name}". Please upload a valid .wav, .mp3, .m4a, or .ogg audio recording.`,
      );
    } finally {
      setIsDecoding(false);
      if (ctx) {
        ctx.close().catch(() => undefined);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processAudioFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processAudioFile(file);
    }
  };

  const resetForm = () => {
    setTitle('');
    setChannel('SIP Trunk · +1 (650) 555-0148');
    setTranscript('');
    setRawFile(null);
    setDecodedPreview(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (decodedPreview && rawFile && onSubmitAudioToBackend) {
      setIsSubmitting(true);
      setError('');
      try {
        await onSubmitAudioToBackend(
          rawFile,
          title.trim() || decodedPreview.fileName,
          channel.trim(),
          decodedPreview.buffer,
          decodedPreview,
        );
        resetForm();
        onClose();
        return;
      } catch (err: any) {
        setError(err.message || 'Server analysis submission failed. Check backend connection.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (decodedPreview) {
      const builtCase = buildAssessmentFromDecodedAudio({
        fileName: decodedPreview.fileName,
        fileSizeBytes: decodedPreview.fileSizeBytes,
        durationSec: decodedPreview.durationSec,
        sampleRate: decodedPreview.sampleRate,
        channels: decodedPreview.channels,
        samples: decodedPreview.samples,
        sha256: decodedPreview.sha256,
        customTitle: title.trim() || undefined,
        customChannel: channel.trim() || undefined,
        customTranscript: transcript.trim() || undefined,
      });
      registerDecodedAudioBuffer(builtCase.id, decodedPreview.buffer);
      onCreateAudioCase(builtCase);
      resetForm();
      onClose();
      return;
    }

    if (!title.trim() || !transcript.trim()) {
      setError('Upload an audio file or enter both a call label and speech excerpt to analyze.');
      return;
    }

    setError('');
    onCreateCustomCase(title.trim(), channel.trim(), transcript.trim());
    resetForm();
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-analysis-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1B3D]/28"
    >
      <div className="w-full max-w-xl rounded-[28px] bg-white/96 border border-white shadow-[0_28px_72px_rgba(15,27,61,0.24),inset_0_1.5px_0_rgba(255,255,255,1)] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] flex items-center justify-center text-[#2563EB]">
              <AudioWaveform className="w-4 h-4" />
            </div>
            <h2 id="new-analysis-title" className="text-[18px] font-semibold text-[#0F1B3D]">
              New Voice Threat Analysis
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#5B6785]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Queued Forensic Samples */}
        <div className="mb-4">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5B6785] mb-2">
            Queued Forensic Voice Captures
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {cases.map((item) => {
              const selected = item.id === activeCaseId;
              return (
                <div
                  key={item.id}
                  className={`w-full text-left p-2.5 px-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    selected
                      ? 'bg-[#EFF6FF] border-[#93C5FD]'
                      : 'bg-white/70 border-slate-200/80 hover:border-[#93C5FD]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCase(item.id);
                      onClose();
                    }}
                    className="min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <div className="text-[13px] font-semibold text-[#0F1B3D] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[#5B6785] truncate">
                      {item.id} · {item.sourceChannel}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                        item.threatScore.riskLevel === 'CRITICAL' || item.threatScore.riskLevel === 'HIGH'
                          ? 'bg-[#FDD5DC] text-[#DC2626]'
                          : 'bg-[#CFF5E7] text-[#0E9F7E]'
                      }`}
                    >
                      {item.threatScore.score.toFixed(1)}
                    </span>
                    {onDeleteCase && (
                      <button
                        type="button"
                        title={`Delete ${item.title}`}
                        aria-label={`Delete ${item.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCase(item.id);
                        }}
                        className="w-6 h-6 rounded-md text-[#8C9BB5] hover:text-[#DC2626] hover:bg-[#FEE2E2]/70 flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {selected && <Check className="w-4 h-4 text-[#2563EB]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real Audio Upload Dropzone */}
        <form onSubmit={handleSubmit} className="border-t border-slate-200/80 pt-4 space-y-3">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#5B6785]">
            Ingest Audio File (Web Audio FFT) or Simulate Transcript
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`rounded-2xl border-2 border-dashed p-3.5 transition-all ${
              isDragging
                ? 'border-[#2563EB] bg-[#EFF6FF]/90'
                : decodedPreview
                  ? 'border-[#14B89A]/70 bg-[#ECFDF5]/60'
                  : 'border-slate-300/85 bg-[#F8FAFF]/75 hover:border-[#93C5FD]'
            }`}
          >
            <input
              ref={fileInputRef}
              id="audio-file-upload"
              type="file"
              accept=".wav,.mp3,.m4a,.ogg,.webm,audio/*"
              onChange={handleFileChange}
              aria-label="Upload audio file"
              className="sr-only"
            />

            {decodedPreview ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#CFF5E7] text-[#0E9F7E] flex items-center justify-center shrink-0">
                    <FileAudio className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0F1B3D] truncate">
                      {decodedPreview.fileName}
                    </div>
                    <div className="text-[11px] text-[#475577] tabular-nums truncate">
                      {decodedPreview.durationSec.toFixed(1)}s · {decodedPreview.sampleRate} Hz ·{' '}
                      {decodedPreview.channels}ch · SHA-256: {decodedPreview.sha256.slice(0, 12)}…
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDecodedPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  aria-label="Remove uploaded audio file"
                  className="w-8 h-8 rounded-full hover:bg-white text-[#5B6785] hover:text-[#DC2626] flex items-center justify-center shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="audio-file-upload"
                className="flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0">
                    <UploadCloud className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#0F1B3D]">
                      {isDecoding
                        ? 'Decoding PCM stream & computing SHA-256...'
                        : 'Drop .wav, .mp3, or .m4a audio capture'}
                    </div>
                    <div className="text-[11.5px] text-[#5B6785]">
                      Analyzes live FFT waveform bars &amp; Mel-Spectrogram via Web Audio API
                    </div>
                  </div>
                </div>
                <span className="glass-pill rounded-full px-3 py-1.5 text-[12px] font-semibold text-[#0F1B3D] shrink-0">
                  Browse File
                </span>
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="case-title" className="block text-[12px] font-medium text-[#394563] mb-1">
                Call / Recording Label
              </label>
              <input
                id="case-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Wire Verification Call #8845"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-[#0F1B3D] focus:outline-none focus:ring-2 focus:ring-[#3B9BF0]"
              />
            </div>
            <div>
              <label htmlFor="case-channel" className="block text-[12px] font-medium text-[#394563] mb-1">
                Ingestion Channel
              </label>
              <input
                id="case-channel"
                type="text"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-[#0F1B3D] focus:outline-none focus:ring-2 focus:ring-[#3B9BF0]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="case-transcript" className="block text-[12px] font-medium text-[#394563] mb-1">
              Speech Excerpt {decodedPreview ? '(Optional for uploaded audio)' : '(ASR Input)'}
            </label>
            <textarea
              id="case-transcript"
              rows={2}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste captured call transcript (mentioning OTP, urgent transfer, or routine verification)..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-[#0F1B3D] focus:outline-none focus:ring-2 focus:ring-[#3B9BF0]"
            />
          </div>

          {error && (
            <p role="alert" className="text-[12px] font-medium text-[#DC2626]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-[13px] font-medium text-[#5B6785] hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDecoding || isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#0F1B3D] hover:bg-[#1E3063] text-white text-[13px] font-semibold shadow-sm transition-colors disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting to Backend...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{decodedPreview ? 'Submit to Neural Pipeline' : 'Analyze Recording'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
