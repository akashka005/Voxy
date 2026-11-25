export type ShortcutCategory = 'Primary Actions' | 'Navigation' | 'Workspace';

export interface AppShortcutDefinition {
  id:
    | 'new-analysis'
    | 'export-report'
    | 'focus-search'
    | 'toggle-help'
    | 'close-overlay'
    | 'nav-overview'
    | 'nav-assessment'
    | 'nav-history'
    | 'nav-reports'
    | 'nav-registry'
    | 'nav-telemetry';
  label: string;
  description: string;
  category: ShortcutCategory;
  hotkey: string;
  macKeys: string[];
  winKeys: string[];
}

export const MODULE_SHORTCUT_ROUTES: Record<number, { path: string; label: string }> = {
  1: { path: '/overview', label: 'Overview' },
  2: { path: '/', label: 'Threat Assessment' },
  3: { path: '/history', label: 'Investigation History' },
  4: { path: '/reports', label: 'Forensic Reports' },
  5: { path: '/registry', label: 'Speaker Registry' },
  6: { path: '/telemetry', label: 'System Telemetry' },
};

export const APP_SHORTCUTS: readonly AppShortcutDefinition[] = [
  {
    id: 'new-analysis',
    label: 'New Analysis',
    description: 'Open the voice threat ingestion & sample switcher modal from any page',
    category: 'Primary Actions',
    hotkey: 'mod+n',
    macKeys: ['⌘', 'N'],
    winKeys: ['Ctrl', 'N'],
  },
  {
    id: 'export-report',
    label: 'Export Report',
    description: 'Generate and download the active forensic JSON dossier',
    category: 'Primary Actions',
    hotkey: 'mod+e',
    macKeys: ['⌘', 'E'],
    winKeys: ['Ctrl', 'E'],
  },
  {
    id: 'focus-search',
    label: 'Command Palette',
    description: 'Open the Spotlight command palette to jump to cases, speakers, reports, or actions',
    category: 'Workspace',
    hotkey: 'mod+k',
    macKeys: ['⌘', 'K'],
    winKeys: ['Ctrl', 'K'],
  },
  {
    id: 'toggle-help',
    label: 'Keyboard Shortcuts',
    description: 'Open or close the global keyboard shortcut reference',
    category: 'Workspace',
    hotkey: 'mod+slash',
    macKeys: ['⌘', '/'],
    winKeys: ['Ctrl', '/'],
  },
  {
    id: 'close-overlay',
    label: 'Dismiss Active Overlay',
    description: 'Close open modals, search dropdowns, or analyst menus',
    category: 'Workspace',
    hotkey: 'escape',
    macKeys: ['Esc'],
    winKeys: ['Esc'],
  },
  {
    id: 'nav-overview',
    label: 'Go to Overview',
    description: 'Switch to executive operational overview',
    category: 'Navigation',
    hotkey: 'alt+1',
    macKeys: ['⌥', '1'],
    winKeys: ['Alt', '1'],
  },
  {
    id: 'nav-assessment',
    label: 'Go to Threat Assessment',
    description: 'Switch to active waveform & multi-engine threat dashboard',
    category: 'Navigation',
    hotkey: 'alt+2',
    macKeys: ['⌥', '2'],
    winKeys: ['Alt', '2'],
  },
  {
    id: 'nav-history',
    label: 'Go to Investigation History',
    description: 'Switch to case triage ledger',
    category: 'Navigation',
    hotkey: 'alt+3',
    macKeys: ['⌥', '3'],
    winKeys: ['Alt', '3'],
  },
  {
    id: 'nav-reports',
    label: 'Go to Forensic Reports',
    description: 'Switch to signed evidentiary dossiers & archive',
    category: 'Navigation',
    hotkey: 'alt+4',
    macKeys: ['⌥', '4'],
    winKeys: ['Alt', '4'],
  },
  {
    id: 'nav-registry',
    label: 'Go to Speaker Registry',
    description: 'Switch to enrolled voiceprint & ECAPA-TDNN baselines',
    category: 'Navigation',
    hotkey: 'alt+5',
    macKeys: ['⌥', '5'],
    winKeys: ['Alt', '5'],
  },
  {
    id: 'nav-telemetry',
    label: 'Go to System Telemetry',
    description: 'Switch to live engine latency & diagnostics console',
    category: 'Navigation',
    hotkey: 'alt+6',
    macKeys: ['⌥', '6'],
    winKeys: ['Alt', '6'],
  },
];

export const SHORTCUT_DOM_EVENTS = {
  FOCUS_SEARCH: 'voxsentinel:focus-search',
  OPEN_COMMAND_PALETTE: 'voxsentinel:open-command-palette',
  DISMISS_POPOVERS: 'voxsentinel:dismiss-popovers',
  OPEN_SHORTCUT_GUIDE: 'voxsentinel:open-shortcut-guide',
} as const;

export type CommandPaletteCategory = 'Cases' | 'Speakers' | 'Reports' | 'Actions' | 'Modules';

export interface CommandPaletteItem {
  id: string;
  category: CommandPaletteCategory;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'danger' | 'safe' | 'warn' | 'neutral';
  keywords: string;
}

export function filterCommandPaletteItems<T extends CommandPaletteItem>(
  items: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...items];
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((item) => {
    const haystack = `${item.category} ${item.title} ${item.subtitle} ${item.badge ?? ''} ${item.keywords}`.toLowerCase();
    return tokens.every((tok) => haystack.includes(tok));
  });
}

export function detectMacOS(userAgent?: string): boolean {
  const ua =
    userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  return /mac/i.test(ua) && !/iphone|ipad|ipod/i.test(ua);
}

export function getShortcutKeys(
  shortcut: Pick<AppShortcutDefinition, 'macKeys' | 'winKeys'>,
  isMac: boolean,
): string[] {
  return isMac ? shortcut.macKeys : shortcut.winKeys;
}

export function formatShortcutBadge(
  shortcut: Pick<AppShortcutDefinition, 'macKeys' | 'winKeys'>,
  isMac: boolean,
): string {
  const keys = getShortcutKeys(shortcut, isMac);
  return isMac ? keys.join('') : keys.join('+');
}

export function resolveModuleRouteByNumber(slot: number): string | null {
  return MODULE_SHORTCUT_ROUTES[slot]?.path ?? null;
}

export function groupShortcutsByCategory(
  shortcuts: readonly AppShortcutDefinition[] = APP_SHORTCUTS,
): Array<{ category: ShortcutCategory; items: AppShortcutDefinition[] }> {
  const order: ShortcutCategory[] = ['Primary Actions', 'Workspace', 'Navigation'];
  return order.map((category) => ({
    category,
    items: shortcuts.filter((item) => item.category === category),
  }));
}
