import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Keyboard, RotateCcw, Search, ShieldCheck, Volume2, VolumeX, X } from 'lucide-react';
import type { AssessmentCase, TopEngineStatus } from '../data';
import { filterAnalyses } from '../utils/forensics';
import {
  APP_SHORTCUTS,
  detectMacOS,
  formatShortcutBadge,
  SHORTCUT_DOM_EVENTS,
} from '../utils/shortcuts';
import { useTactileAudio } from './TactileAudioProvider';

interface TopBarProps {
  statuses: TopEngineStatus[];
  cases: AssessmentCase[];
  activeCaseId: string;
  onSelectCase: (caseId: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onResetWorkspace?: () => void;
}

export function TopBar({
  statuses,
  cases,
  activeCaseId,
  onSelectCase,
  searchQuery,
  onSearchChange,
  onResetWorkspace,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeProfileRole, setActiveProfileRole] = useState('Lead Forensic Analyst');
  const { soundEnabled, toggleSound } = useTactileAudio();

  const isMac = useMemo(() => detectMacOS(), []);
  const searchShortcutHint = useMemo(
    () => formatShortcutBadge(APP_SHORTCUTS.find((s) => s.id === 'focus-search')!, isMac),
    [isMac],
  );
  const helpShortcutHint = useMemo(
    () => formatShortcutBadge(APP_SHORTCUTS.find((s) => s.id === 'toggle-help')!, isMac),
    [isMac],
  );

  useEffect(() => {
    const handleFocusSearch = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    const handleDismissPopovers = () => {
      setSearchFocused(false);
      setProfileOpen(false);
      inputRef.current?.blur();
    };
    window.addEventListener(SHORTCUT_DOM_EVENTS.FOCUS_SEARCH, handleFocusSearch);
    window.addEventListener(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS, handleDismissPopovers);
    return () => {
      window.removeEventListener(SHORTCUT_DOM_EVENTS.FOCUS_SEARCH, handleFocusSearch);
      window.removeEventListener(SHORTCUT_DOM_EVENTS.DISMISS_POPOVERS, handleDismissPopovers);
    };
  }, []);

  const filteredCases = filterAnalyses(cases, searchQuery);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 mb-3.5 relative z-30">
      {/* Search Pill */}
      <div className="relative w-full sm:w-[292px] 2xl:w-[306px]">
        <div className="glass-pill rounded-full h-11 px-3.5 flex items-center gap-2 focus-within:ring-2 focus-within:ring-[#3B9BF0]/60">
          <Search className="w-4 h-4 text-[#5B6785] shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 160)}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search analyses, reports..."
            aria-label="Search analyses and reports"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-[#0F1B3D] placeholder:text-[#5B6785] focus:outline-none"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="text-[#5B6785] hover:text-[#0F1B3D] p-0.5 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent(SHORTCUT_DOM_EVENTS.OPEN_COMMAND_PALETTE))
              }
              aria-label="Open Spotlight Command Palette"
              title={`Open Command Palette (${searchShortcutHint})`}
              className="shrink-0 px-1.5 py-0.5 rounded-md bg-white/75 border border-white text-[11px] font-semibold text-[#5B6785] hover:text-[#0F1B3D] tracking-wider whitespace-nowrap transition-colors"
            >
              {searchShortcutHint}
            </button>
          )}
        </div>

        {/* Search Quick-Jump Dropdown */}
        {searchFocused && (
          <div
            role="listbox"
            aria-label="Matching voice analyses"
            className="absolute left-0 right-0 mt-2 rounded-[22px] bg-white/96 border border-white shadow-[0_18px_48px_rgba(25,45,105,0.2),inset_0_1px_0_rgba(255,255,255,1)] p-2 z-40"
          >
            <div className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#5B6785]">
              {searchQuery ? 'Matching Analyses' : 'Recent Analyses'}
            </div>
            {filteredCases.length === 0 ? (
              <div className="px-3 py-3 text-[13px] text-[#5B6785]">
                No analyses matching “{searchQuery}”.
              </div>
            ) : (
              filteredCases.map((item) => {
                const isSelected = item.id === activeCaseId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onMouseDown={() => {
                      onSelectCase(item.id);
                      onSearchChange('');
                      setSearchFocused(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                        : 'hover:bg-slate-100/75 text-[#0F1B3D]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold truncate">{item.title}</div>
                      <div className="text-[11px] text-[#5B6785] truncate">
                        {item.id} · {item.sourceChannel}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        item.threatScore.riskLevel === 'CRITICAL'
                          ? 'bg-[#FDD5DC] text-[#DC2626]'
                          : 'bg-[#CFF5E7] text-[#0E9F7E]'
                      }`}
                    >
                      {item.threatScore.score.toFixed(1)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Engine Status Pills + User Avatar */}
      <div className="flex flex-wrap items-center gap-2 2xl:gap-2.5">
        {statuses.map((engine) => {
          const isDegraded = engine.status === 'Degraded';
          return (
            <div
              key={engine.id}
              className="glass-pill rounded-full h-11 px-3 2xl:px-3.5 flex items-center gap-2 shrink-0"
              title={`${engine.name}: ${engine.status}`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                  isDegraded ? 'bg-[#F59E0B]/20' : 'bg-[#14B89A]/20'
                }`}
                aria-hidden="true"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isDegraded ? 'bg-[#F59E0B]' : 'bg-[#14B89A]'
                  }`}
                />
              </span>
              <div className="leading-tight whitespace-nowrap">
                <div className="text-[12.5px] font-semibold text-[#0F1B3D] leading-[1.15]">
                  {engine.name}
                </div>
                <div
                  className={`text-[11px] font-medium leading-[1.15] ${
                    isDegraded ? 'text-[#B7791F]' : 'text-[#5B6785]'
                  }`}
                >
                  {engine.status}
                </div>
              </div>
            </div>
          );
        })}

        {/* Global Keyboard Shortcuts Guide Button */}
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(new CustomEvent(SHORTCUT_DOM_EVENTS.OPEN_SHORTCUT_GUIDE))
          }
          aria-label="Keyboard shortcuts"
          title={`Keyboard shortcuts (${helpShortcutHint} or ?)`}
          className="glass-lens-orb rounded-full w-10 h-10 flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
        >
          <Keyboard className="w-4 h-4" aria-hidden="true" />
        </button>

        {/* Tactile UI Audio Feedback Toggle */}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundEnabled}
          aria-label={soundEnabled ? 'Mute tactile UI audio' : 'Enable tactile UI audio'}
          title={soundEnabled ? 'Tactile Audio: On' : 'Tactile Audio: Muted'}
          className="glass-lens-orb rounded-full w-10 h-10 flex items-center justify-center text-[#394563] hover:text-[#0F1B3D] shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
          ) : (
            <VolumeX className="w-4 h-4 text-[#5B6785]" aria-hidden="true" />
          )}
        </button>

        {/* User Avatar Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            aria-expanded={profileOpen}
            aria-label="Analyst account menu"
            className="flex items-center gap-1.5 pl-1 pr-1.5 py-1 rounded-full hover:bg-white/45 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B9BF0]"
          >
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2B3D6B] to-[#0F1B3D] text-white text-[13px] font-semibold flex items-center justify-center shadow-[0_8px_20px_rgba(15,27,61,0.3),inset_0_1.5px_0_rgba(255,255,255,0.45)] border border-white/80">
              AK
            </span>
            <ChevronDown className="w-4 h-4 text-[#475577]" aria-hidden="true" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 rounded-[22px] bg-white/96 border border-white shadow-[0_18px_48px_rgba(25,45,105,0.2),inset_0_1px_0_rgba(255,255,255,1)] p-2 z-40">
              <div className="px-3 py-2 border-b border-slate-200/70">
                <div className="text-[13px] font-semibold text-[#0F1B3D]">Alex Kapoor</div>
                <div className="text-[11.5px] text-[#5B6785]">{activeProfileRole}</div>
              </div>
              <div className="pt-1.5 space-y-1">
                {['Lead Forensic Analyst', 'SOC Escalation Reviewer'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setActiveProfileRole(role);
                      setProfileOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-[12.5px] flex items-center gap-2 transition-colors ${
                      activeProfileRole === role
                        ? 'bg-[#EFF6FF] text-[#1D4ED8] font-medium'
                        : 'text-[#394563] hover:bg-slate-100/75'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>{role}</span>
                  </button>
                ))}
                {onResetWorkspace && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetWorkspace();
                      setProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 mt-1 border-t border-slate-200/70 rounded-xl text-[12.5px] font-medium text-[#B7791F] hover:bg-[#FEF3C7]/60 flex items-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset Demo Data</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
