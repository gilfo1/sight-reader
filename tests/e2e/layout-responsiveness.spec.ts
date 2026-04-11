import { test, expect } from '@playwright/test';

test.describe('General Layout Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const breakpoints = [
    { name: 'Mobile (Narrow)', width: 320, height: 568 },
    { name: 'Mobile (Standard)', width: 375, height: 667 },
    { name: 'Tablet (Small)', width: 640, height: 1024 },
    { name: 'Tablet (Large)', width: 768, height: 1024 },
    { name: 'Desktop (Small)', width: 1024, height: 768 },
    { name: 'Desktop (HD)', width: 1280, height: 800 },
  ];

  for (const { name, width, height } of breakpoints) {
    test(`Layout check at ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      
      // Basic visibility checks
      await expect(page.locator('.app-toolbar')).toBeVisible();
      await expect(page.locator('.output-shell')).toBeVisible();
      await expect(page.locator('.keyboard-dock')).toBeVisible();

      // Check for horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasOverflow, `Horizontal overflow detected at ${width}px`).toBe(false);

      // Check toolbar elements alignment
      const toolbar = page.locator('.app-toolbar');
      const menuBtn = page.locator('#settings-menu-toggle');
      const statsToggle = page.locator('.stats-summary');
      const soundToggle = page.locator('#sound-toggle');

      await expect(menuBtn).toBeVisible();
      await expect(statsToggle).toBeVisible();
      await expect(soundToggle).toBeVisible();

      const toolbarBox = await toolbar.boundingBox();
      const menuBox = await menuBtn.boundingBox();
      const soundBox = await soundToggle.boundingBox();

      if (toolbarBox && menuBox && soundBox) {
        // Elements should be within toolbar bounds
        expect(menuBox.x).toBeGreaterThanOrEqual(toolbarBox.x);
        expect(soundBox.x + soundBox.width).toBeLessThanOrEqual(toolbarBox.x + toolbarBox.width);
      }
    });
  }

  test('Settings Modal responsiveness', async ({ page }) => {
    const menuBtn = page.locator('#settings-menu-toggle');
    const modal = page.locator('#settings-modal');
    const modalPanel = page.locator('.settings-modal-panel');
    
    // Test desktop modal
    await page.setViewportSize({ width: 1200, height: 800 });
    await menuBtn.click();
    await expect(modal).toBeVisible();
    
    let panelBox = await modalPanel.boundingBox();
    if (panelBox) {
        // Should not be full width on desktop (max-width: 940px)
        expect(panelBox.width).toBeLessThanOrEqual(940);
    }
    
    await page.locator('#settings-modal-close').click();
    await expect(modal).toBeHidden();
    
    // Test mobile modal
    await page.setViewportSize({ width: 375, height: 667 });
    await menuBtn.click();
    await expect(modal).toBeVisible();
    
    panelBox = await modalPanel.boundingBox();
    if (panelBox) {
        // Should be nearly full width on mobile (width: min(100%, 940px))
        // Viewport 375px, modal-panel has some margins/padding from .settings-modal (8px on mobile)
        // Actually, on mobile 375px, .settings-modal has padding 8px, so modal-panel should be 375 - 16 = 359px
        expect(panelBox.width).toBeGreaterThanOrEqual(350);
    }
  });

  test('Piano Keyboard Dock behavior', async ({ page }) => {
    const pianoDetails = page.locator('#piano-keyboard-details');
    
    // Check initial state (should be collapsed usually)
    const isExpanded = await pianoDetails.evaluate((el: HTMLDetailsElement) => el.open);
    
    // Toggle keyboard
    const summary = page.locator('.keyboard-summary');
    await summary.click();
    
    const isOpen = await pianoDetails.evaluate((el: HTMLDetailsElement) => el.open);
    expect(isOpen).not.toBe(isExpanded);
    
    // Ensure keyboard is visible when open
    const keyboard = page.locator('#piano-keyboard');
    await expect(keyboard).toBeVisible();
    
    // Ensure keys are rendered (checking for .piano-key-white)
    await expect(page.locator('.piano-key-white').first()).toBeVisible();

    // On 375px width, 7 white keys at 48px each (large mode) is 336px
    // The container at 375px (minus padding/margins) should fit it!
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    let scrollInfo = await page.locator('.keyboard-scroll').evaluate((el) => {
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, hasScroll: el.scrollWidth > el.clientWidth };
    });
    // It should NOT scroll on 375px width with 7 white keys
    expect(scrollInfo.hasScroll).toBe(false);

    // Now test a truly narrow screen (200px)
    await page.setViewportSize({ width: 200, height: 667 });
    await page.waitForTimeout(500);
    
    scrollInfo = await page.locator('.keyboard-scroll').evaluate((el) => {
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, hasScroll: el.scrollWidth > el.clientWidth };
    });
    
    // On 200px, 7 white keys (336px) MUST scroll
    expect(scrollInfo.hasScroll, `Expected scroll on 200px width, but scrollWidth=${scrollInfo.scrollWidth} and clientWidth=${scrollInfo.clientWidth}`).toBe(true);
  });
});
