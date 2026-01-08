/**
 * Human-like behavior utilities
 * 
 * WHY: Tránh bot detection
 * - Random delays
 * - Human-like typing
 * - Mouse movements
 * - Natural interaction patterns
 */

/**
 * Random delay between min and max (milliseconds)
 * WHY: Human không click/type ngay lập tức
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

/**
 * Human-like typing delay
 * WHY: Typing speed variation (50-100 WPM)
 * Average: ~200ms per character
 */
export function typingDelay(text: string): Promise<void> {
  // Calculate delay based on text length
  // Average typing speed: 200ms per character
  // Variation: 150-250ms per character
  const baseDelay = 200;
  const variation = 50;
  const totalDelay = text.length * (baseDelay + Math.random() * variation * 2 - variation);
  return new Promise((resolve) => setTimeout(resolve, totalDelay));
}

/**
 * Random mouse movement coordinates
 * WHY: Human không di chuyển mouse theo pattern cố định
 */
export function randomMousePosition(): { x: number; y: number } {
  return {
    x: Math.floor(Math.random() * 1920),
    y: Math.floor(Math.random() * 1080),
  };
}

/**
 * Simulate human-like mouse movement
 * WHY: Add natural mouse movements before actions
 */
export async function simulateMouseMovement(
  page: { mouse: { move: (x: number, y: number, options?: { steps?: number }) => Promise<void> } },
  steps: number = 3
): Promise<void> {
  for (let i = 0; i < steps; i++) {
    const pos = randomMousePosition();
    await page.mouse.move(pos.x, pos.y, { steps: 10 });
    await randomDelay(50, 150);
  }
}

/**
 * Human-like click with delay
 */
export async function humanClick(
  page: { mouse: { move: (x: number, y: number) => Promise<void>; click: (x: number, y: number) => Promise<void> } },
  x: number,
  y: number
): Promise<void> {
  // Small random offset
  const offsetX = Math.floor(Math.random() * 5) - 2;
  const offsetY = Math.floor(Math.random() * 5) - 2;
  
  await page.mouse.move(x + offsetX, y + offsetY);
  await randomDelay(100, 300);
  await page.mouse.click(x + offsetX, y + offsetY);
}

/**
 * Human-like typing with delays
 */
export async function humanType(
  page: { keyboard: { type: (text: string, options?: { delay?: number }) => Promise<void> } },
  text: string
): Promise<void> {
  // Type with random delays between characters
  for (const char of text) {
    await page.keyboard.type(char, {
      delay: Math.floor(Math.random() * 50) + 50, // 50-100ms per character
    });
  }
}

