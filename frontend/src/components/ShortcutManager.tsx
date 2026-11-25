import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Command, CornerDownLeft, Keyboard, X } from 'lucide-react';
import {
  APP_SHORTCUTS,
  detectMacOS,
  getShortcutKeys,
  groupShortcutsByCategory,
  resolveModuleRouteByNumber,
  SHORTCUT_DOM_EVENTS,
  type AppShortcutDefinition,
} from '../utils/shortcuts';

interface ShortcutManagerProps {
  newAnalysisOpen: boolean;
  onOpenNewAnalysis: () => void;
  onCloseNewAnalysis: () => void;
  onExportReport: () => void;
}

export function ShortcutManager({
  newAnalysisOpen,
  onOpenNewAnalysis,
  onCloseNewAnalysis,
  onExportReport,
}: ShortcutManagerProps) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const isMac = useMemo(() => detectMacOS(), []);
  const groupedShortcuts = useMemo(() => groupShortcutsByCategory(APP_SHORTCUTS), []);

  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent(SHORTCUT_DOM_EVENTS.OPEN_COMMAND_PALETTE));
  };

  // Cmd/Ctrl + N -> Open New Analysis Modal from anywhere
  useHotkeys(
    'mod+n',
    () => {
      setHelpOpen(false);
      onOpenNewAnalysis();
    },
    {
      preventDefault: true,
      enableOnFormTags: false,
      description: 'Open New Analysis modal',
    },
  );

  // Cmd/Ctrl + E -> Export active forensic report from anywhere
  useHotkeys(
    'mod+e',
    () => {
      setHelpOpen(false);
      onExportReport();
    },
    {
      preventDefault: true,
      enableOnFormTags: false,
      description: 'Export active forensic report',
    },
  );

  // Cmd/Ctrl + K -> Open Spotlight Command Palette from anywhere
  useHotkeys(
    'mod+k',
    () => {
      setHelpOpen(false);
      onCloseNewAnalysis();
      openCommandPalette();
    },
    {
      preventDefault: true,
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      description: 'Open Spotlight Command Palette',
    },
  );

  // Cmd/Ctrl + / -> Toggle Keyboard Shortcuts guide
  useHotkeys(
    'mod+slash',
    () => {
      onCloseNewAnalysis();
      setHelpOpen((prev) => !prev);
    },
    {
      preventDefault: true,
      enableOnFormTags: false,
      description: 'Toggle keyboard shortcuts guide',
    },
  );

  // Shift + ? -> Toggle Keyboard Shortcuts guide
  useHotkeys(
    'shift+?',
    () => {
      onCloseNewAnalysis();
      setHelpOpen((prev) => !prev);
    },
    {
      preventDefault: true,
      useKey: true,
      enableOnFormTags: false,
      description: 'Toggle keyboard shortcuts guide (Shift+?)',
    },
  );

  // Alt + 1..6 -> Quick module navigation across all 6 sidebar routes
  useHotkeys(
    ['alt+1', 'alt+2', 'alt+3', 'alt+4', 'alt+5', 'alt+6'],
    (_event, handler) => {
      const slot = Number(handler.keys?.[0]);
      const targetPath = resolveModuleRouteByNumber(slot);
      if (targetPath) {
        setHelpOpen(false);
        onCloseNewAnalysis();
        navigate(targetPath);
      }
    },
    {
      preventDefault: true,
      enableOnFormTags: false,
      description: 'Navigate directly between VoxSentinel modules',
    },
  );

  // Escape -> Dismiss any active modal, search dropdown, or popover
  useHotkeys(
    'escape',
    () => {
      if (helpOpen) setHelpOpen(false);
      if (newAnalysisOpen) onCloseNewAnalysis();
      window.dispatchEvent(new CustomEvent(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS));
    },
    {
      enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
      description: 'Dismiss active overlay',
    },
  );

  // Allow TopBar button to open the shortcuts guide
  useEffect(() => {
    const handleOpenGuide = () => {
      onCloseNewAnalysis();
      setHelpOpen(true);
    };
    window.addEventListener(SHORTCUT_DOM_EVENTS.OPEN_SHORTCUT_GUIDE, handleOpenGuide);
    return () => {
      window.removeEventListener(SHORTCUT_DOM_EVENTS.OPEN_SHORTCUT_GUIDE, handleOpenGuide);
    };
  }, [onCloseNewAnalysis]);

  const executeShortcutAction = (shortcut: AppShortcutDefinition) => {
    setHelpOpen(false);
    switch (shortcut.id) {
      case 'new-analysis':
        onOpenNewAnalysis();
        break;
      case 'export-report':
        onExportReport();
        break;
      case 'focus-search':
        openCommandPalette();
        break;
      case 'nav-overview':
        navigate('/overview');
        break;
      case 'nav-assessment':
        navigate('/');
        break;
      case 'nav-history':
        navigate('/history');
        break;
      case 'nav-reports':
        navigate('/reports');
        break;
      case 'nav-registry':
        navigate('/registry');
        break;
      case 'nav-telemetry':
        navigate('/telemetry');
        break;
      case 'close-overlay':
        window.dispatchEvent(new CustomEvent(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS));
        break;
      case 'toggle-help':
        break;
    }
  };

  return (
    <AnimatePresence>
      {helpOpen && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcut-guide-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHelpOpen(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F1B3D]/28"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-2xl rounded-[28px] bg-white/96 border border-white shadow-[0_28px_72px_rgba(15,27,61,0.24),inset_0_1.5px_0_rgba(255,255,255,1)] p-6"
          >
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                  <Keyboard className="w-4.5 h-4.5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="shortcut-guide-title" className="text-[18px] font-semibold text-[#0F1B3D]">
                    Global Keyboard Shortcuts
                  </h2>
                  <p className="text-[12.5px] text-[#5B6785]">
                    Trigger primary forensic commands from any module ({isMac ? 'macOS ⌘' : 'Ctrl'} bindings active)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                aria-label="Close keyboard shortcuts guide"
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-[#5B6785] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-5 max-h-[62vh] overflow-y-auto pr-1">
              {groupedShortcuts.map((group) => (
                <div key={group.category}>
                  <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5B6785] mb-2">
                    {group.category}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const keys = getShortcutKeys(item, isMac);
                      const isTriggerable = item.id !== 'toggle-help';
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => executeShortcutAction(item)}
                          disabled={!isTriggerable}
                          className="group text-left p-3 rounded-2xl border border-slate-200/80 bg-[#F8FAFF]/75 hover:bg-[#EFF6FF]/90 hover:border-[#93C5FD] transition-colors flex items-center justify-between gap-3 disabled:opacity-80 disabled:cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
                        >
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#0F1B3D] flex items-center gap-1.5">
                              <span className="truncate">{item.label}</span>
                              {isTriggerable && (
                                <CornerDownLeft
                                  className="w-3 h-3 text-[#2563EB] opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                            <div className="text-[11.5px] text-[#5B6785] truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {keys.map((cap, idx) => (
                              <kbd
                                key={`${item.id}-${idx}`}
                                className="min-w-[24px] h-6 px-1.5 rounded-lg bg-white border border-slate-200/90 shadow-[0_1px_2px_rgba(15,27,61,0.08)] text-[11px] font-semibold text-[#0F1B3D] inline-flex items-center justify-center"
                              >
                                {cap}
                              </kbd>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[#5B6785]">
              <div className="inline-flex items-center gap-1.5">
                <Command className="w-3.5 h-3.5 text-[#2563EB]" aria-hidden="true" />
                <span>Shortcuts pause automatically while typing inside text fields (except Esc &amp; Search).</span>
              </div>
              <span className="font-medium text-[#394563]">Press Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
