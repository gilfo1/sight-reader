import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const DOCS_DIR = './docs/features/note-range';

test.beforeAll(async () => {
  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
  }
});

test.describe('Note Range Selection', () => {
  test('should hover and drag notes to change the range', async ({ page }) => {
    // 1. Open the app
    await page.goto('/');

    // 2. Open the settings modal
    const settingsButton = page.locator('#settings-menu-toggle');
    await settingsButton.click();
    await expect(page.locator('#settings-modal')).toBeVisible();

    // 3. Take a screenshot of the initial state for documentation
    await page.screenshot({ path: path.join(DOCS_DIR, '01-initial-state.png') });

    // 4. Test Hover
    const upperHandle = page.locator('.note-range-handle-upper');
    await expect(upperHandle).toBeVisible();

    // Hover over the upper handle
    await upperHandle.hover();
    
    // Check for visual hover indicator (using screenshot comparison or checking classes/styles)
    // In our code, we add .note-range-note-hovered to the SVG element.
    const hoveredNote = page.locator('.note-range-note-hovered');
    await expect(hoveredNote).toBeVisible();
    await page.screenshot({ path: path.join(DOCS_DIR, '02-hover-state.png') });

    // 5. Test Drag
    const summary = page.locator('#note-range-value-summary');
    const initialSummary = await summary.innerText();
    
    // Get the initial position of the handle
    const box = await upperHandle.boundingBox();
    if (!box) throw new Error('Could not find upper handle bounding box');

    // Drag the handle downwards (strictly vertical as per requirements)
    // Move from center of handle to 50px below
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 100);
    
    // While dragging, check if the summary updates
    const draggingSummary = await summary.innerText();
    expect(draggingSummary.toLowerCase()).not.toBe(initialSummary.toLowerCase());
    
    await page.screenshot({ path: path.join(DOCS_DIR, '03-dragging-state.png') });

    // 6. Finish Drag
    await page.mouse.up();
    
    // Verify that the hover state is cleared after dragging (as per my code logic in stopDragging)
    await expect(hoveredNote).not.toBeVisible();
    
    const finalSummary = await summary.innerText();
    expect(finalSummary.toLowerCase()).not.toBe(initialSummary.toLowerCase());
    
    await page.screenshot({ path: path.join(DOCS_DIR, '04-final-state.png') });
  });

  test('should switch staff type and update the visual', async ({ page }) => {
    await page.goto('/');
    await page.locator('#settings-menu-toggle').click();

    const staffSelect = page.locator('#staff-type');
    await staffSelect.selectOption('treble');

    const label = page.locator('#note-range-selected-staff');
    await expect(label).toHaveText('Treble clef range');
    
    await page.screenshot({ path: path.join(DOCS_DIR, '05-treble-staff.png') });
    
    await staffSelect.selectOption('bass');
    await expect(label).toHaveText('Bass clef range');
    await page.screenshot({ path: path.join(DOCS_DIR, '06-bass-staff.png') });
  });
});
