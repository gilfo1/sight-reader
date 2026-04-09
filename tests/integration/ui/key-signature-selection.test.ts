import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { 
  initKeySignatures, 
  getUIConfig
} from '@/ui/controls';
import { generateScoreData } from '@/engine/music-generator';

describe('Key Signature Selection UI', () => {
  beforeEach(() => {
    const html = readFileSync('./index.html', 'utf-8');
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    document.body.innerHTML = doc.body.innerHTML;
  });

  it('should only return selected keys in config', () => {
    initKeySignatures(() => {});
    const keyC = document.getElementById('key-C') as HTMLInputElement;
    const keyBb = document.getElementById('key-Bb') as HTMLInputElement;
    const keyB = document.getElementById('key-B') as HTMLInputElement;
    const chromatic = document.getElementById('key-Chromatic') as HTMLInputElement;

    expect(keyC).not.toBeNull();
    expect(keyBb).not.toBeNull();
    expect(keyB).not.toBeNull();
    expect(chromatic).not.toBeNull();

    keyC.checked = false;
    keyBb.checked = true;
    chromatic.checked = true;
    keyB.checked = false;

    const config = getUIConfig();
    expect(config.selectedKeySignatures).toContain('Bb');
    expect(config.selectedKeySignatures).toContain('Chromatic');
    expect(config.selectedKeySignatures).not.toContain('C');
    expect(config.selectedKeySignatures).not.toContain('B');
    expect(config.isChromatic).toBe(true);
    
    const data = generateScoreData(config);
    data.forEach(m => {
        expect(m.keySignature).toBe('Bb');
    });
  });
  it('reproduction: C and Bb selected with Chromatic should only result in C or Bb signatures', () => {
    initKeySignatures(() => {});
    document.querySelectorAll<HTMLInputElement>('#key-signatures input').forEach((checkbox) => {
      checkbox.checked = false;
    });
    
    const keyC = document.getElementById('key-C') as HTMLInputElement;
    const keyBb = document.getElementById('key-Bb') as HTMLInputElement;
    const chromatic = document.getElementById('key-Chromatic') as HTMLInputElement;
    
    keyC.checked = true;
    keyBb.checked = true;
    chromatic.checked = true;
    
    const config = getUIConfig();
    expect(config.selectedKeySignatures).toContain('C');
    expect(config.selectedKeySignatures).toContain('Bb');
    expect(config.selectedKeySignatures).toContain('Chromatic');
    
    for (let i = 0; i < 50; i++) {
        const data = generateScoreData(config);
        data.forEach(m => {
            expect(['C', 'Bb']).toContain(m.keySignature);
        });
    }
  });
});
