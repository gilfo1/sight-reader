import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { 
  initKeySignatures, 
  getUIConfig
} from '../../../src/ui/controls';
import { generateMusicData } from '../../../src/engine/generator';

describe('Key Signature Selection UI', () => {
  beforeEach(() => {
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const bodyContent = doc.body.innerHTML;
    document.body.innerHTML = bodyContent;
  });

  it('should only return selected keys in config', () => {
    initKeySignatures(() => {});
    const keyC: any = document.getElementById('key-C');
    const keyBb: any = document.getElementById('key-Bb');
    const keyB: any = document.getElementById('key-B');
    const chromatic: any = document.getElementById('key-Chromatic');

    expect(keyC).not.toBeNull();
    expect(keyBb).not.toBeNull();
    expect(keyB).not.toBeNull();
    expect(chromatic).not.toBeNull();

    // Deselect C (it's checked by default)
    keyC.checked = false;
    
    // Select Bb and Chromatic
    keyBb.checked = true;
    chromatic.checked = true;
    
    // Ensure B is NOT checked
    keyB.checked = false;

    const config = getUIConfig();
    expect(config.selectedKeySignatures).toContain('Bb');
    expect(config.selectedKeySignatures).toContain('Chromatic');
    expect(config.selectedKeySignatures).not.toContain('C');
    expect(config.selectedKeySignatures).not.toContain('B');
    expect(config.isChromatic).toBe(true);
    
    const data = generateMusicData(config);
    data.forEach(m => {
        expect(m.keySignature).toBe('Bb');
    });
  });
  it('reproduction: C and Bb selected with Chromatic should only result in C or Bb signatures', () => {
    initKeySignatures(() => {});
    
    // Uncheck all first
    document.querySelectorAll('#key-signatures input').forEach((cb: any) => cb.checked = false);
    
    const keyC: any = document.getElementById('key-C');
    const keyBb: any = document.getElementById('key-Bb');
    const chromatic: any = document.getElementById('key-Chromatic');
    
    keyC.checked = true;
    keyBb.checked = true;
    chromatic.checked = true;
    
    const config = getUIConfig();
    expect(config.selectedKeySignatures).toContain('C');
    expect(config.selectedKeySignatures).toContain('Bb');
    expect(config.selectedKeySignatures).toContain('Chromatic');
    
    for (let i = 0; i < 50; i++) {
        const data = generateMusicData(config);
        data.forEach(m => {
            expect(['C', 'Bb']).toContain(m.keySignature);
        });
    }
  });
});
