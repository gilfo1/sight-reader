import { describe, expect, it } from 'vitest';
import { DEFAULT_SOUND_MODE, getNextSoundMode, isSoundModeEnabled, isValidSoundMode, SOUND_MODE } from '@/audio/sound-mode';

describe('sound mode helpers', () => {
  it('uses on as the default mode', () => {
    expect(DEFAULT_SOUND_MODE).toBe(SOUND_MODE.ON);
  });

  it('cycles through the three sound modes in order', () => {
    expect(getNextSoundMode(SOUND_MODE.OFF)).toBe(SOUND_MODE.ON);
    expect(getNextSoundMode(SOUND_MODE.ON)).toBe(SOUND_MODE.REVERB);
    expect(getNextSoundMode(SOUND_MODE.REVERB)).toBe(SOUND_MODE.OFF);
  });

  it('validates sound mode values', () => {
    expect(isValidSoundMode(SOUND_MODE.OFF)).toBe(true);
    expect(isValidSoundMode(SOUND_MODE.ON)).toBe(true);
    expect(isValidSoundMode(SOUND_MODE.REVERB)).toBe(true);
    expect(isValidSoundMode('muted')).toBe(false);
    expect(isValidSoundMode(null)).toBe(false);
  });

  it('reports whether a mode has audible playback', () => {
    expect(isSoundModeEnabled(SOUND_MODE.OFF)).toBe(false);
    expect(isSoundModeEnabled(SOUND_MODE.ON)).toBe(true);
    expect(isSoundModeEnabled(SOUND_MODE.REVERB)).toBe(true);
  });
});
