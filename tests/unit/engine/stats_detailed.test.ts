import { describe, it, expect, beforeEach } from 'vitest';
import { stats, resetStats, recordCorrectNote, recordWrongNote } from '@/engine/state';

describe('Detailed Stats Logic', () => {
  beforeEach(() => {
    resetStats();
  });

  it('should track average correct note identification time', () => {
    recordCorrectNote('C4', 'C', 1000); // 1 second
    expect(stats.correctNotes).toBe(1);
    expect(stats.totalCorrectNoteTime).toBe(1000);
    expect(stats.averageCorrectNoteTime).toBe(1000);

    recordCorrectNote('D4', 'C', 2000); // 2 seconds
    expect(stats.correctNotes).toBe(2);
    expect(stats.totalCorrectNoteTime).toBe(3000);
    expect(stats.averageCorrectNoteTime).toBe(1500);
  });

  it('should detect "correct note, wrong octave"', () => {
    // Target is C4
    recordWrongNote('C5', ['C4'], 'C');
    expect(stats.wrongNotes).toBe(1);
    expect(stats.wrongOctaveCount).toBe(1);
    expect(stats.keySignatureNotHonoredCount).toBe(0);
  });

  it('should detect "correct note, key signature not honored"', () => {
    // Target is F#4 in G Major
    recordWrongNote('F4', ['F#4'], 'G');
    expect(stats.wrongNotes).toBe(1);
    expect(stats.keySignatureNotHonoredCount).toBe(1);
    expect(stats.wrongOctaveCount).toBe(0);

    // Target is Eb4 in Bb Major
    recordWrongNote('E4', ['Eb4'], 'Bb');
    expect(stats.keySignatureNotHonoredCount).toBe(2);

    // Target is C#4 in D Major
    recordWrongNote('C4', ['C#4'], 'D');
    expect(stats.keySignatureNotHonoredCount).toBe(3);
  });

  it('should detect multiple error types for the same note', () => {
    // Target is F#4 in G Major
    // Played F5:
    // 1. Wrong octave (4 vs 5)
    // 2. Key signature not honored (F# vs F)
    recordWrongNote('F5', ['F#4'], 'G');
    expect(stats.wrongNotes).toBe(1);
    expect(stats.wrongOctaveCount).toBe(1);
    expect(stats.keySignatureNotHonoredCount).toBe(1);
  });

  it('should handle chord targets for error detection', () => {
    // Target chord: [C4, E4, G4]
    // Played: C5 (wrong octave for C4)
    recordWrongNote('C5', ['C4', 'E4', 'G4'], 'C');
    expect(stats.wrongOctaveCount).toBe(1);
    
    // Played: Eb4 (key sig error for E4 in C Major)
    recordWrongNote('Eb4', ['C4', 'E4', 'G4'], 'C');
    expect(stats.keySignatureNotHonoredCount).toBe(1);
  });
});
