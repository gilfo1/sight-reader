import { test, expect } from '@playwright/test';

test.describe('Toolbar Overflow Check', () => {
  test('should not have horizontal scrollbar on narrow screens when stats are open', async ({ page }) => {
    await page.goto('/');
    
    // Test multiple narrow widths
    const widths = [320, 375, 414, 640, 768, 1000];
    
    for (const width of widths) {
      await page.setViewportSize({ width, height: 800 });
      
      // Open stats
      const statsToggle = page.locator('.stats-summary');
      await statsToggle.click();
      
      // Check for overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      const toolbar = page.locator('.app-toolbar');
      const toolbarBox = await toolbar.boundingBox();
      if (toolbarBox) {
        console.log(`Toolbar width: ${toolbarBox.width}`);
      }
      
      const details = page.locator('#stats-details');
      const detailsDisplay = await details.evaluate((el) => window.getComputedStyle(el).display);
      console.log(`stats-details display: ${detailsDisplay}`);
      
      const statsContainer = page.locator('.stats-container');
      const containerDisplay = await statsContainer.evaluate((el) => window.getComputedStyle(el).display);
      console.log(`stats-container display: ${containerDisplay}`);
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      
      console.log(`Width ${width}: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`);
      
      expect(overflow, `Horizontal overflow detected at width ${width}: scrollWidth=${scrollWidth}, innerWidth=${innerWidth}`).toBe(false);
      
      // Also check if the hamburger and sound toggle are visible
      const hamburger = page.locator('.icon-button-menu');
      const soundToggle = page.locator('.toolbar-actions');
      
      await expect(hamburger).toBeVisible();
      await expect(soundToggle).toBeVisible();
      
      // Check their positions - should be within viewport
      const hamBox = await hamburger.boundingBox();
      const soundBox = await soundToggle.boundingBox();
      
      if (hamBox) {
        expect(hamBox.x).toBeGreaterThanOrEqual(0);
        expect(hamBox.x + hamBox.width).toBeLessThanOrEqual(width);
      }
      
      if (soundBox) {
        expect(soundBox.x).toBeGreaterThanOrEqual(0);
        expect(soundBox.x + soundBox.width).toBeLessThanOrEqual(width);
      }
      
      // Check stats container width - should be full viewport width (or very close)
      const containerBox = await statsContainer.boundingBox();
      if (containerBox) {
        // Since we use negative margins to reach the edges, it should be exactly width
        expect(containerBox.width).toBeCloseTo(width, 1);
        expect(containerBox.x).toBeCloseTo(0, 1);
      }
      
      // Close stats for next iteration
      await statsToggle.click();
    }
  });
});
