import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getSoundMode,
  isReverbEnabled,
  isSoundEnabled,
  noteToFrequency,
  playNote,
  resetAudioPlayer,
  setSoundEnabled,
  setSoundMode,
  stopNote,
  toggleSoundEnabled,
  toggleSoundMode,
} from '@/audio/note-player';
import { SOUND_MODE } from '@/audio/sound-mode';

interface MockGainNode {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  gain: {
    cancelScheduledValues: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    setValueAtTime: ReturnType<typeof vi.fn>;
    value: number;
  };
}

interface MockOscillatorNode {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
  };
  onended: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  type: string;
}

function installAudioContextMock() {
  const gainNodes: MockGainNode[] = [];
  const createGainNode = (): MockGainNode => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      cancelScheduledValues: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setValueAtTime: vi.fn(),
      value: 0.18,
    },
  });
  const oscillator: MockOscillatorNode = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
    },
    onended: null,
    start: vi.fn(),
    stop: vi.fn(),
    type: 'sine',
  };
  const convolver = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
  };
  const audioBuffer = {
    getChannelData: vi.fn(() => new Float32Array(32)),
    numberOfChannels: 2,
  };
  const audioContext = {
    createBuffer: vi.fn(() => audioBuffer),
    createConvolver: vi.fn(() => convolver),
    createGain: vi.fn(() => {
      const gainNode = createGainNode();
      gainNodes.push(gainNode);
      return gainNode;
    }),
    createOscillator: vi.fn(() => oscillator),
    currentTime: 1,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    sampleRate: 20,
  };

  vi.stubGlobal('AudioContext', vi.fn(() => audioContext));
  return { audioBuffer, audioContext, convolver, gainNodes, oscillator };
}

describe('Note Player', () => {
  beforeEach(() => {
    resetAudioPlayer();
    setSoundEnabled(true);
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'UnitTestBrowser',
    });
  });

  afterEach(() => {
    resetAudioPlayer();
    setSoundEnabled(true);
  });

  it('calculates note frequencies from note identifiers', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440, 5);
    expect(noteToFrequency('C4')).toBeCloseTo(261.625, 2);
  });

  it('tracks whether sound is enabled', () => {
    expect(isSoundEnabled()).toBe(true);
    expect(toggleSoundEnabled()).toBe(true);
    expect(getSoundMode()).toBe(SOUND_MODE.REVERB);
    expect(toggleSoundMode()).toBe(SOUND_MODE.OFF);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
    expect(getSoundMode()).toBe(SOUND_MODE.ON);
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
    const { gainNodes, oscillator } = installAudioContextMock();

    playNote('C4');
    stopNote('C4');

    expect(gainNodes.at(-1)?.gain.cancelScheduledValues).toHaveBeenCalled();
    expect(gainNodes.at(-1)?.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
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

  it('cycles through on, reverb, and off modes', () => {
    expect(getSoundMode()).toBe(SOUND_MODE.ON);
    expect(toggleSoundMode()).toBe(SOUND_MODE.REVERB);
    expect(isReverbEnabled()).toBe(true);
    expect(toggleSoundMode()).toBe(SOUND_MODE.OFF);
    expect(isSoundEnabled()).toBe(false);
    expect(toggleSoundMode()).toBe(SOUND_MODE.ON);
    expect(isReverbEnabled()).toBe(false);
  });

  it('routes dry playback directly to the output when reverb is disabled', () => {
    const { convolver, gainNodes } = installAudioContextMock();

    setSoundMode(SOUND_MODE.ON);
    playNote('C4');

    expect(convolver.connect).toHaveBeenCalledTimes(1);
    expect(gainNodes.at(-1)?.connect).toHaveBeenCalledTimes(1);
  });

  it('routes playback through the shared convolver when reverb is enabled', () => {
    const { audioContext, convolver, gainNodes } = installAudioContextMock();

    setSoundMode(SOUND_MODE.REVERB);
    playNote('C4');

    expect(audioContext.createConvolver).toHaveBeenCalledTimes(1);
    expect(audioContext.createBuffer).toHaveBeenCalledTimes(1);
    expect(gainNodes.at(-1)?.connect).toHaveBeenCalledTimes(2);
    expect(gainNodes.at(-1)?.connect).toHaveBeenCalledWith(convolver);
  });

  it('reuses the shared reverb bus across notes', () => {
    const { audioContext } = installAudioContextMock();

    setSoundMode(SOUND_MODE.REVERB);
    playNote('C4');
    stopNote('C4');
    playNote('D4');

    expect(audioContext.createConvolver).toHaveBeenCalledTimes(1);
    expect(audioContext.createBuffer).toHaveBeenCalledTimes(1);
  });

  it('falls back to off when explicitly set and reports reverb correctly', () => {
    setSoundMode(SOUND_MODE.OFF);
    expect(isSoundEnabled()).toBe(false);
    expect(isReverbEnabled()).toBe(false);

    setSoundMode(SOUND_MODE.REVERB);
    expect(isSoundEnabled()).toBe(true);
    expect(isReverbEnabled()).toBe(true);
  });
});
