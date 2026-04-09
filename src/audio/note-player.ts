import { getNoteValue } from '@/utils/theory';

const SAMPLE_RATE = 22050;
const SAMPLE_DURATION_SECONDS = 0.8;
const activeNotes = new Map<string, HTMLAudioElement>();
const audioCache = new Map<string, string>();

function canUseHtmlAudio(): boolean {
  return typeof Audio !== 'undefined' && !window.navigator.userAgent.includes('jsdom');
}

function clampAudioSample(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

function createWaveFileDataUri(note: string): string {
  const sampleCount = Math.floor(SAMPLE_RATE * SAMPLE_DURATION_SECONDS);
  const pcmData = new Int16Array(sampleCount);
  const frequency = noteToFrequency(note);

  for (let index = 0; index < sampleCount; index++) {
    const time = index / SAMPLE_RATE;
    const attack = Math.min(1, time / 0.03);
    const release = Math.min(1, (SAMPLE_DURATION_SECONDS - time) / 0.12);
    const envelope = Math.max(0, Math.min(attack, release));
    const sample = (
      Math.sin(2 * Math.PI * frequency * time)
      + 0.35 * Math.sin(4 * Math.PI * frequency * time)
      + 0.15 * Math.sin(6 * Math.PI * frequency * time)
    ) * 0.22 * envelope;
    pcmData[index] = clampAudioSample(sample) * 32767;
  }

  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index++) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, 'data');
  view.setUint32(40, dataSize, true);

  pcmData.forEach((sample, index) => {
    view.setInt16(44 + (index * 2), sample, true);
  });

  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:audio/wav;base64,${btoa(binary)}`;
}

function getAudioSource(note: string): string {
  const cached = audioCache.get(note);

  if (cached) {
    return cached;
  }

  const source = createWaveFileDataUri(note);
  audioCache.set(note, source);
  return source;
}

export function noteToFrequency(note: string): number {
  return 440 * Math.pow(2, (getNoteValue(note) - 69) / 12);
}

export function playNote(note: string): void {
  if (!canUseHtmlAudio() || activeNotes.has(note)) {
    return;
  }

  const audio = new Audio(getAudioSource(note));
  audio.loop = true;
  audio.currentTime = 0;
  activeNotes.set(note, audio);

  try {
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === 'function') {
      void playResult.catch(() => {
        activeNotes.delete(note);
      });
    }
  } catch {
    activeNotes.delete(note);
  }
}

export function stopNote(note: string): void {
  const activeNote = activeNotes.get(note);

  if (!activeNote) {
    return;
  }

  if (canUseHtmlAudio()) {
    activeNote.pause();
    activeNote.currentTime = 0;
  }
  activeNotes.delete(note);
}

export function stopAllNotes(): void {
  Array.from(activeNotes.keys()).forEach(stopNote);
}
