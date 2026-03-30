import { ALL_PIANO_NOTES, KEY_SIGNATURES } from '../constants/music.js';
import { getNoteValue } from '../utils/music-theory.js';

export function initKeySignatures(onChange) {
  const container = document.getElementById('key-signatures');
  if (!container) return;
  container.innerHTML = '';

  KEY_SIGNATURES.forEach(key => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = key;
    cb.id = 'key-' + key;
    if (key === 'C') cb.checked = true;
    cb.addEventListener('change', onChange);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + key));
    container.appendChild(label);
  });

  const label = document.createElement('label');
  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.value = 'Chromatic';
  cb.id = 'key-Chromatic';
  cb.addEventListener('change', onChange);
  label.appendChild(cb);
  label.appendChild(document.createTextNode(' Chromatic'));
  container.appendChild(label);
}

export function updateNoteSelectors() {
  const staffType = document.getElementById('staff-type')?.value || 'grand';
  const minSelect = document.getElementById('min-note');
  const maxSelect = document.getElementById('max-note');

  if (!minSelect || !maxSelect) return;

  const prevMin = minSelect.value;
  const prevMax = maxSelect.value;

  minSelect.innerHTML = '';
  maxSelect.innerHTML = '';

  let filtered = ALL_PIANO_NOTES;
  if (staffType === 'treble') {
    filtered = ALL_PIANO_NOTES.filter(n => getNoteValue(n) >= getNoteValue('C3') && getNoteValue(n) <= getNoteValue('C6'));
  } else if (staffType === 'bass') {
    filtered = ALL_PIANO_NOTES.filter(n => getNoteValue(n) >= getNoteValue('C1') && getNoteValue(n) <= getNoteValue('C5'));
  }

  filtered.forEach(note => {
    const optMin = document.createElement('option');
    optMin.value = note;
    optMin.textContent = note;
    minSelect.appendChild(optMin);

    const optMax = document.createElement('option');
    optMax.value = note;
    optMax.textContent = note;
    maxSelect.appendChild(optMax);
  });

  if (filtered.some(n => n === prevMin)) minSelect.value = prevMin;
  else minSelect.value = staffType === 'bass' ? 'C1' : (staffType === 'treble' ? 'C3' : 'C2');

  if (filtered.some(n => n === prevMax)) maxSelect.value = prevMax;
  else maxSelect.value = staffType === 'bass' ? 'C5' : (staffType === 'treble' ? 'C6' : 'C6');
}

export function getUIConfig() {
  const measuresPerLine = parseInt(document.getElementById('measures-per-line')?.value || '4');
  const notesPerBeat = parseInt(document.getElementById('notes-per-beat')?.value || '1');
  const linesCount = parseInt(document.getElementById('lines')?.value || '1');
  const staffType = document.getElementById('staff-type')?.value || 'grand';
  const minNote = document.getElementById('min-note')?.value || 'C2';
  const maxNote = document.getElementById('max-note')?.value || 'C6';

  const noteValuesContainer = document.getElementById('note-values');
  let selectedNoteValues = ['q'];
  if (noteValuesContainer) {
    const checked = Array.from(noteValuesContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    if (checked.length > 0) selectedNoteValues = checked;
  }

  const keyContainer = document.getElementById('key-signatures');
  let selectedKeys = [];
  if (keyContainer) {
    selectedKeys = Array.from(keyContainer.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
  }
  
  const isChromatic = selectedKeys.includes('Chromatic');

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

export function setupEventListeners(onConfigChange) {
  const ids = ['measures-per-line', 'lines', 'staff-type', 'notes-per-beat', 'min-note', 'max-note'];
  ids.forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'staff-type') updateNoteSelectors();
      onConfigChange();
    });
  });

  const noteValuesContainer = document.getElementById('note-values');
  noteValuesContainer?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', onConfigChange);
  });
}
