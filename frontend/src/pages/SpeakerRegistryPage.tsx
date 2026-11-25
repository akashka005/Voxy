import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AudioWaveform,
  CheckCircle2,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';
import type {
  AssessmentCase,
  EnrolledSpeaker,
  SpeakerStatus,
  TopEngineStatus,
} from '../data';
import { TopBar } from '../components/TopBar';
import { filterSpeakers, generateWaveformBars } from '../utils/forensics';

interface SpeakerRegistryPageProps {
  speakers: EnrolledSpeaker[];
  cases: AssessmentCase[];
  activeCaseId: string;
  engineStatuses: TopEngineStatus[];
  onSelectCase: (caseId: string) => void;
  onAddSpeaker: (name: string, role: string, department: string) => void;
  onUpdateSpeakerStatus: (speakerId: string, status: SpeakerStatus) => void;
}

const STATUS_FILTERS: (SpeakerStatus | 'ALL')[] = ['ALL', 'VERIFIED', 'WATCHLIST', 'PENDING'];

export function SpeakerRegistryPage({
  speakers,
  cases,
  activeCaseId,
  engineStatuses,
  onSelectCase,
  onAddSpeaker,
  onUpdateSpeakerStatus,
}: SpeakerRegistryPageProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SpeakerStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState(speakers[0]?.id ?? '');
  const [calibrating, setCalibrating] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newDept, setNewDept] = useState('Corporate Treasury');

  const filtered = filterSpeakers(speakers, query, statusFilter);
  const activeSpeaker =
    filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? speakers[0];

  const voiceprintBars = useMemo(
    () => generateWaveformBars(48, activeSpeaker?.voiceSeed ?? 1200),
    [activeSpeaker?.voiceSeed],
  );

  const handleCalibrate = () => {
    if (!activeSpeaker) return;
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
      onUpdateSpeakerStatus(activeSpeaker.id, 'VERIFIED');
    }, 900);
  };

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newRole.trim()) return;
    onAddSpeaker(newName.trim(), newRole.trim(), newDept.trim());
    setNewName('');
    setNewRole('');
    setEnrollOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex-1 min-w-0 p-4 sm:p-5 lg:px-8 lg:py-5 relative z-10 max-w-[1460px] mx-auto w-full"
    >
      <TopBar
        statuses={engineStatuses}
        cases={cases}
        activeCaseId={activeCaseId}
        onSelectCase={(id) => {
          onSelectCase(id);
          navigate('/');
        }}
        searchQuery={query}
        onSearchChange={setQuery}
      />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 glass-pill rounded-full px-3 py-1 mb-1.5">
            <Sparkles className="w-3 h-3 text-[#6B7A9E]" aria-hidden="true" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#475577]">
              ECAPA-TDNN VOICEPRINT COHORT
            </span>
          </div>
          <h1 className="font-serif-display text-[40px] sm:text-[46px] leading-[1.03] text-[#0F1B3D]">
            Speaker Registry
          </h1>
          <div className="mt-1 flex items-center gap-4">
            <p className="text-[15.5px] text-[#475577]">
              Manage enrolled executive voiceprints, watchlist embeddings, and calibration baselines.
            </p>
            <div
              aria-hidden="true"
              className="hidden sm:block h-[1px] flex-1 bg-gradient-to-r from-[#8DA2C8]/50 via-[#8DA2C8]/20 to-transparent"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="glass-pill rounded-full h-10 px-3.5 flex items-center gap-2">
            <Search className="w-4 h-4 text-[#5B6785]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search speakers..."
              aria-label="Search speaker registry"
              className="bg-transparent text-[13px] text-[#0F1B3D] placeholder:text-[#5B6785] focus:outline-none w-36"
            />
          </div>

          <button
            type="button"
            onClick={() => setEnrollOpen((v) => !v)}
            className="glass-pill rounded-full h-10 px-4 inline-flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D]"
          >
            <Plus className="w-4 h-4 text-[#2563EB]" />
            <span>Enroll Voiceprint</span>
          </button>
        </div>
      </div>

      {/* Status Filter Strip */}
      <div className="mb-4">
        <div className="glass-pill rounded-full p-1 inline-flex flex-wrap items-center gap-1">
          {STATUS_FILTERS.map((st) => {
            const isSelected = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`relative px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  isSelected ? 'text-white' : 'text-[#475577] hover:text-[#0F1B3D]'
                }`}
              >
                {isSelected && (
                  <motion.span
                    layoutId="registry-filter-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    className="absolute inset-0 rounded-full bg-[#0F1B3D] shadow-[0_6px_16px_rgba(15,27,61,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{st}</span>
              </button>
            );
          })}
        </div>
      </div>

      {enrollOpen && (
        <form
          onSubmit={handleEnrollSubmit}
          className="glass-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label htmlFor="spk-name" className="block text-[11.5px] font-semibold text-[#394563] mb-1">
              Full Name
            </label>
            <input
              id="spk-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Jordan Vance"
              className="w-full rounded-xl bg-white/85 border border-white px-3 py-2 text-[13px] text-[#0F1B3D]"
            />
          </div>
          <div>
            <label htmlFor="spk-role" className="block text-[11.5px] font-semibold text-[#394563] mb-1">
              Role
            </label>
            <input
              id="spk-role"
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              placeholder="e.g., Treasury Approver"
              className="w-full rounded-xl bg-white/85 border border-white px-3 py-2 text-[13px] text-[#0F1B3D]"
            />
          </div>
          <div>
            <label htmlFor="spk-dept" className="block text-[11.5px] font-semibold text-[#394563] mb-1">
              Department
            </label>
            <input
              id="spk-dept"
              type="text"
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              className="w-full rounded-xl bg-white/85 border border-white px-3 py-2 text-[13px] text-[#0F1B3D]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 rounded-full bg-[#0F1B3D] text-white py-2 px-4 text-[13px] font-semibold"
            >
              Save Profile
            </button>
            <button
              type="button"
              onClick={() => setEnrollOpen(false)}
              className="rounded-full px-3 py-2 text-[12.5px] text-[#5B6785]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-4 items-start">
        {/* Directory List */}
        <section aria-label="Enrolled Speakers" className="glass-card p-5 space-y-2.5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-[15.5px] font-semibold text-[#0F1B3D]">
              Enrolled Profiles ({filtered.length})
            </h2>
          </div>

          {filtered.map((spk) => {
            const selected = activeSpeaker?.id === spk.id;
            const badgeStyle =
              spk.status === 'VERIFIED'
                ? 'bg-[#CFF5E7] text-[#0E9F7E]'
                : spk.status === 'WATCHLIST'
                  ? 'bg-[#FDD5DC] text-[#DC2626]'
                  : 'bg-[#FDE6B8] text-[#B7791F]';
            return (
              <button
                key={spk.id}
                type="button"
                onClick={() => setSelectedId(spk.id)}
                className={`w-full text-left rounded-[18px] p-3.5 border transition-all flex items-center justify-between gap-3 ${
                  selected
                    ? 'bg-gradient-to-b from-white/92 to-white/75 border-[#93C5FD] shadow-[0_8px_22px_rgba(37,99,235,0.12),inset_0_1.5px_0_rgba(255,255,255,1)]'
                    : 'glass-inset-tile hover:bg-white/78'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] text-white text-[12.5px] font-bold flex items-center justify-center shrink-0 shadow-[0_6px_14px_rgba(37,99,235,0.28),inset_0_1px_0_rgba(255,255,255,0.4)]">
                    {spk.name
                      .split(' ')
                      .map((p) => p[0])
                      .join('')
                      .slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-[#0F1B3D] truncate">
                      {spk.name}
                    </div>
                    <div className="text-[11.5px] text-[#5B6785] truncate">
                      {spk.role} · {spk.department}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="text-[12px] font-bold text-[#0F1B3D] tabular-nums">
                    {(spk.similarityBaseline * 100).toFixed(0)}%
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${badgeStyle}`}>
                    {spk.status}
                  </span>
                </div>
              </button>
            );
          })}
        </section>

        {/* Acoustic Voiceprint Inspector with Harmonic Sonar Rings */}
        {activeSpeaker && (
          <section aria-label="Voiceprint Inspector" className="glass-card glass-card-hover p-5">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <AudioWaveform className="w-5 h-5 text-[#2563EB]" />
                <h2 className="text-[16px] font-semibold text-[#0F1B3D]">
                  Voiceprint Biometric Profile
                </h2>
              </div>
              <span className="text-[11.5px] font-mono text-[#5B6785]">{activeSpeaker.id}</span>
            </div>

            {/* Animated Concentric Acoustic Rings */}
            <div className="relative h-36 glass-inset-tile rounded-[20px] bg-gradient-to-br from-[#EFF6FF]/90 to-[#F5F3FF]/85 flex flex-col items-center justify-center overflow-hidden mb-4">
              {[0, 1, 2].map((ring) => (
                <motion.div
                  key={ring}
                  aria-hidden="true"
                  className="absolute rounded-full border border-[#3B9BF0]/35"
                  style={{ width: 62 + ring * 34, height: 62 + ring * 34 }}
                  animate={{
                    scale: calibrating ? [1, 1.22, 1] : [1, 1.08, 1],
                    opacity: calibrating ? [0.75, 0.2, 0.75] : [0.55, 0.22, 0.55],
                  }}
                  transition={{
                    duration: calibrating ? 0.9 : 2.8,
                    delay: ring * 0.35,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}

              <div className="relative z-10 text-center">
                <div className="text-[28px] font-bold text-[#0F1B3D] tabular-nums leading-none">
                  {activeSpeaker.similarityBaseline.toFixed(2)}
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6785] mt-1">
                  {calibrating ? 'Calibrating Embedding...' : 'Cosine Baseline'}
                </div>
              </div>
            </div>

            {/* Embedding Spectrum Strip */}
            <div className="glass-inset-tile flex items-center justify-between gap-[2px] h-9 px-2.5 rounded-[14px] mb-4">
              {voiceprintBars.map((val, idx) => (
                <span
                  key={idx}
                  className="w-1 rounded-full bg-gradient-to-t from-[#3B82F6] to-[#8B5CF6]"
                  style={{ height: `${Math.max(18, Math.round(val * 100))}%` }}
                />
              ))}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-[12.5px] mb-4">
              <div className="glass-inset-tile rounded-[16px] p-2.5">
                <dt className="text-[#5B6785]">Model Version</dt>
                <dd className="font-semibold text-[#0F1B3D] mt-0.5">
                  {activeSpeaker.embeddingVersion}
                </dd>
              </div>
              <div className="glass-inset-tile rounded-[16px] p-2.5">
                <dt className="text-[#5B6785]">Enrolled Samples</dt>
                <dd className="font-semibold text-[#0F1B3D] mt-0.5 tabular-nums">
                  {activeSpeaker.sampleCount} utterances
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/70">
              <button
                type="button"
                onClick={handleCalibrate}
                disabled={calibrating}
                className="glass-pill rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0F1B3D]"
              >
                <UserCheck className="w-3.5 h-3.5 text-[#0E9F7E]" />
                <span>{calibrating ? 'Calibrating...' : 'Run Calibration'}</span>
              </button>

              {activeSpeaker.status !== 'WATCHLIST' ? (
                <button
                  type="button"
                  onClick={() => onUpdateSpeakerStatus(activeSpeaker.id, 'WATCHLIST')}
                  className="glass-pill rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#DC2626]"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Flag Watchlist</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateSpeakerStatus(activeSpeaker.id, 'VERIFIED')}
                  className="glass-pill rounded-full px-4 py-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0E9F7E]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Verified</span>
                </button>
              )}
            </div>
          </section>
        )}
      </div>
    </motion.div>
  );
}
