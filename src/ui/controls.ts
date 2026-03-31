import { ALL_PIANO_NOTES, KEY_SIGNATURES } from '../constants/music';
import { getNoteValue } from '../utils/music-theory';
import { AppConfig } from '../engine/generator';

const elements = {
  get measuresPerLine() { return document.getElementById('measures-per-line') as HTMLSelectElement; },
  get notesPerBeat() { return document.getElementById('notes-per-beat') as HTMLSelectElement; },
  get lines() { return document.getElementById('lines') as HTMLSelectElement; },
  get staffType() { return document.getElementById('staff-type') as HTMLSelectElement; },
  get minNote() { return document.getElementById('min-note') as HTMLSelectElement; },
  get maxNote() { return document.getElementById('max-note') as HTMLSelectElement; },
  get noteValues() { return document.getElementById('note-values'); },
  get keySignatures() { return document.getElementById('key-signatures'); }
};

export function initKeySignatures(onChange: (e: Event) => void): void {
  const container = elements.keySignatures;
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
  const staffType: string = elements.staffType?.value || 'grand';
  const minSelect = elements.minNote;
  const maxSelect = elements.maxNote;

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

export function getUIConfig(): AppConfig {
  const noteValuesContainer = elements.noteValues;
  let selectedNoteValues: string[] = ['q'];
  if (noteValuesContainer) {
    const checked: string[] = Array.from(noteValuesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
    if (checked.length > 0) selectedNoteValues = checked;
  }

  const keyContainer = elements.keySignatures;
  let selectedKeys: string[] = [];
  if (keyContainer) {
    selectedKeys = Array.from(keyContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
  }
  
  return {
    measuresPerLine: parseInt(elements.measuresPerLine?.value || '4'),
    notesPerBeat: parseInt(elements.notesPerBeat?.value || '1'),
    linesCount: parseInt(elements.lines?.value || '1'),
    staffType: elements.staffType?.value || 'grand',
    minNote: elements.minNote?.value || 'C2',
    maxNote: elements.maxNote?.value || 'C6',
    selectedNoteValues,
    selectedKeySignatures: selectedKeys,
    isChromatic: selectedKeys.includes('Chromatic')
  };
}

export function setupEventListeners(onConfigChange: () => void): void {
  const staffTypeEl = elements.staffType;
  [
    elements.measuresPerLine,
    elements.lines,
    staffTypeEl,
    elements.notesPerBeat,
    elements.minNote,
    elements.maxNote
  ].forEach(el => {
    el?.addEventListener('change', () => {
      if (el === staffTypeEl) updateNoteSelectors();
      onConfigChange();
    });
  });

  elements.noteValues?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', onConfigChange);
  });
}
