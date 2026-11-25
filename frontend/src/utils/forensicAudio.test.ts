import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyInteractiveTag,
  getAudioPreset,
  shouldTriggerSound,
} from './forensicAudio';

test('getAudioPreset returns low-pass bounded forensic synthesis parameters', () => {
  const hum = getAudioPreset('card-hum');
  assert.ok(hum.filterCutoffHz <= 400);
  assert.ok(hum.peakGain <= 0.03);

  const tick = getAudioPreset('button-tick');
  assert.ok(tick.durationSec < 0.08);
  assert.ok(tick.filterCutoffHz <= 800);
});

test('shouldTriggerSound enforces per-kind cooldown window', () => {
  assert.equal(shouldTriggerSound('card-hum', 500, 200), true);
  assert.equal(shouldTriggerSound('card-hum', 300, 200), false);
  assert.equal(shouldTriggerSound('button-tick', 300, 200), true);
  assert.equal(shouldTriggerSound('button-tick', 240, 200), false);
});

test('classifyInteractiveTag prioritizes buttons/pills over enclosing glass cards', () => {
  assert.equal(classifyInteractiveTag(true, false, true), 'button-tick');
  assert.equal(classifyInteractiveTag(false, true, true), 'button-tick');
  assert.equal(classifyInteractiveTag(false, false, true), 'card-hum');
  assert.equal(classifyInteractiveTag(false, false, false), null);
});
