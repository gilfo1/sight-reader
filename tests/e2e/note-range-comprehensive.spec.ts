import { test, expect } from '@playwright/test';

test.describe('Note Range Comprehensive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Open settings modal
    await page.locator('#settings-menu-toggle').click();
    await expect(page.locator('#settings-modal')).toBeVisible();
  });

  test('should align handles horizontally in all staff modes', async ({ page }) => {
    const staffTypes = ['treble', 'bass', 'grand'];
    const staffSelect = page.locator('#staff-type');
    
    for (const staffType of staffTypes) {
      await staffSelect.selectOption(staffType);
      
      const handles = await page.locator('.note-range-handle').all();
      expect(handles.length).toBeGreaterThan(0);
      
      let initialX: number | null = null;
      for (const handle of handles) {
        const box = await handle.boundingBox();
        if (!box) throw new Error(`Could not find bounding box for ${staffType} handle`);
        
        const centerX = box.x + box.width / 2;
        if (initialX === null) {
          initialX = centerX;
        } else {
          // Check if they are aligned horizontally (within 2px)
          expect(Math.abs(centerX - initialX)).toBeLessThan(2);
        }
      }
    }
  });

  test('should snap handle to note when dragging in treble mode', async ({ page }) => {
    await page.locator('#staff-type').selectOption('treble');
    const upperHandle = page.locator('.note-range-handle-upper');
    const summary = page.locator('#note-range-value-summary');
    
    const initialBox = await upperHandle.boundingBox();
    if (!initialBox) throw new Error('Could not find upper handle bounding box');
    
    // Drag it down significantly
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2 + 100, { steps: 10 });
    
    // Give it a tiny bit of time to process and update DOM
    await page.waitForTimeout(100);
    
    const newBox = await upperHandle.boundingBox();
    if (!newBox) throw new Error('Could not find new upper handle bounding box');
    
    // It should have moved down
    expect(newBox.y).toBeGreaterThan(initialBox.y);
    
    // It should have snapped to a note (not exactly +50, but matching a note position)
    // We can check if the summary changed
    const finalSummary = await summary.innerText();
    expect(finalSummary).not.toMatch(/c6/i); // Treble default max is C6
    
    await page.mouse.up();
  });

  test('should respect grand staff stave restrictions (bass handle below C4)', async ({ page }) => {
    await page.locator('#staff-type').selectOption('grand');
    const lowerHandle = page.locator('.note-range-handle-lower');
    
    const initialBox = await lowerHandle.boundingBox();
    if (!initialBox) throw new Error('Could not find lower handle bounding box');
    
    // Start drag
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y + initialBox.height / 2);
    await page.mouse.down();
    
    // Drag WAY UP (into treble area)
    await page.mouse.move(initialBox.x + initialBox.width / 2, initialBox.y - 300);
    
    const summary = await page.locator('#note-range-value-summary').innerText();
    const minNote = summary.split(' - ')[0];
    
    // It should be capped below C4 (B3 or lower)
    // C4 note value is 60. B3 is 59.
    // In note-range.ts, GRAND_STAFF_LOGICAL_SPLIT_NOTE = 'C4'
    // and clef === 'bass' filters note < C4.
    expect(minNote.toLowerCase()).not.toContain('c4');
    expect(minNote.toLowerCase()).not.toContain('d4');
    expect(minNote.toLowerCase()).not.toContain('c5');
    
    await page.mouse.up();
  });

  test('should never allow minNote to exceed maxNote', async ({ page }) => {
    await page.locator('#staff-type').selectOption('treble');
    const lowerHandle = page.locator('.note-range-handle-lower');
    const upperHandle = page.locator('.note-range-handle-upper');
    
    const lowerBox = await lowerHandle.boundingBox();
    const upperBox = await upperHandle.boundingBox();
    if (!lowerBox || !upperBox) throw new Error('Could not find bounding boxes');
    
    // Drag lower handle WAY ABOVE upper handle
    await page.mouse.move(lowerBox.x + lowerBox.width / 2, lowerBox.y + lowerBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lowerBox.x + lowerBox.width / 2, upperBox.y - 100);
    
    const summary = await page.locator('#note-range-value-summary').innerText();
    const [minNote, maxNote] = summary.split(' - ');
    
    // They should be the same note (capped)
    expect(minNote.toLowerCase()).toBe(maxNote.toLowerCase());
    
    await page.mouse.up();
  });

  test('should show hover state on note heads', async ({ page }) => {
    await page.locator('#staff-type').selectOption('grand');
    const upperHandle = page.locator('.note-range-handle-upper');
    
    // Hover handle
    await upperHandle.hover();
    
    // Check for hovered note class in SVG
    const hoveredNote = page.locator('.note-range-note-hovered');
    await expect(hoveredNote).toBeVisible();
    
    // Start drag
    await page.mouse.down();
    await page.mouse.move(200, 200); // Random move
    
    // Still hovered during drag
    await expect(hoveredNote).toBeVisible();
    
    // Stop drag
    await page.mouse.up();
    
    // Hover should be cleared after re-render (since mouse is likely not over the new handle position)
    // Or at least it shouldn't be stuck forever.
  });
});
