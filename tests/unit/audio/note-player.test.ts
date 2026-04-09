import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isSoundEnabled, noteToFrequency, playNote, setSoundEnabled, stopAllNotes, stopNote, toggleSoundEnabled } from '@/audio/note-player';

interface MockGainNode {
  connect: ReturnType<typeof vi.fn>;
  gain: {
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    setValueAtTime: ReturnType<typeof vi.fn>;
    value: number;
  };
}

interface MockOscillatorNode {
  connect: ReturnType<typeof vi.fn>;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
  };
  onended: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  type: string;
}

function installAudioContextMock() {
  const gainNode: MockGainNode = {
    connect: vi.fn(),
    gain: {
      cancelScheduledValues: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      value: 0.18,
    },
  };
  const oscillator: MockOscillatorNode = {
    connect: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
    },
    onended: null,
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine',
  };
  const audioContext = {
    createGain: vi.fn(() => gainNode),
    createOscillator: vi.fn(() => oscillator),
    currentTime: 1,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
  };

  vi.stubGlobal('AudioContext', vi.fn(() => audioContext));
  return { audioContext, gainNode, oscillator };
}

describe('Note Player', () => {
  beforeEach(() => {
    stopAllNotes();
    setSoundEnabled(true);
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'UnitTestBrowser',
    });
  });

  afterEach(() => {
    stopAllNotes();
    setSoundEnabled(true);
  });

  it('calculates note frequencies from note identifiers', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440, 5);
    expect(noteToFrequency('C4')).toBeCloseTo(261.625, 2);
  });

  it('tracks whether sound is enabled', () => {
    expect(isSoundEnabled()).toBe(true);
    expect(toggleSoundEnabled()).toBe(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it('does not create audio playback when sound is disabled', () => {
    const { audioContext } = installAudioContextMock();
    setSoundEnabled(false);

    playNote('C4');

    expect(audioContext.createOscillator).not.toHaveBeenCalled();
  });

  it('starts a sustained oscillator only once while a note is held', () => {
    const { audioContext, oscillator } = installAudioContextMock();

    playNote('C4');
    playNote('C4');

    expect(audioContext.createOscillator).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
  });

  it('releases the sustained tone when the note stops', () => {
    const { gainNode, oscillator } = installAudioContextMock();

    playNote('C4');
    stopNote('C4');

    expect(gainNode.gain.cancelScheduledValues).toHaveBeenCalled();
    expect(gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(oscillator.stop).toHaveBeenCalled();
  });

  it('can replay a note after it has been released', () => {
    const { audioContext } = installAudioContextMock();

    playNote('C4');
    stopNote('C4');
    playNote('C4');

    expect(audioContext.createOscillator).toHaveBeenCalledTimes(2);
  });

  it('stops active notes when sound is disabled', () => {
    const { oscillator } = installAudioContextMock();

    playNote('C4');
    setSoundEnabled(false);

    expect(oscillator.stop).toHaveBeenCalled();
  });
});
