import { describe, expect, it } from 'vitest';
import { noteToFrequency } from '@/audio/note-player';

describe('Note Player', () => {
  it('calculates note frequencies from note identifiers', () => {
    expect(noteToFrequency('A4')).toBeCloseTo(440, 5);
    expect(noteToFrequency('C4')).toBeCloseTo(261.625, 2);
  });
});
