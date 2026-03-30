import { vi } from 'vitest';

if (typeof HTMLCanvasElement !== 'undefined') {
  const mockContext = {
    measureText: vi.fn().mockReturnValue({ width: 10, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 10 }),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawWindow: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    translate: vi.fn(),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    setLineDash: vi.fn(),
    arc: vi.fn(),
    strokeText: vi.fn(),
    setStrokeStyle: vi.fn(),
    setFillStyle: vi.fn(),
  };
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext);
  
  // VexFlow 5 might use a hidden canvas for text metrics
  // It often checks for a canvas with certain properties
}
