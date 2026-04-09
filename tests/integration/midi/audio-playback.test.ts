import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebMidi } from 'webmidi';
import type { Input, NoteMessageEvent } from 'webmidi';
import { initMidiHandler, resetGameState } from '@/main';
import { setSoundEnabled } from '@/audio/note-player';
import { playNote, stopNote } from '@/audio/note-player';

interface MockWebMidiShape {
  inputs: Input[];
  _trigger: (event: string, data: unknown) => void;
}

vi.mock('webmidi', () => {
  const listeners: Record<string, (data: unknown) => void> = {};
  return {
    WebMidi: {
      enable: vi.fn().mockResolvedValue(true),
      inputs: [],
      addListener: vi.fn((event: string, callback: (data: unknown) => void) => {
        listeners[event] = callback;
      }),
      removeListener: vi.fn(),
      _trigger: (event: string, data: unknown) => {
        listeners[event]?.(data);
      },
    },
  };
});

vi.mock('@/audio/note-player', async () => {
  const actual = await vi.importActual<typeof import('@/audio/note-player')>('@/audio/note-player');
  return {
    ...actual,
    playNote: vi.fn(),
    stopNote: vi.fn(),
    stopAllNotes: vi.fn(),
  };
});

describe('MIDI Audio Playback', () => {
  beforeEach(() => {
    resetGameState();
    setSoundEnabled(true);
    document.body.innerHTML = `
      <div id="midi-status">
        <span id="midi-device-name">No device connected</span>
        <div id="midi-indicator"></div>
      </div>
      <div id="current-note">-</div>
    `;
    vi.clearAllMocks();
    (WebMidi as unknown as MockWebMidiShape).inputs = [];
  });

  it('plays and stops pitch audio for incoming MIDI notes', async () => {
    initMidiHandler();
    await new Promise((resolve) => setTimeout(resolve, 0));

    let noteOnCallback: ((event: NoteMessageEvent) => void) | undefined;
    let noteOffCallback: ((event: NoteMessageEvent) => void) | undefined;
    const mockInput = {
      name: 'Mock MIDI Keyboard',
      type: 'input',
      addListener: vi.fn((event: string, callback: (event: NoteMessageEvent) => void) => {
        if (event === 'noteon') noteOnCallback = callback;
        if (event === 'noteoff') noteOffCallback = callback;
      }),
      removeListener: vi.fn(),
    };

    (WebMidi as unknown as MockWebMidiShape).inputs = [mockInput as unknown as Input];
    (WebMidi as unknown as MockWebMidiShape)._trigger('connected', { port: mockInput });

    noteOnCallback?.({ note: { identifier: 'C4' } } as NoteMessageEvent);
    noteOffCallback?.({ note: { identifier: 'C4' } } as NoteMessageEvent);

    expect(playNote).toHaveBeenCalledWith('C4');
    expect(stopNote).toHaveBeenCalledWith('C4');
  });
});
