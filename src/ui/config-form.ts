import { ALL_PIANO_NOTES, KEY_SIGNATURES } from '@/constants/music';
import type { GeneratorConfig } from '@/engine/types';
import { getNoteValue } from '@/utils/theory';
import { saveToStorage } from '@/utils/storage';
import { saveAccordionState } from '@/ui/accordion-state';
import { getElementById } from '@/ui/dom';

const GENERATOR_CONFIG_STORAGE_KEY = 'generator-config';

const ui = {
  get measuresPerLine() { return getElementById<HTMLSelectElement>('measures-per-line'); },
  get notesPerStep() { return getElementById<HTMLSelectElement>('notes-per-step'); },
  get lines() { return getElementById<HTMLSelectElement>('lines'); },
  get staffType() { return getElementById<HTMLSelectElement>('staff-type'); },
  get minNote() { return getElementById<HTMLSelectElement>('min-note'); },
  get maxNote() { return getElementById<HTMLSelectElement>('max-note'); },
  get maxReach() { return getElementById<HTMLSelectElement>('max-reach'); },
  get noteValues() { return getElementById<HTMLElement>('note-values'); },
  get keySignatures() { return getElementById<HTMLElement>('key-signatures'); },
  get adaptiveLearning() { return getElementById<HTMLInputElement>('adaptive-learning'); },
};

export const DEFAULT_CONFIG: GeneratorConfig = {
  measuresPerLine: 4,
  notesPerStep: 1,
  linesCount: 1,
  staffType: 'grand',
  minNote: 'C2',
  maxNote: 'C6',
  maxReach: 13,
  selectedNoteValues: ['q'],
  selectedKeySignatures: ['C'],
  isChromatic: false,
  isAdaptive: false,
};

function getCheckedValues(container: HTMLElement | null): string[] {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map((checkbox) => (checkbox as HTMLInputElement).value);
}

function populateNoteRange(select: HTMLSelectElement, notes: string[]): void {
  select.innerHTML = '';

  notes.forEach((note) => {
    const option = document.createElement('option');
    option.value = note;
    option.textContent = note;
    select.appendChild(option);
  });
}

function getAvailableRangeForStaff(staffType: string): string[] {
  if (staffType === 'treble') {
    return ALL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue('C3') && getNoteValue(note) <= getNoteValue('C6'));
  }

  if (staffType === 'bass') {
    return ALL_PIANO_NOTES.filter((note) => getNoteValue(note) >= getNoteValue('C1') && getNoteValue(note) <= getNoteValue('C5'));
  }

  return ALL_PIANO_NOTES;
}

export function initKeySignatures(onChange: (event: Event) => void): void {
  const keySignatureContainer = ui.keySignatures;

  if (!keySignatureContainer) {
    return;
  }

  keySignatureContainer.innerHTML = '';

  [...KEY_SIGNATURES, 'Chromatic'].forEach((keySignature) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');

    checkbox.type = 'checkbox';
    checkbox.value = keySignature;
    checkbox.id = `key-${keySignature}`;
    checkbox.checked = keySignature === 'C';
    checkbox.addEventListener('change', onChange);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(` ${keySignature}`));
    keySignatureContainer.appendChild(label);
  });
}

export function updateNoteSelectors(): void {
  const minNoteSelect = ui.minNote;
  const maxNoteSelect = ui.maxNote;

  if (!minNoteSelect || !maxNoteSelect) {
    return;
  }

  const previousMin = minNoteSelect.value;
  const previousMax = maxNoteSelect.value;
  const availableNotes = getAvailableRangeForStaff(ui.staffType?.value ?? 'grand');

  populateNoteRange(minNoteSelect, availableNotes);
  populateNoteRange(maxNoteSelect, availableNotes);

  minNoteSelect.value = availableNotes.includes(previousMin)
    ? previousMin
    : (ui.staffType?.value === 'bass' ? 'C1' : ui.staffType?.value === 'treble' ? 'C3' : 'C2');
  maxNoteSelect.value = availableNotes.includes(previousMax) ? previousMax : 'C6';

  if (ui.staffType?.value === 'bass' && !availableNotes.includes(previousMax)) {
    maxNoteSelect.value = 'C5';
  }
}

export function getUIConfig(): GeneratorConfig {
  const selectedNoteValues = getCheckedValues(ui.noteValues);
  const selectedKeySignatures = getCheckedValues(ui.keySignatures);

  return {
    measuresPerLine: parseInt(ui.measuresPerLine?.value ?? '4'),
    notesPerStep: parseInt(ui.notesPerStep?.value ?? '1'),
    linesCount: parseInt(ui.lines?.value ?? '1'),
    staffType: ui.staffType?.value ?? 'grand',
    minNote: ui.minNote?.value ?? 'C2',
    maxNote: ui.maxNote?.value ?? 'C6',
    maxReach: parseInt(ui.maxReach?.value ?? '12'),
    selectedNoteValues: selectedNoteValues.length > 0 ? selectedNoteValues : ['q'],
    selectedKeySignatures,
    isChromatic: selectedKeySignatures.includes('Chromatic'),
    isAdaptive: ui.adaptiveLearning?.checked ?? false,
  };
}

export function saveUIConfig(): void {
  saveToStorage(GENERATOR_CONFIG_STORAGE_KEY, getUIConfig());
}

export function applyUIConfig(config: Partial<GeneratorConfig>): void {
  if (config.measuresPerLine !== undefined && ui.measuresPerLine) {
    ui.measuresPerLine.value = config.measuresPerLine.toString();
  }

  if (config.notesPerStep !== undefined && ui.notesPerStep) {
    ui.notesPerStep.value = config.notesPerStep.toString();
  }

  if (config.linesCount !== undefined && ui.lines) {
    ui.lines.value = config.linesCount.toString();
  }

  if (config.staffType !== undefined && ui.staffType) {
    ui.staffType.value = config.staffType;
    updateNoteSelectors();
  }

  if (config.minNote !== undefined && ui.minNote) {
    ui.minNote.value = config.minNote;
  }

  if (config.maxNote !== undefined && ui.maxNote) {
    ui.maxNote.value = config.maxNote;
  }

  if (config.maxReach !== undefined && ui.maxReach) {
    ui.maxReach.value = config.maxReach.toString();
  }

  if (config.isAdaptive !== undefined && ui.adaptiveLearning) {
    ui.adaptiveLearning.checked = config.isAdaptive;
  }

  if (config.selectedNoteValues !== undefined && ui.noteValues) {
    ui.noteValues.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      (checkbox as HTMLInputElement).checked = config.selectedNoteValues!.includes((checkbox as HTMLInputElement).value);
    });
  }

  if (config.selectedKeySignatures !== undefined && ui.keySignatures) {
    ui.keySignatures.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      (checkbox as HTMLInputElement).checked = config.selectedKeySignatures!.includes((checkbox as HTMLInputElement).value);
    });
  }
}

export function setupEventListeners(onConfigChange: () => void): void {
  const fields: Array<HTMLElement | null> = [
    ui.measuresPerLine,
    ui.lines,
    ui.staffType,
    ui.notesPerStep,
    ui.minNote,
    ui.maxNote,
    ui.maxReach,
    ui.adaptiveLearning,
  ];

  fields.forEach((field) => {
    field?.addEventListener('change', () => {
      if (field === ui.staffType) {
        updateNoteSelectors();
      }

      saveUIConfig();
      onConfigChange();
    });
  });

  [ui.noteValues, ui.keySignatures].forEach((container) => {
    container?.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        saveUIConfig();
        onConfigChange();
      });
    });
  });

  document.querySelectorAll('details').forEach((accordion) => {
    accordion.addEventListener('toggle', saveAccordionState);
  });
}
