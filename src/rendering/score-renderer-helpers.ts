import { Accidental, Beam, Factory, Stave, StaveNote, Voice, type EasyScore } from 'vexflow';
import { KEY_SIGNATURES } from '@/constants';
import type { Measure } from '@/engine';
import { DEFAULT_MEASURE, type RenderSelectors, type RenderState } from '@/rendering/score-renderer-types';

interface ShiftableStaveNote extends StaveNote {
  draw: () => void;
}

interface WidthOverrideVoice extends Voice {
  getWidth: () => number;
}

export function getValidKey(key?: string): string {
  return (key && KEY_SIGNATURES.includes(key)) ? key : 'C';
}

export function getMeasureOrDefault(musicData: Measure[], measureIdx: number): Measure {
  return musicData[measureIdx] ?? DEFAULT_MEASURE;
}

export function createRendererElementId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
}

export function configureStave(stave: Stave, isTreble: boolean, measureIndexInLine: number, keySig: string): void {
  if (measureIndexInLine === 0) {
    stave.addClef(isTreble ? 'treble' : 'bass').addTimeSignature('4/4');
    if (keySig !== 'C') {
      stave.addKeySignature(keySig);
    }
  }
}

export function getTargetNotes(
  score: EasyScore,
  measureData: Measure,
  measureIdx: number,
  isTreble: boolean,
  currentNotesArray: StaveNote[] | null,
  currentStepIndex: number,
  getStepInfo: RenderSelectors['getStepInfo'],
): StaveNote[] {
  const steps = isTreble ? measureData.trebleSteps : measureData.bassSteps;
  const pattern = measureData.pattern;
  const clef = isTreble ? 'treble' : 'bass';
  const stem = isTreble ? 'up' : 'down';
  const currentStep = getStepInfo(currentStepIndex);

  const notes = steps.map((pitches, stepIdx) => {
    const duration = pattern[stepIdx] ?? 'q';
    const isCurrent = currentStep?.measureIdx === measureIdx && currentStep.stepIdx === stepIdx;
    const restPitch = isTreble ? 'B4' : 'D3';
    const noteStr = pitches.length === 0
      ? `${restPitch}/${duration}/r`
      : (pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`);

    const note = score.notes(noteStr, { stem, clef })[0] as StaveNote;
    if (isCurrent && currentNotesArray) {
      currentNotesArray.push(note);
    }
    return note;
  });

  try {
    const beams = Beam.generateBeams(notes);
    for (const beam of beams) {
      for (const note of beam.getNotes() as StaveNote[]) {
        note.setBeam(beam);
      }
    }
  } catch {
    // Ignore beaming errors to ensure rendering continues
  }

  return notes;
}

export function getVoices(
  factory: Factory,
  score: EasyScore,
  measureData: Measure,
  measureIdx: number,
  isTreble: boolean,
  currentNotes: StaveNote[] | null,
  state: RenderState,
  selectors: RenderSelectors,
): Voice[] {
  const targetNotes = getTargetNotes(
    score,
    measureData,
    measureIdx,
    isTreble,
    currentNotes,
    state.currentStepIndex,
    selectors.getStepInfo,
  );

  if (targetNotes.length === 0) {
    return [];
  }

  const voices: Voice[] = [factory.Voice().setMode(2).addTickables(targetNotes)];
  try {
    Accidental.applyAccidentals(voices, getValidKey(measureData.keySignature));
  } catch {
    // Ignore accidental errors in weird environments
  }
  return voices;
}

export function addVoicesWithPlayed(
  factory: Factory,
  score: EasyScore,
  measureData: Measure,
  measureIdx: number,
  isTreble: boolean,
  currentNotes: StaveNote[],
  state: RenderState,
  selectors: RenderSelectors,
  voicesToBeam: Voice[],
): Voice[] {
  const targetNotes = getTargetNotes(
    score,
    measureData,
    measureIdx,
    isTreble,
    currentNotes,
    state.currentStepIndex,
    selectors.getStepInfo,
  );

  if (targetNotes.length === 0) {
    return [];
  }

  const targetVoice = factory.Voice().setMode(2).addTickables(targetNotes);
  const voices: Voice[] = [targetVoice];

  try {
    Accidental.applyAccidentals(voices, getValidKey(measureData.keySignature));
  } catch {
    // Ignore accidental errors
  }

  voicesToBeam.push(targetVoice);

  const info = selectors.getStepInfo(state.currentStepIndex);
  if (!info || info.measureIdx !== measureIdx) {
    return voices;
  }

  const stepIdx = info.stepIdx;
  const duration = measureData.pattern[stepIdx] ?? 'q';
  const steps = isTreble ? measureData.trebleSteps : measureData.bassSteps;
  const targetPitches = steps[stepIdx] ?? [];

  const pitches = Array.from(state.activeMidiNotes).filter((pitch) => {
    // Only include notes that are NOT in the target notes for this step
    if (targetPitches.includes(pitch)) {
      return false;
    }

    if (state.suppressedNotes.has(pitch)) {
      return false;
    }

    const match = pitch.match(/(-?\d+)$/);
    const octave = match ? parseInt(match[1]!, 10) : 4;
    return measureData.staffType === 'grand' ? (isTreble ? octave >= 4 : octave < 4) : true;
  });

  if (pitches.length === 0) {
    return voices;
  }

  const noteStr = pitches.length > 1 ? `(${pitches.join(' ')})/${duration}` : `${pitches[0]}/${duration}`;
  const playedNotes = score.notes(noteStr, { stem: isTreble ? 'up' : 'down', clef: isTreble ? 'treble' : 'bass' }) as StaveNote[];

  if (!Array.isArray(playedNotes) || playedNotes.length === 0) {
    return voices;
  }

  for (const note of playedNotes) {
    for (let pitchIdx = 0; pitchIdx < pitches.length; pitchIdx++) {
      if (!targetPitches.includes(pitches[pitchIdx]!)) {
        note.setKeyStyle(pitchIdx, { fillStyle: 'rgba(128, 128, 128, 0.4)', strokeStyle: 'rgba(128, 128, 128, 0.4)' });
      }
    }

    const alignedTarget = targetNotes[stepIdx];
    if (!alignedTarget) {
      continue;
    }

    const shiftableNote = note as ShiftableStaveNote;
    const originalDraw = shiftableNote.draw.bind(shiftableNote);
    note.draw = function drawAlignedPlayedNote(): void {
      if (alignedTarget.getTickContext() && note.getTickContext()) {
        note.setXShift(alignedTarget.getAbsoluteX() - note.getAbsoluteX());
      }
      originalDraw();
    };
  }

  const playedVoice = factory.Voice().setMode(2).addTickables(playedNotes);
  (playedVoice as WidthOverrideVoice).getWidth = (): number => 0;
  voices.push(playedVoice);
  return voices;
}

export function drawBeams(factory: Factory, voicesToBeam: Voice[]): void {
  for (const voice of voicesToBeam) {
    if (!voice) {
      continue;
    }

    try {
      const beams = new Set<Beam>();
      for (const note of voice.getTickables() as StaveNote[]) {
        const beam = note.getBeam();
        if (beam) {
          beams.add(beam);
        }
      }

      for (const beam of beams) {
        beam.setContext(factory.getContext()).draw();
      }
    } catch {
      // Ignore beam drawing errors
    }
  }
}

export function drawHighlight(factory: Factory, currentNotes: StaveNote[]): void {
  if (!Array.isArray(currentNotes) || currentNotes.length === 0) {
    return;
  }

  const ctx = factory.getContext();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const note of currentNotes) {
    if (!note?.getTickContext()) {
      continue;
    }

    const x = note.getAbsoluteX();
    const metrics = note.getMetrics();
    minX = Math.min(minX, x - (metrics?.modLeftPx || 0) - 5);
    maxX = Math.max(maxX, x + (metrics?.notePx || 12) + (metrics?.modRightPx || 0) + 5);

    const bb = note.getBoundingBox();
    if (bb) {
      minY = Math.min(minY, bb.getY() - 5);
      maxY = Math.max(maxY, bb.getY() + bb.getH() + 5);
    } else {
      minY = Math.min(minY, 50);
      maxY = Math.max(maxY, 150);
    }
  }

  ctx.save();
  ctx.setFillStyle('rgba(173, 216, 230, 0.4)');
  ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  ctx.restore();
}
