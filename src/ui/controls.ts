import { ALL_PIANO_NOTES, KEY_SIGNATURES } from '@/constants/music';
import { getNoteValue } from '@/utils/theory';
import { GeneratorConfig } from '@/engine/music-generator';
import { loadFromStorage, saveToStorage } from '@/utils/storage';

function getEl<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const ui = {
  get measuresPerLine() { return getEl<HTMLSelectElement>('measures-per-line'); },
  get notesPerStep() { return getEl<HTMLSelectElement>('notes-per-step'); },
  get lines() { return getEl<HTMLSelectElement>('lines'); },
  get staffType() { return getEl<HTMLSelectElement>('staff-type'); },
  get minNote() { return getEl<HTMLSelectElement>('min-note'); },
  get maxNote() { return getEl<HTMLSelectElement>('max-note'); },
  get maxReach() { return getEl<HTMLSelectElement>('max-reach'); },
  get noteValues() { return getEl<HTMLElement>('note-values'); },
  get keySignatures() { return getEl<HTMLElement>('key-signatures'); },
  get adaptiveLearning() { return getEl<HTMLInputElement>('adaptive-learning'); }
};

export function initKeySignatures(onChange: (e: Event) => void): void {
  const container = ui.keySignatures;
  if (!container) return;
  container.innerHTML = '';

  KEY_SIGNATURES.forEach(key => {
    const label: HTMLLabelElement = document.createElement('label');
    const cb: HTMLInputElement = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = key;
    cb.id = 'key-' + key;
    if (key === 'C') cb.checked = true;
    cb.addEventListener('change', onChange);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + key));
    container.appendChild(label);
  });

  const label: HTMLLabelElement = document.createElement('label');
  const cb: HTMLInputElement = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = 'Chromatic';
  cb.id = 'key-Chromatic';
  cb.addEventListener('change', onChange);
  label.appendChild(cb);
  label.appendChild(document.createTextNode(' Chromatic'));
  container.appendChild(label);
}

export function updateNoteSelectors(): void {
  const staffType: string = ui.staffType?.value || 'grand';
  const minSelect = ui.minNote;
  const maxSelect = ui.maxNote;

  if (!minSelect || !maxSelect) return;

  const prevMin: string = minSelect.value;
  const prevMax: string = maxSelect.value;

  minSelect.innerHTML = '';
  maxSelect.innerHTML = '';

  let filtered: string[] = ALL_PIANO_NOTES;
  if (staffType === 'treble') {
    filtered = ALL_PIANO_NOTES.filter(n => getNoteValue(n) >= getNoteValue('C3') && getNoteValue(n) <= getNoteValue('C6'));
  } else if (staffType === 'bass') {
    filtered = ALL_PIANO_NOTES.filter(n => getNoteValue(n) >= getNoteValue('C1') && getNoteValue(n) <= getNoteValue('C5'));
  }

  filtered.forEach(note => {
    const optMin: HTMLOptionElement = document.createElement('option');
    optMin.value = note;
    optMin.textContent = note;
    minSelect.appendChild(optMin);

    const optMax: HTMLOptionElement = document.createElement('option');
    optMax.value = note;
    optMax.textContent = note;
    maxSelect.appendChild(optMax);
  });

  minSelect.value = filtered.includes(prevMin) ? prevMin : (staffType === 'bass' ? 'C1' : (staffType === 'treble' ? 'C3' : 'C2'));
  maxSelect.value = filtered.includes(prevMax) ? prevMax : (staffType === 'bass' ? 'C5' : 'C6');
}

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
  isAdaptive: false
};

export function getUIConfig(): GeneratorConfig {
  const noteValuesContainer = ui.noteValues;
  let selectedNoteValues: string[] = ['q'];
  if (noteValuesContainer) {
    const checked: string[] = Array.from(noteValuesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
    if (checked.length > 0) selectedNoteValues = checked;
  }

  const keyContainer = ui.keySignatures;
  let selectedKeys: string[] = [];
  if (keyContainer) {
    selectedKeys = Array.from(keyContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
  }
  
  return {
    measuresPerLine: parseInt(ui.measuresPerLine?.value || '4'),
    notesPerStep: parseInt(ui.notesPerStep?.value || '1'),
    linesCount: parseInt(ui.lines?.value || '1'),
    staffType: ui.staffType?.value || 'grand',
    minNote: ui.minNote?.value || 'C2',
    maxNote: ui.maxNote?.value || 'C6',
    maxReach: parseInt(ui.maxReach?.value || '12'),
    selectedNoteValues,
    selectedKeySignatures: selectedKeys,
    isChromatic: selectedKeys.includes('Chromatic'),
    isAdaptive: ui.adaptiveLearning?.checked || false
  };
}

export function saveUIConfig(): void {
  saveToStorage('generator-config', getUIConfig());
}

export function applyUIConfig(config: Partial<GeneratorConfig>): void {
  if (config.measuresPerLine !== undefined && ui.measuresPerLine) ui.measuresPerLine.value = config.measuresPerLine.toString();
  if (config.notesPerStep !== undefined && ui.notesPerStep) ui.notesPerStep.value = config.notesPerStep.toString();
  if (config.linesCount !== undefined && ui.lines) ui.lines.value = config.linesCount.toString();
  if (config.staffType !== undefined && ui.staffType) {
    ui.staffType.value = config.staffType;
    updateNoteSelectors();
  }
  if (config.minNote !== undefined && ui.minNote) ui.minNote.value = config.minNote;
  if (config.maxNote !== undefined && ui.maxNote) ui.maxNote.value = config.maxNote;
  if (config.maxReach !== undefined && ui.maxReach) ui.maxReach.value = config.maxReach.toString();
  if (config.isAdaptive !== undefined && ui.adaptiveLearning) ui.adaptiveLearning.checked = config.isAdaptive;

  if (config.selectedNoteValues !== undefined && ui.noteValues) {
    ui.noteValues.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      (cb as HTMLInputElement).checked = config.selectedNoteValues!.includes((cb as HTMLInputElement).value);
    });
  }

  if (config.selectedKeySignatures !== undefined && ui.keySignatures) {
    ui.keySignatures.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      (cb as HTMLInputElement).checked = config.selectedKeySignatures!.includes((cb as HTMLInputElement).value);
    });
  }
}

export function saveAccordionState(): void {
  const accordions = document.querySelectorAll('details');
  const state: Record<string, boolean> = {};
  accordions.forEach(acc => {
    if (acc.id) {
      state[acc.id] = acc.open;
    }
  });
  saveToStorage('accordion-state', state);
}

export function loadAccordionState(): void {
  const state = loadFromStorage<Record<string, boolean>>('accordion-state');
  if (state) {
    Object.keys(state).forEach(id => {
      const acc = document.getElementById(id) as HTMLDetailsElement;
      if (acc) {
        acc.open = state[id]!;
      }
    });
  }
}

export function resetAccordionState(): void {
  const accordions = document.querySelectorAll('details');
  accordions.forEach(acc => {
    // Default: settings open, others closed
    acc.open = acc.id === 'settings-details';
  });
  saveAccordionState();
}

export function setupEventListeners(onConfigChange: () => void): void {
  const staffTypeEl = ui.staffType;
  [
    ui.measuresPerLine,
    ui.lines,
    staffTypeEl,
    ui.notesPerStep,
    ui.minNote,
    ui.maxNote,
    ui.maxReach,
    ui.adaptiveLearning
  ].forEach(el => {
    el?.addEventListener('change', () => {
      if (el === staffTypeEl) updateNoteSelectors();
      saveUIConfig();
      onConfigChange();
    });
  });

  ui.noteValues?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      saveUIConfig();
      onConfigChange();
    });
  });

  ui.keySignatures?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      saveUIConfig();
      onConfigChange();
    });
  });

  document.querySelectorAll('details').forEach(acc => {
    acc.addEventListener('toggle', saveAccordionState);
  });
}
