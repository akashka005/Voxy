import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_SHORTCUTS,
  detectMacOS,
  formatShortcutBadge,
  getShortcutKeys,
  groupShortcutsByCategory,
  MODULE_SHORTCUT_ROUTES,
  resolveModuleRouteByNumber,
} from './shortcuts';

test('APP_SHORTCUTS has unique IDs and unique hotkey bindings', () => {
  const ids = new Set(APP_SHORTCUTS.map((s) => s.id));
  const hotkeys = new Set(APP_SHORTCUTS.map((s) => s.hotkey));

  assert.equal(ids.size, APP_SHORTCUTS.length);
  assert.equal(hotkeys.size, APP_SHORTCUTS.length);
});

test('primary shortcuts match Cmd+N and Cmd+E requirements across platforms', () => {
  const newAnalysis = APP_SHORTCUTS.find((s) => s.id === 'new-analysis');
  const exportReport = APP_SHORTCUTS.find((s) => s.id === 'export-report');

  assert.ok(newAnalysis);
  assert.ok(exportReport);

  assert.equal(newAnalysis.hotkey, 'mod+n');
  assert.equal(exportReport.hotkey, 'mod+e');

  assert.equal(formatShortcutBadge(newAnalysis, true), '⌘N');
  assert.equal(formatShortcutBadge(newAnalysis, false), 'Ctrl+N');
  assert.equal(formatShortcutBadge(exportReport, true), '⌘E');
  assert.equal(formatShortcutBadge(exportReport, false), 'Ctrl+E');
  assert.deepEqual(getShortcutKeys(exportReport, true), ['⌘', 'E']);
  assert.deepEqual(getShortcutKeys(exportReport, false), ['Ctrl', 'E']);
});

test('detectMacOS accurately distinguishes macOS from Linux, Windows, and iOS', () => {
  assert.equal(
    detectMacOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'),
    true,
  );
  assert.equal(
    detectMacOS('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'),
    false,
  );
  assert.equal(
    detectMacOS('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
    false,
  );
  assert.equal(
    detectMacOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'),
    false,
  );
});

test('resolveModuleRouteByNumber covers all 6 sidebar routes cleanly', () => {
  assert.equal(Object.keys(MODULE_SHORTCUT_ROUTES).length, 6);
  assert.equal(resolveModuleRouteByNumber(1), '/overview');
  assert.equal(resolveModuleRouteByNumber(2), '/');
  assert.equal(resolveModuleRouteByNumber(3), '/history');
  assert.equal(resolveModuleRouteByNumber(4), '/reports');
  assert.equal(resolveModuleRouteByNumber(5), '/registry');
  assert.equal(resolveModuleRouteByNumber(6), '/telemetry');
  assert.equal(resolveModuleRouteByNumber(0), null);
  assert.equal(resolveModuleRouteByNumber(9), null);
});

test('groupShortcutsByCategory preserves all shortcuts in deterministic order', () => {
  const groups = groupShortcutsByCategory();
  assert.deepEqual(
    groups.map((g) => g.category),
    ['Primary Actions', 'Workspace', 'Navigation'],
  );
  const totalCount = groups.reduce((acc, g) => acc + g.items.length, 0);
  assert.equal(totalCount, APP_SHORTCUTS.length);
});
