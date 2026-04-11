import { test, expect } from '@playwright/test';

test.describe('Stats Responsive Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should push the music window down when stats are open on narrow screens', async ({ page }) => {
    // Set viewport to narrow (800px)
    await page.setViewportSize({ width: 800, height: 800 });
    
    // Get initial position of the music window (#output contains the VexFlow preview)
    const musicWindow = page.locator('#output');
    const initialBox = await musicWindow.boundingBox();
    if (!initialBox) throw new Error('Could not get initial bounding box');
    
    // Open the stats
    const statsToggle = page.locator('.stats-summary');
    await statsToggle.click();
    
    // Wait for the panel to be visible (it's inside <details>)
    const statsContainer = page.locator('.stats-container');
    await expect(statsContainer).toBeVisible();
    
    // Check if the music window moved down
    const openBox = await musicWindow.boundingBox();
    if (!openBox) throw new Error('Could not get open bounding box');
    
    // The stats panel should have pushed the music window down
    // Since it's a grid row 2 and position: relative, it must push.
    // It should move by at least 120px given its items and layout.
    expect(openBox.y).toBeGreaterThan(initialBox.y + 120);
    
    // Close the stats
    await statsToggle.click();
    await expect(statsContainer).toBeHidden();
    
    const closedBox = await musicWindow.boundingBox();
    if (!closedBox) throw new Error('Could not get closed bounding box');
    
    // It should have returned to the original position
    expect(closedBox.y).toBeCloseTo(initialBox.y, 2);
  });

  test('should reposition stats container below the icon on narrow screens', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    const statsToggle = page.locator('.stats-summary');
    await statsToggle.click();
    
    const toggleBox = await statsToggle.boundingBox();
    const container = page.locator('.stats-container');
    const containerBox = await container.boundingBox();
    
    if (!toggleBox || !containerBox) throw new Error('Could not get bounding boxes');
    
    // Container should be clearly below the toggle icon
    // (using 4px margin as specified in CSS now)
    expect(containerBox.y).toBeGreaterThan(toggleBox.y + toggleBox.height + 2);
  });

  test('should use absolute overlay centered over icon on desktop (wide)', async ({ page }) => {
    // Set viewport to wide (1200px)
    await page.setViewportSize({ width: 1200, height: 800 });
    
    const statsToggle = page.locator('.stats-summary');
    await statsToggle.click();
    
    const toggleBox = await statsToggle.boundingBox();
    const container = page.locator('.stats-container');
    const containerBox = await container.boundingBox();
    
    if (!toggleBox || !containerBox) throw new Error('Could not get bounding boxes');
    
    // In desktop view, it's absolute centered over the icon
    // (transform: translate(-50%, -50%))
    const toggleCenterX = toggleBox.x + toggleBox.width / 2;
    const toggleCenterY = toggleBox.y + toggleBox.height / 2;
    const containerCenterX = containerBox.x + containerBox.width / 2;
    const containerCenterY = containerBox.y + containerBox.height / 2;
    
    expect(containerCenterX).toBeCloseTo(toggleCenterX, 2);
    expect(containerCenterY).toBeCloseTo(toggleCenterY, 2);
    
    // Check if music window is NOT pushed down significantly in absolute mode
    // (Absolute elements don't affect layout flow)
    const musicWindow = page.locator('#output');
    const musicBox = await musicWindow.boundingBox();
    
    // Close it using the X button because the container covers the summary icon on desktop
    const closeBtn = page.locator('#stats-close');
    await closeBtn.click();
    await expect(container).toBeHidden();

    const musicBoxClosed = await musicWindow.boundingBox();
    
    // Should be exactly the same
    expect(musicBox!.y).toBeCloseTo(musicBoxClosed!.y, 1);
  });
});
