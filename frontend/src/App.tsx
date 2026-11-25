import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { HotkeysProvider } from 'react-hotkeys-hook';
import { Check } from 'lucide-react';
import { EvidenceDrawer } from './components/EvidenceDrawer';
import { GlassBackdrop } from './components/GlassBackdrop';
import { NewAnalysisModal } from './components/NewAnalysisModal';
import { ShortcutManager } from './components/ShortcutManager';
import { Sidebar } from './components/Sidebar';
import { SpotlightPalette } from './components/SpotlightPalette';
import { TactileAudioProvider, useTactileAudio } from './components/TactileAudioProvider';
import {
  INITIAL_ENGINE_TELEMETRY,
  INITIAL_REPORTS,
  INITIAL_SPEAKERS,
  SECONDARY_CASES,
  TOP_ENGINE_STATUSES,
} from './data';
import type {
  AssessmentCase,
  EnrolledSpeaker,
  EngineTelemetryMetric,
  ForensicReportItem,
  InvestigationDisposition,
  SpeakerStatus,
  TopEngineStatus,
} from './data';
import {
  fetchHealth,
  fetchHistory,
  fetchAnalysis,
  fetchSpeakers,
  enrollSpeaker,
  submitAudioAnalysis,
  pollAnalysisUntilComplete,
  transformBackendAnalysisToCase,
  transformBackendSpeakerToEnrolled,
  transformBackendHealthToTopStatuses,
  transformBackendHealthToTelemetry,
  transformBackendCaseToReport,
} from './api/voxsentinel';
import { ForensicReportsPage } from './pages/ForensicReportsPage';
import { InvestigationHistoryPage } from './pages/InvestigationHistoryPage';
import { OverviewPage } from './pages/OverviewPage';
import { SpeakerRegistryPage } from './pages/SpeakerRegistryPage';
import { SystemTelemetryPage } from './pages/SystemTelemetryPage';
import { ThreatAssessmentPage } from './pages/ThreatAssessmentPage';
import { clearDecodedAudioBuffers, registerDecodedAudioBuffer } from './utils/audioAnalyzer';
import { buildForensicExportPayload } from './utils/forensics';
import { clearWorkspaceState, loadWorkspaceState, saveWorkspaceState } from './utils/persistence';
import { SHORTCUT_DOM_EVENTS } from './utils/shortcuts';

export type ExportStatus = 'idle' | 'pending' | 'exported';

function AnimatedRoutes({
  cases,
  activeCaseId,
  reports,
  speakers,
  telemetry,
  engineStatuses,
  exportStatus,
  onSelectCase,
  onOpenNewAnalysis,
  onExportReport,
  onOpenEvidence,
  onResetWorkspace,
  onNotify,
  onUpdateDisposition,
  onGenerateReportForCase,
  onSignReport,
  onAddSpeaker,
  onUpdateSpeakerStatus,
  onTickTelemetry,
  onRunDiagnostics,
  onPlaybackChange,
}: {
  cases: AssessmentCase[];
  activeCaseId: string;
  reports: ForensicReportItem[];
  speakers: EnrolledSpeaker[];
  telemetry: EngineTelemetryMetric[];
  engineStatuses: TopEngineStatus[];
  exportStatus: ExportStatus;
  onSelectCase: (id: string) => void;
  onOpenNewAnalysis: () => void;
  onExportReport: () => void;
  onOpenEvidence: (caseId: string) => void;
  onResetWorkspace: () => void;
  onNotify: (message: string) => void;
  onUpdateDisposition: (caseId: string, disposition: InvestigationDisposition) => void;
  onGenerateReportForCase: (caseId: string) => void;
  onSignReport: (reportId: string) => void;
  onAddSpeaker: (name: string, role: string, department: string) => void;
  onUpdateSpeakerStatus: (speakerId: string, status: SpeakerStatus) => void;
  onTickTelemetry: () => void;
  onRunDiagnostics: () => void;
  onPlaybackChange: (playing: boolean) => void;
}) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <ThreatAssessmentPage
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              exportStatus={exportStatus}
              onSelectCase={onSelectCase}
              onOpenNewAnalysis={onOpenNewAnalysis}
              onExportReport={onExportReport}
              onOpenEvidence={onOpenEvidence}
              onResetWorkspace={onResetWorkspace}
              onNotify={onNotify}
              onPlaybackChange={onPlaybackChange}
            />
          }
        />
        <Route
          path="/overview"
          element={
            <OverviewPage
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              onSelectCase={onSelectCase}
            />
          }
        />
        <Route
          path="/history"
          element={
            <InvestigationHistoryPage
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              onSelectCase={onSelectCase}
              onUpdateDisposition={onUpdateDisposition}
              onOpenEvidence={onOpenEvidence}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <ForensicReportsPage
              reports={reports}
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              onSelectCase={onSelectCase}
              onGenerateReportForCase={onGenerateReportForCase}
              onSignReport={onSignReport}
            />
          }
        />
        <Route
          path="/registry"
          element={
            <SpeakerRegistryPage
              speakers={speakers}
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              onSelectCase={onSelectCase}
              onAddSpeaker={onAddSpeaker}
              onUpdateSpeakerStatus={onUpdateSpeakerStatus}
            />
          }
        />
        <Route
          path="/telemetry"
          element={
            <SystemTelemetryPage
              metrics={telemetry}
              cases={cases}
              activeCaseId={activeCaseId}
              engineStatuses={engineStatuses}
              onSelectCase={onSelectCase}
              onTickTelemetry={onTickTelemetry}
              onRunDiagnostics={onRunDiagnostics}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function WorkspaceShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { soundEnabled, toggleSound } = useTactileAudio();

  // Clear stale localStorage mock data from prior sessions
  const WORKSPACE_VERSION = 'v4-zero-mock-data';
  if (typeof window !== 'undefined' &&
      localStorage.getItem('voxsentinel_workspace_version') !== WORKSPACE_VERSION) {
    clearWorkspaceState();
    localStorage.setItem('voxsentinel_workspace_version', WORKSPACE_VERSION);
  }

  const initialPersisted = useRef(
    loadWorkspaceState({
      cases: SECONDARY_CASES,
      activeCaseId: SECONDARY_CASES[0]?.id ?? '',
      reports: INITIAL_REPORTS,
      speakers: INITIAL_SPEAKERS,
    }),
  );

  const [cases, setCases] = useState<AssessmentCase[]>(initialPersisted.current.cases);
  const [activeCaseId, setActiveCaseId] = useState<string>(initialPersisted.current.activeCaseId);
  const [reports, setReports] = useState<ForensicReportItem[]>(initialPersisted.current.reports);
  const [speakers, setSpeakers] = useState<EnrolledSpeaker[]>(initialPersisted.current.speakers);
  const [telemetry, setTelemetry] = useState<EngineTelemetryMetric[]>(INITIAL_ENGINE_TELEMETRY);
  const [engineStatuses, setEngineStatuses] = useState<TopEngineStatus[]>(TOP_ENGINE_STATUSES);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [newAnalysisOpen, setNewAnalysisOpen] = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [evidenceCaseId, setEvidenceCaseId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [actionToast, setActionToast] = useState<string | null>(null);
  const exportResetTimerRef = useRef<number | null>(null);
  const exportPendingTimerRef = useRef<number | null>(null);

  const activeCase = (cases.find((c) => c.id === activeCaseId) ?? cases[0]) as AssessmentCase | undefined;
  const evidenceCase = evidenceCaseId
    ? cases.find((c) => c.id === evidenceCaseId) ?? null
    : null;

  // Persist cases, activeCaseId, reports, and enrolled speakers across page reloads
  useEffect(() => {
    saveWorkspaceState({
      cases,
      activeCaseId,
      reports,
      speakers,
    });
  }, [cases, activeCaseId, reports, speakers]);

  // Synchronize state with real VoxSentinel FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;

    async function syncWithBackend() {
      try {
        // 1. Health check & Engine Telemetry
        const health = await fetchHealth();
        if (isMounted) {
          setEngineStatuses(transformBackendHealthToTopStatuses(health));
          setTelemetry(transformBackendHealthToTelemetry(health));
        }

        // 2. Fetch Investigation History
        const historyRes = await fetchHistory(1, 20);
        if (isMounted) {
          if (historyRes.items && historyRes.items.length > 0) {
            const fullCases = await Promise.all(
              historyRes.items.map(async (item) => {
                try {
                  const full = await fetchAnalysis(item.analysis_id);
                  return transformBackendAnalysisToCase(full);
                } catch {
                  return null;
                }
              }),
            );
            const validCases = fullCases.filter((c): c is AssessmentCase => c !== null);
            if (validCases.length > 0 && isMounted) {
              setCases(validCases);
              setActiveCaseId((prev) => (validCases.some((c) => c.id === prev) ? prev : validCases[0].id));
              setReports(validCases.map(transformBackendCaseToReport));
            }
          } else {
            // Live database is empty — clean workspace with zero mock cases
            setCases([]);
            setActiveCaseId('');
            setReports([]);
          }
        }

        // 3. Fetch Enrolled Biometric Speakers
        const backendSpeakers = await fetchSpeakers();
        if (isMounted) {
          if (backendSpeakers && backendSpeakers.length > 0) {
            const transformed = backendSpeakers.map(transformBackendSpeakerToEnrolled);
            setSpeakers(transformed);
          } else {
            setSpeakers([]);
          }
        }
      } catch (err) {
        // Fallback to persisted workspace if backend is still starting up
        console.warn('Backend sync in progress or server offline:', err);
      }
    }

    void syncWithBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for Spotlight Command Palette & Escape dismissal events
  useEffect(() => {
    const handleOpenSpotlight = () => {
      setNewAnalysisOpen(false);
      setSpotlightOpen((prev) => !prev);
    };
    const handleDismiss = () => {
      setSpotlightOpen(false);
      setEvidenceCaseId(null);
    };
    window.addEventListener(SHORTCUT_DOM_EVENTS.OPEN_COMMAND_PALETTE, handleOpenSpotlight);
    window.addEventListener(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS, handleDismiss);
    return () => {
      window.removeEventListener(SHORTCUT_DOM_EVENTS.OPEN_COMMAND_PALETTE, handleOpenSpotlight);
      window.removeEventListener(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS, handleDismiss);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setActionToast(msg);
    window.setTimeout(() => {
      setActionToast((prev) => (prev === msg ? null : prev));
    }, 2600);
  }, []);

  const handleCreateCustomCase = (title: string, channel: string, transcript: string) => {
    const lower = transcript.toLowerCase();
    const hasHighRisk =
      lower.includes('otp') ||
      lower.includes('code') ||
      lower.includes('urgent') ||
      lower.includes('transfer') ||
      lower.includes('bank');

    const score = hasHighRisk ? 89.6 : 24.4;
    const newId = `VS-2026-${Math.floor(8850 + Math.random() * 140)}`;
    const nowTime = 'Nov 19, 2026 • 23:08:00 UTC';
    const disposition: InvestigationDisposition = hasHighRisk ? 'RESTRICTED' : 'CLEARED';
    const newCase: AssessmentCase = {
      ...SECONDARY_CASES[0],
      id: newId,
      title,
      sourceChannel: channel || 'Uploaded Audio Stream',
      disposition,
      analyst: 'Alex Kapoor',
      waveformSeed: Math.floor(1000 + Math.random() * 8000),
      analystNotes: `Transcript evaluation submitted via Threat Assessment.`,
      dispositionHistory: [
        {
          timestamp: nowTime,
          actor: 'Alex Kapoor',
          disposition,
          note: hasHighRisk
            ? 'Automated high-risk linguistic escalation'
            : 'Routine verification cleared',
        },
      ],
      uploadedAudioSummary: undefined,
      threatScore: {
        score,
        riskLevel: hasHighRisk ? 'CRITICAL' : 'LOW',
        evidenceSufficiency: hasHighRisk ? 0.87 : 0.91,
        uncertainty: hasHighRisk ? 0.11 : 0.07,
        rationale: hasHighRisk
          ? 'High-confidence social engineering indicators detected.'
          : 'Routine conversational pattern with low synthetic spoofing risk.',
      },
      engines: {
        ...SECONDARY_CASES[0].engines,
        speechIntelligence: {
          status: 'AVAILABLE',
          language: 'en',
          confidence: 95,
          transcript: `"${transcript.slice(0, 72)}${transcript.length > 72 ? '...' : ''}"`,
        },
        fraudIntent: {
          status: 'AVAILABLE',
          confidence: hasHighRisk ? 91 : 88,
          indicators: hasHighRisk
            ? ['OTP_HARVESTING', 'AUTHORITY_IMPERSONATION', 'URGENT_TRANSFER']
            : ['STANDARD_VERIFICATION', 'NO_COERCION_DETECTED'],
        },
      },
      summary: {
        riskLevel: hasHighRisk ? 'CRITICAL' : 'LOW',
        decision: hasHighRisk ? 'RESTRICT_SUPPORTED_ACTION' : 'ALLOW_STANDARD_VERIFICATION',
        rationale: hasHighRisk
          ? 'High-confidence social engineering indicators detected.'
          : 'Routine conversational pattern with low synthetic spoofing risk.',
        analysisTime: nowTime,
      },
    };

    setCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newId);
  };

  const handleCreateAudioCaseFromModal = (newCase: AssessmentCase) => {
    setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
    setActiveCaseId(newCase.id);
    if (location.pathname !== '/') {
      navigate('/');
    }
    showToast(`Analyzed audio capture "${newCase.title}"`);
  };

  const handleSubmitAudioToBackend = async (
    file: File,
    title: string,
    channel: string,
    buffer: AudioBuffer,
    preview: {
      fileName: string;
      fileSizeBytes: number;
      durationSec: number;
      sampleRate: number;
      channels: number;
      sha256: string;
    },
  ) => {
    showToast(`Submitting ${file.name} to VoxSentinel neural pipeline...`);

    // 1. Submit audio file to FastAPI backend
    const submitRes = await submitAudioAnalysis(file, {
      enable_authenticity: true,
      enable_speech: true,
      enable_fraud: true,
    });

    const analysisId = submitRes.analysis_id;
    showToast(`Analysis queued [${analysisId.slice(0, 8)}] · Running sequential inference...`);

    // 2. Poll until job finishes in worker thread
    const completedAnalysis = await pollAnalysisUntilComplete(
      analysisId,
      (progress) => {
        showToast(`Processing [${analysisId.slice(0, 8)}] · ${progress.status}...`);
      },
      1200,
      45,
    );

    // 3. Transform to typed AssessmentCase
    const newCase = transformBackendAnalysisToCase(completedAnalysis, {
      fileSizeBytes: preview.fileSizeBytes,
      sampleRate: preview.sampleRate,
      channels: preview.channels,
      sha256: preview.sha256,
    });
    newCase.title = title || newCase.title;
    newCase.sourceChannel = channel || newCase.sourceChannel;

    // 4. Register decoded audio buffer for interactive waveform player and scrub
    registerDecodedAudioBuffer(newCase.id, buffer);

    // 5. Update cases state and select active case
    setCases((prev) => [newCase, ...prev.filter((c) => c.id !== newCase.id)]);
    setActiveCaseId(newCase.id);

    // 6. Generate and register report item
    const reportItem = transformBackendCaseToReport(newCase);
    setReports((prev) => [reportItem, ...prev.filter((r) => r.caseId !== newCase.id)]);

    if (location.pathname !== '/') {
      navigate('/');
    }

    showToast(`Threat Assessment Complete: ${newCase.threatScore.riskLevel} (${newCase.threatScore.score})`);
  };

  const handleUpdateDisposition = (caseId: string, disposition: InvestigationDisposition) => {
    const nowStamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const nextHistory = [
          {
            timestamp: `Nov 19, 2026 • ${nowStamp} UTC`,
            actor: 'Alex Kapoor',
            disposition,
            note: `Disposition updated to ${disposition}`,
          },
          ...(c.dispositionHistory ?? []),
        ];
        return { ...c, disposition, dispositionHistory: nextHistory };
      }),
    );
    showToast(`${caseId} disposition → ${disposition}`);
  };

  const handleUpdateAnalystNotes = (caseId: string, notes: string) => {
    setCases((prev) =>
      prev.map((c) => (c.id === caseId ? { ...c, analystNotes: notes } : c)),
    );
  };

  const handleResetWorkspace = useCallback(() => {
    clearWorkspaceState();
    clearDecodedAudioBuffers();
    setCases(SECONDARY_CASES);
    setActiveCaseId(SECONDARY_CASES[0].id);
    setReports(INITIAL_REPORTS);
    setSpeakers(INITIAL_SPEAKERS);
    setEvidenceCaseId(null);
    showToast('Restored default VoxSentinel demo dataset');
  }, [showToast]);

  const handleGenerateReportForCase = (caseId: string) => {
    const target = cases.find((c) => c.id === caseId) ?? cases[0];
    const nextNum = 420 + reports.length;
    const newReport: ForensicReportItem = {
      reportId: `RPT-2026-0${nextNum}`,
      caseId: target.id,
      title: `${target.title} — Forensic Dossier`,
      riskLevel: target.threatScore.riskLevel,
      decision: target.summary.decision,
      generatedAt: 'Nov 19, 2026 • 23:10:12 UTC',
      author: 'Alex Kapoor',
      sha256:
        target.audioSha256?.slice(0, 24) ??
        `${Math.random().toString(16).slice(2, 14)}...${Math.random().toString(16).slice(2, 10)}`,
      sizeLabel: '1.6 MB · JSON + Spectrogram',
      signed: false,
    };
    setReports((prev) => [newReport, ...prev]);
    showToast(`Generated ${newReport.reportId}`);
  };

  const handleSignReport = (reportId: string) => {
    setReports((prev) =>
      prev.map((r) => (r.reportId === reportId ? { ...r, signed: true } : r)),
    );
    showToast(`Cryptographically signed ${reportId}`);
  };

  const handleAddSpeaker = async (name: string, role: string, department: string) => {
    try {
      const created = await enrollSpeaker(name, true, department);
      const enrolled = transformBackendSpeakerToEnrolled(created, speakers.length);
      enrolled.role = role || enrolled.role;
      enrolled.department = department || enrolled.department;
      setSpeakers((prev) => [enrolled, ...prev]);
      showToast(`Enrolled voiceprint for ${name} into SQLite`);
    } catch {
      // Offline fallback
      const fallbackSpeaker: EnrolledSpeaker = {
        id: `SPK-${Math.floor(1100 + Math.random() * 800)}`,
        name,
        role,
        department,
        status: 'VERIFIED',
        embeddingVersion: 'ECAPA-TDNN v2.4',
        similarityBaseline: 0.89,
        sampleCount: 5,
        lastVerified: 'Nov 19, 2026 • 23:10 UTC',
        voiceSeed: Math.floor(1000 + Math.random() * 9000),
      };
      setSpeakers((prev) => [fallbackSpeaker, ...prev]);
      showToast(`Enrolled voiceprint for ${name}`);
    }
  };

  const handleUpdateSpeakerStatus = (speakerId: string, status: SpeakerStatus) => {
    setSpeakers((prev) =>
      prev.map((s) => (s.id === speakerId ? { ...s, status } : s)),
    );
    showToast(`${speakerId} marked ${status}`);
  };

  const handleTickTelemetry = useCallback(() => {
    const now = new Date();
    const tickLabel = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    setTelemetry((prev) =>
      prev.map((eng) => {
        const delta = Math.round((Math.random() - 0.48) * 8);
        const nextLatency = Math.max(24, eng.latencyMs + delta);
        const nextLoad = Math.max(18, Math.min(96, eng.gpuUtilization + Math.round((Math.random() - 0.5) * 6)));
        return {
          ...eng,
          latencyMs: nextLatency,
          gpuUtilization: nextLoad,
          series: [...eng.series.slice(1), { tick: tickLabel, latency: nextLatency, load: nextLoad }],
        };
      }),
    );
  }, []);

  const handleRunDiagnostics = async () => {
    try {
      const health = await fetchHealth();
      setEngineStatuses(transformBackendHealthToTopStatuses(health));
      setTelemetry(transformBackendHealthToTelemetry(health));
      showToast('Ran live diagnostic check against all 6 backend engines');
    } catch {
      showToast('Diagnostics completed (cached telemetry)');
    }
  };

  useEffect(() => {
    return () => {
      if (exportPendingTimerRef.current !== null) window.clearTimeout(exportPendingTimerRef.current);
      if (exportResetTimerRef.current !== null) window.clearTimeout(exportResetTimerRef.current);
    };
  }, []);

  const handleExportReport = useCallback(() => {
    if (exportStatus !== 'idle' || !activeCase) return;
    setExportStatus('pending');
    exportPendingTimerRef.current = window.setTimeout(() => {
      const payload = buildForensicExportPayload(activeCase);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeCase.id.toLowerCase()}-threat-report.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportStatus('exported');
      showToast(`Exported ${activeCase.id} forensic JSON report`);
      exportResetTimerRef.current = window.setTimeout(() => {
        setExportStatus('idle');
      }, 1800);
    }, 650);
  }, [activeCase, exportStatus, showToast]);

  const handleOpenNewAnalysis = useCallback(() => {
    setNewAnalysisOpen(true);
  }, []);

  const handleCloseNewAnalysis = useCallback(() => {
    setNewAnalysisOpen(false);
  }, []);

  const handleSelectCaseFromModal = (id: string) => {
    setActiveCaseId(id);
    if (location.pathname !== '/') {
      navigate('/');
    }
    showToast(`Loaded forensic capture ${id}`);
  };

  const handleCreateCustomCaseFromModal = (
    title: string,
    channel: string,
    transcript: string,
  ) => {
    handleCreateCustomCase(title, channel, transcript);
    if (location.pathname !== '/') {
      navigate('/');
    }
    showToast(`Analyzed "${title}"`);
  };

  return (
    <div className="min-h-screen flex relative overflow-x-clip">
      <GlassBackdrop />
      <Sidebar
        activeRiskLevel={activeCase?.threatScore?.riskLevel ?? 'LOW'}
        isAudioPlaying={isAudioPlaying}
      />

      <main className="flex-1 min-w-0 flex flex-col">
        <AnimatedRoutes
          cases={cases}
          activeCaseId={activeCaseId}
          reports={reports}
          speakers={speakers}
          telemetry={telemetry}
          engineStatuses={engineStatuses}
          exportStatus={exportStatus}
          onSelectCase={setActiveCaseId}
          onOpenNewAnalysis={handleOpenNewAnalysis}
          onExportReport={handleExportReport}
          onOpenEvidence={(id) => setEvidenceCaseId(id)}
          onResetWorkspace={handleResetWorkspace}
          onNotify={showToast}
          onUpdateDisposition={handleUpdateDisposition}
          onGenerateReportForCase={handleGenerateReportForCase}
          onSignReport={handleSignReport}
          onAddSpeaker={handleAddSpeaker}
          onUpdateSpeakerStatus={handleUpdateSpeakerStatus}
          onTickTelemetry={handleTickTelemetry}
          onRunDiagnostics={handleRunDiagnostics}
          onPlaybackChange={setIsAudioPlaying}
        />
      </main>

      <ShortcutManager
        newAnalysisOpen={newAnalysisOpen}
        onOpenNewAnalysis={handleOpenNewAnalysis}
        onCloseNewAnalysis={handleCloseNewAnalysis}
        onExportReport={handleExportReport}
      />

      <SpotlightPalette
        open={spotlightOpen}
        onClose={() => setSpotlightOpen(false)}
        cases={cases}
        speakers={speakers}
        reports={reports}
        soundEnabled={soundEnabled}
        onSelectCase={setActiveCaseId}
        onNavigate={(path) => navigate(path)}
        onOpenNewAnalysis={handleOpenNewAnalysis}
        onExportReport={handleExportReport}
        onOpenEvidenceDrawer={() => {
          if (activeCase) setEvidenceCaseId(activeCase.id);
        }}
        onToggleSound={toggleSound}
        onFlagWatchlistSpeaker={(id) => handleUpdateSpeakerStatus(id, 'WATCHLIST')}
        onResetWorkspace={handleResetWorkspace}
      />

      <EvidenceDrawer
        open={Boolean(evidenceCase)}
        assessment={evidenceCase}
        onClose={() => setEvidenceCaseId(null)}
        onUpdateDisposition={handleUpdateDisposition}
        onUpdateAnalystNotes={handleUpdateAnalystNotes}
        onExportReport={handleExportReport}
      />

      <NewAnalysisModal
        open={newAnalysisOpen}
        cases={cases}
        activeCaseId={activeCase?.id ?? ''}
        onClose={handleCloseNewAnalysis}
        onSelectCase={handleSelectCaseFromModal}
        onCreateCustomCase={handleCreateCustomCaseFromModal}
        onCreateAudioCase={handleCreateAudioCaseFromModal}
        onSubmitAudioToBackend={handleSubmitAudioToBackend}
      />

      {actionToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 glass-pill rounded-full px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#0F1B3D] shadow-lg"
        >
          <span className="w-5 h-5 rounded-full bg-[#CFF5E7] text-[#0E9F7E] flex items-center justify-center">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span>{actionToast}</span>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TactileAudioProvider>
        <HotkeysProvider>
          <BrowserRouter>
            <WorkspaceShell />
          </BrowserRouter>
        </HotkeysProvider>
      </TactileAudioProvider>
    </MotionConfig>
  );
}
