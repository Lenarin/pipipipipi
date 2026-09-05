export function keyBackground(pixels: Uint8ClampedArray): void {
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    if (r > 60 && b > 60 && g < Math.min(r, b) * .6 && Math.abs(r - b) < 70) pixels[i + 3] = 0;
  }
}

/** Texture-import rim, sampled from the original alpha so it cannot grow recursively. */
export function addPixelOutline(pixels: Uint8ClampedArray, width: number, height: number, color: readonly [number, number, number]): void {
  const original = pixels.slice();
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    if (original[offset + 3] > 0) continue;
    const neighbor = (x > 0 && original[offset - 4 + 3] > 100)
      || (x + 1 < width && original[offset + 4 + 3] > 100)
      || (y > 0 && original[offset - width * 4 + 3] > 100)
      || (y + 1 < height && original[offset + width * 4 + 3] > 100);
    if (neighbor) pixels.set([color[0], color[1], color[2], 255], offset);
  }
}
