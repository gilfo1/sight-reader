import { ALL_PIANO_NOTES, KEY_SIGNATURES } from '../constants/music';
import { getNoteValue } from '../utils/music-theory';
import { AppConfig } from '../engine/generator';

export function initKeySignatures(onChange: (e: Event) => void): void {
  const container: HTMLElement | null = document.getElementById('key-signatures');
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
  const staffType: string = (document.getElementById('staff-type') as HTMLSelectElement)?.value || 'grand';
  const minSelect: HTMLSelectElement | null = document.getElementById('min-note') as HTMLSelectElement;
  const maxSelect: HTMLSelectElement | null = document.getElementById('max-note') as HTMLSelectElement;

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

  if (filtered.some(n => n === prevMin)) minSelect.value = prevMin;
  else minSelect.value = staffType === 'bass' ? 'C1' : (staffType === 'treble' ? 'C3' : 'C2');

  if (filtered.some(n => n === prevMax)) maxSelect.value = prevMax;
  else maxSelect.value = staffType === 'bass' ? 'C5' : (staffType === 'treble' ? 'C6' : 'C6');
}

export function getUIConfig(): AppConfig {
  const measuresPerLine: number = parseInt((document.getElementById('measures-per-line') as HTMLSelectElement)?.value || '4');
  const notesPerBeat: number = parseInt((document.getElementById('notes-per-beat') as HTMLSelectElement)?.value || '1');
  const linesCount: number = parseInt((document.getElementById('lines') as HTMLSelectElement)?.value || '1');
  const staffType: string = (document.getElementById('staff-type') as HTMLSelectElement)?.value || 'grand';
  const minNote: string = (document.getElementById('min-note') as HTMLSelectElement)?.value || 'C2';
  const maxNote: string = (document.getElementById('max-note') as HTMLSelectElement)?.value || 'C6';

  const noteValuesContainer: HTMLElement | null = document.getElementById('note-values');
  let selectedNoteValues: string[] = ['q'];
  if (noteValuesContainer) {
    const checked: string[] = Array.from(noteValuesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
    if (checked.length > 0) selectedNoteValues = checked;
  }

  const keyContainer: HTMLElement | null = document.getElementById('key-signatures');
  let selectedKeys: string[] = [];
  if (keyContainer) {
    selectedKeys = Array.from(keyContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => (cb as HTMLInputElement).value);
  }
  
  const isChromatic: boolean = selectedKeys.includes('Chromatic');

  return {
    measuresPerLine,
    notesPerBeat,
    linesCount,
    staffType,
    minNote,
    maxNote,
    selectedNoteValues,
    selectedKeySignatures: selectedKeys,
    isChromatic
  };
}

export function setupEventListeners(onConfigChange: () => void): void {
  const ids: string[] = ['measures-per-line', 'lines', 'staff-type', 'notes-per-beat', 'min-note', 'max-note'];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'staff-type') updateNoteSelectors();
      onConfigChange();
    });
  });

  const noteValuesContainer: HTMLElement | null = document.getElementById('note-values');
  noteValuesContainer?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', onConfigChange);
  });
}
