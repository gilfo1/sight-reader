import { playNote, stopNote } from '@/audio/note-player';
import {
  activeMidiNotes,
  currentStepIndex,
  getRenderedMeasuresCount,
  getStepInfo,
  getTargetNotesAtStep,
  musicData,
  recordCorrectNote,
  recordWrongNote,
  setCurrentStepIndex,
  suppressedNotes,
} from '@/engine/state';
import { getNoteValue } from '@/utils/theory';

type NoteIdentifierEvent = { note: { identifier: string } };
type MidiStateChangeHandler = (shouldRegenerate?: boolean, keepHeldNotes?: boolean) => void;

export interface MidiRuntime {
  checkMatch: () => void;
  onNoteOff: (event: NoteIdentifierEvent) => void;
  onNoteOn: (event: NoteIdentifierEvent) => void;
}

export function createMidiRuntime(
  notifyStateChange: MidiStateChangeHandler,
  renderCurrentNote: () => void,
): MidiRuntime {
  let stepStartTime = Date.now();
  let lastProcessedStep = -1;
  const wrongNoteAuxiliaryNotes = new Map<string, string[]>();

  const checkMatch = (): void => {
    const targetNotes = getTargetNotesAtStep(currentStepIndex);

    if (targetNotes.length === 0) {
      return;
    }

    const targetValues = targetNotes.map(getNoteValue);
    const activeValues = Array.from(activeMidiNotes).map(getNoteValue);

    if (activeValues.length !== targetValues.length || !targetValues.every((value) => activeValues.includes(value))) {
      return;
    }

    const nextIndex = currentStepIndex + 1;
    setCurrentStepIndex(nextIndex);
    stepStartTime = Date.now();

    const nextStepInfo = getStepInfo(nextIndex);
    const renderedMeasures = getRenderedMeasuresCount();
    const shouldRegenerate = !nextStepInfo || (renderedMeasures > 0 && nextStepInfo.measureIdx >= renderedMeasures);

    if (shouldRegenerate) {
      notifyStateChange(true, true);
      return;
    }

    activeMidiNotes.forEach((note) => suppressedNotes.add(note));
    notifyStateChange();
  };

  const onNoteOn = (event: NoteIdentifierEvent): void => {
    const { identifier } = event.note;

    activeMidiNotes.add(identifier);
    playNote(identifier);

    if (currentStepIndex !== lastProcessedStep) {
      stepStartTime = Date.now();
      lastProcessedStep = currentStepIndex;
    }

    const targetPitches = getTargetNotesAtStep(currentStepIndex);
    if (targetPitches.length > 0) {
      const stepInfo = getStepInfo(currentStepIndex)!;
      const measureData = musicData[stepInfo.measureIdx]!;

      if (targetPitches.includes(identifier)) {
        recordCorrectNote(identifier, measureData.keySignature, Date.now() - stepStartTime);
      } else {
        recordWrongNote(identifier, targetPitches, measureData.keySignature);
        suppressedNotes.clear();

        const auxiliary: string[] = [];
        targetPitches.forEach((pitch) => {
          playNote(pitch);
          auxiliary.push(pitch);
        });
        if (auxiliary.length > 0) {
          wrongNoteAuxiliaryNotes.set(identifier, auxiliary);
        }
      }
    }

    renderCurrentNote();
    checkMatch();
    notifyStateChange();
  };

  const onNoteOff = (event: NoteIdentifierEvent): void => {
    const { identifier } = event.note;

    activeMidiNotes.delete(identifier);
    suppressedNotes.delete(identifier);
    stopNote(identifier);

    const auxiliary = wrongNoteAuxiliaryNotes.get(identifier);
    if (auxiliary) {
      wrongNoteAuxiliaryNotes.delete(identifier);
      auxiliary.forEach((pitch) => {
        const stillNeeded = Array.from(wrongNoteAuxiliaryNotes.values()).some((notes) => notes.includes(pitch));
        if (!stillNeeded && !activeMidiNotes.has(pitch)) {
          stopNote(pitch);
        }
      });
    }

    renderCurrentNote();
    checkMatch();
    notifyStateChange();
  };

  return {
    checkMatch,
    onNoteOff,
    onNoteOn,
  };
}
