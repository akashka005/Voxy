import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AudioWaveform,
  Command,
  CornerDownLeft,
  Download,
  FileText,
  FolderSearch,
  Layers,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Volume2,
  X,
} from 'lucide-react';
import type { AssessmentCase, EnrolledSpeaker, ForensicReportItem } from '../data';
import { SIDEBAR_NAV_ITEMS } from '../data';
import {
  filterCommandPaletteItems,
  type CommandPaletteCategory,
  type CommandPaletteItem,
} from '../utils/shortcuts';

interface SpotlightActionItem extends CommandPaletteItem {
  onExecute: () => void;
}

interface SpotlightPaletteProps {
  open: boolean;
  onClose: () => void;
  cases: AssessmentCase[];
  speakers: EnrolledSpeaker[];
  reports: ForensicReportItem[];
  soundEnabled: boolean;
  onSelectCase: (caseId: string) => void;
  onNavigate: (path: string) => void;
  onOpenNewAnalysis: () => void;
  onExportReport: () => void;
  onOpenEvidenceDrawer: () => void;
  onToggleSound: () => void;
  onFlagWatchlistSpeaker: (speakerId: string) => void;
  onResetWorkspace: () => void;
}

const CATEGORY_ORDER: CommandPaletteCategory[] = [
  'Actions',
  'Cases',
  'Speakers',
  'Reports',
  'Modules',
];

export function SpotlightPalette({
  open,
  onClose,
  cases,
  speakers,
  reports,
  soundEnabled,
  onSelectCase,
  onNavigate,
  onOpenNewAnalysis,
  onExportReport,
  onOpenEvidenceDrawer,
  onToggleSound,
  onFlagWatchlistSpeaker,
  onResetWorkspace,
}: SpotlightPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      const t = window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const allItems = useMemo<SpotlightActionItem[]>(() => {
    const items: SpotlightActionItem[] = [
      {
        id: 'act-new-analysis',
        category: 'Actions',
        title: 'New Voice Threat Analysis',
        subtitle: 'Upload .wav/.mp3/.m4a audio or evaluate a call transcript',
        badge: '⌘N',
        badgeTone: 'neutral',
        keywords: 'upload wav mp3 m4a ingest record create',
        onExecute: () => {
          onClose();
          onOpenNewAnalysis();
        },
      },
      {
        id: 'act-export-report',
        category: 'Actions',
        title: 'Export Active Forensic Report',
        subtitle: 'Download signed JSON evidence dossier with analyst notes',
        badge: '⌘E',
        badgeTone: 'neutral',
        keywords: 'download json bundle dossier',
        onExecute: () => {
          onClose();
          onExportReport();
        },
      },
      {
        id: 'act-evidence-drawer',
        category: 'Actions',
        title: 'Open Case Evidence & Notes Drawer',
        subtitle: 'Inspect SHA-256 checksum, confidence breakdown, and disposition log',
        badge: 'INSPECT',
        badgeTone: 'safe',
        keywords: 'sha256 audit timeline notes disposition',
        onExecute: () => {
          onClose();
          onNavigate('/');
          onOpenEvidenceDrawer();
        },
      },
      {
        id: 'act-toggle-audio',
        category: 'Actions',
        title: soundEnabled ? 'Mute Tactile UI Audio' : 'Enable Tactile UI Audio',
        subtitle: 'Toggle synthesized forensic clicks and hover tones',
        badge: soundEnabled ? 'ON' : 'OFF',
        badgeTone: 'neutral',
        keywords: 'sound feedback web audio hover click',
        onExecute: () => {
          onToggleSound();
          onClose();
        },
      },
      {
        id: 'act-reset-workspace',
        category: 'Actions',
        title: 'Reset Workspace to Default Demo Data',
        subtitle: 'Clear persisted local cases, notes, and dispositions',
        badge: 'RESET',
        badgeTone: 'warn',
        keywords: 'clear storage defaults restore',
        onExecute: () => {
          onResetWorkspace();
          onClose();
        },
      },
    ];

    for (const c of cases) {
      const isDanger = c.threatScore.riskLevel === 'CRITICAL' || c.threatScore.riskLevel === 'HIGH';
      items.push({
        id: `case-${c.id}`,
        category: 'Cases',
        title: c.title,
        subtitle: `${c.id} · ${c.sourceChannel} · ${c.disposition}`,
        badge: `${c.threatScore.score.toFixed(1)} ${c.threatScore.riskLevel}`,
        badgeTone: isDanger ? 'danger' : 'safe',
        keywords: `${c.engines.speechIntelligence.transcript} ${c.engines.fraudIntent.indicators.join(' ')}`,
        onExecute: () => {
          onSelectCase(c.id);
          onNavigate('/');
          onClose();
        },
      });
    }

    for (const spk of speakers) {
      items.push({
        id: `spk-${spk.id}`,
        category: 'Speakers',
        title: spk.name,
        subtitle: `${spk.id} · ${spk.role} (${spk.department})`,
        badge: spk.status,
        badgeTone:
          spk.status === 'WATCHLIST' ? 'danger' : spk.status === 'VERIFIED' ? 'safe' : 'warn',
        keywords: `${spk.embeddingVersion} cosine ${(spk.similarityBaseline * 100).toFixed(0)}%`,
        onExecute: () => {
          onNavigate('/registry');
          onClose();
        },
      });

      if (spk.status !== 'WATCHLIST') {
        items.push({
          id: `flag-spk-${spk.id}`,
          category: 'Actions',
          title: `Flag ${spk.name} to Watchlist`,
          subtitle: `Update ECAPA-TDNN status for ${spk.id} to WATCHLIST`,
          badge: 'WATCHLIST',
          badgeTone: 'danger',
          keywords: `flag watchlist alert ${spk.name}`,
          onExecute: () => {
            onFlagWatchlistSpeaker(spk.id);
            onNavigate('/registry');
            onClose();
          },
        });
      }
    }

    for (const rep of reports) {
      items.push({
        id: `rep-${rep.reportId}`,
        category: 'Reports',
        title: rep.title,
        subtitle: `${rep.reportId} · ${rep.author} · ${rep.signed ? 'Signed Seal' : 'Draft'}`,
        badge: rep.signed ? 'SIGNED' : 'DRAFT',
        badgeTone: rep.signed ? 'safe' : 'warn',
        keywords: `${rep.caseId} ${rep.decision} ${rep.sha256}`,
        onExecute: () => {
          onNavigate('/reports');
          onClose();
        },
      });
    }

    for (const nav of SIDEBAR_NAV_ITEMS) {
      items.push({
        id: `mod-${nav.path}`,
        category: 'Modules',
        title: `Go to ${nav.label}`,
        subtitle: `Switch workspace view to ${nav.label}`,
        badge: 'MODULE',
        badgeTone: 'neutral',
        keywords: nav.iconName,
        onExecute: () => {
          onNavigate(nav.path);
          onClose();
        },
      });
    }

    return items;
  }, [
    cases,
    speakers,
    reports,
    soundEnabled,
    onClose,
    onOpenNewAnalysis,
    onExportReport,
    onOpenEvidenceDrawer,
    onToggleSound,
    onResetWorkspace,
    onSelectCase,
    onNavigate,
    onFlagWatchlistSpeaker,
  ]);

  const filtered = useMemo(
    () => filterCommandPaletteItems(allItems, query).slice(0, 14),
    [allItems, query],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const grouped = useMemo(() => {
    const groups: { category: CommandPaletteCategory; items: { item: SpotlightActionItem; flatIdx: number }[] }[] = [];
    let cursor = 0;
    for (const cat of CATEGORY_ORDER) {
      const matched = filtered.filter((it) => it.category === cat);
      if (matched.length > 0) {
        groups.push({
          category: cat,
          items: matched.map((item) => ({ item, flatIdx: cursor++ })),
        });
      }
    }
    return groups;
  }, [filtered]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filtered[activeIndex];
      if (target) target.onExecute();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const renderCategoryIcon = (cat: CommandPaletteCategory, id: string) => {
    if (id === 'act-new-analysis') return <Plus className="w-4 h-4 text-[#2563EB]" />;
    if (id === 'act-export-report') return <Download className="w-4 h-4 text-[#0E9F7E]" />;
    if (id === 'act-evidence-drawer') return <SlidersHorizontal className="w-4 h-4 text-[#7C3AED]" />;
    if (id === 'act-toggle-audio') return <Volume2 className="w-4 h-4 text-[#2563EB]" />;
    if (id === 'act-reset-workspace') return <RotateCcw className="w-4 h-4 text-[#D97706]" />;
    if (id.startsWith('flag-spk-')) return <ShieldAlert className="w-4 h-4 text-[#DC2626]" />;
    switch (cat) {
      case 'Cases':
        return <AudioWaveform className="w-4 h-4 text-[#2563EB]" />;
      case 'Speakers':
        return <Users className="w-4 h-4 text-[#7C3AED]" />;
      case 'Reports':
        return <FileText className="w-4 h-4 text-[#0E9F7E]" />;
      case 'Modules':
        return <Layers className="w-4 h-4 text-[#475577]" />;
      default:
        return <FolderSearch className="w-4 h-4 text-[#2563EB]" />;
    }
  };

  const badgeStyle = (tone?: SpotlightActionItem['badgeTone']) => {
    switch (tone) {
      case 'danger':
        return 'bg-[#FDD5DC] text-[#DC2626]';
      case 'safe':
        return 'bg-[#CFF5E7] text-[#0E9F7E]';
      case 'warn':
        return 'bg-[#FDE6B8] text-[#B7791F]';
      default:
        return 'bg-slate-100 text-[#475577] border border-slate-200/80';
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="VoxSentinel Spotlight Command Palette"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-[#0F1B3D]/28"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            className="w-full max-w-2xl rounded-[28px] bg-white/96 border border-white shadow-[0_32px_80px_rgba(15,27,61,0.28),inset_0_1.5px_0_rgba(255,255,255,1)] overflow-hidden"
          >
            {/* Spotlight Search Input Row */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200/75 bg-gradient-to-b from-white to-[#F6F9FF]">
              <Search className="w-5 h-5 text-[#2563EB] shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to cases, speakers, reports, or run an action..."
                aria-label="Spotlight command palette search"
                className="flex-1 bg-transparent text-[15.5px] font-medium text-[#0F1B3D] placeholder:text-[#6B7A9E] focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear Spotlight search"
                  className="w-7 h-7 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-[#5B6785]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 rounded-lg bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-[#5B6785] hover:text-[#0F1B3D]"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[54vh] overflow-y-auto p-3 space-y-3">
              {grouped.length === 0 ? (
                <div className="py-12 text-center text-[13.5px] text-[#5B6785]">
                  No cases, speakers, reports, or actions match “{query}”.
                </div>
              ) : (
                grouped.map((group) => (
                  <div key={group.category}>
                    <div className="px-3 pb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#5B6785]">
                      {group.category}
                    </div>
                    <div className="space-y-1">
                      {group.items.map(({ item, flatIdx }) => {
                        const isActive = flatIdx === activeIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={item.onExecute}
                            className={`w-full text-left px-3.5 py-2.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isActive
                                ? 'bg-[#EFF6FF] border-[#93C5FD] shadow-[0_4px_14px_rgba(37,99,235,0.1)]'
                                : 'bg-transparent border-transparent hover:bg-slate-100/75'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
                                {renderCategoryIcon(item.category, item.id)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[13.5px] font-semibold text-[#0F1B3D] truncate">
                                  {item.title}
                                </div>
                                <div className="text-[11.5px] text-[#5B6785] truncate">
                                  {item.subtitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {item.badge && (
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${badgeStyle(
                                    item.badgeTone,
                                  )}`}
                                >
                                  {item.badge}
                                </span>
                              )}
                              {isActive && (
                                <CornerDownLeft
                                  className="w-3.5 h-3.5 text-[#2563EB]"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Hints */}
            <div className="px-5 py-2.5 border-t border-slate-200/75 bg-[#F8FAFF] flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#5B6785]">
              <div className="inline-flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                <span>Use ↑↓ arrow keys to navigate, Enter to run or jump</span>
              </div>
              <span className="font-medium text-[#394563] tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
