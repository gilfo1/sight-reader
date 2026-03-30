export function getNoteValue(note) {
  const match = note.match(/^([A-G][#b]*)(-?\d+)$/);
  if (!match) return -1;
  const name = match[1];
  const octave = parseInt(match[2]);
  
  const offsets = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
    'B#': 0, 'Cb': 11, 'Fb': 4, 'E#': 5
  };
  
  let val = offsets[name];
  let octShift = 0;
  if (name === 'B#') octShift = 1;
  if (name === 'Cb') octShift = -1;
  
  return (octave + 1 + octShift) * 12 + val;
}

export function isNoteInKey(noteName, keySignature, scales) {
  const scale = scales[keySignature];
  if (!scale) return true;
  return scale.includes(noteName);
}
