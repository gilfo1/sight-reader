import { Factory } from 'vexflow';

/**
 * Renders a grand staff with some notes.
 * @param {HTMLElement} div - The element where the staff will be rendered.
 */
export function renderStaff(div) {
  if (!div) return;
  
  // Ensure the div has an ID, as VexFlow Factory requires one.
  if (!div.id) {
    div.id = 'vexflow-output-' + Math.random().toString(36).substring(2, 9);
  }
  
  const vf = new Factory({ 
    renderer: { 
      elementId: div.id, 
      width: 600, 
      height: 400 
    } 
  });
  
  const score = vf.EasyScore();
  const system = vf.System({ x: 50, y: 50, width: 500 });

  // Add treble stave
  system.addStave({
    voices: [
      score.voice(score.notes('C4/q, D4/q, E4/q, F4/q', { stem: 'up' })),
    ],
  }).addClef('treble').addTimeSignature('4/4');

  // Add bass stave
  system.addStave({
    voices: [
      score.voice(score.notes('C3/h, G2/h', { clef: 'bass' })),
    ],
  }).addClef('bass').addTimeSignature('4/4');

  // Connect staves
  system.addConnector('brace');
  system.addConnector('singleLeft');
  system.addConnector('singleRight');

  vf.draw();
}

// Automatically render if we're in a browser environment.
if (typeof document !== 'undefined') {
  const div = document.getElementById('output');
  if (div) {
    renderStaff(div);
  }
}
