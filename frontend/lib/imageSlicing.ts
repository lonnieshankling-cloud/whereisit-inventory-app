export function sliceImageIntoTiles(
  imageData: ImageData,
  tileSize: number = 640,
  overlapPercent: number = 20
): ImageData[] {
  const overlap = Math.floor(tileSize * (overlapPercent / 100));
  const step = tileSize - overlap;
  const tiles: ImageData[] = [];

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  canvas.width = imageData.width;
  canvas.height = imageData.height;
  ctx.putImageData(imageData, 0, 0);

  for (let y = 0; y < imageData.height; y += step) {
    for (let x = 0; x < imageData.width; x += step) {
      const width = Math.min(tileSize, imageData.width - x);
      const height = Math.min(tileSize, imageData.height - y);

      const tileCanvas = document.createElement('canvas');
      const tileCtx = tileCanvas.getContext('2d');
      if (!tileCtx) continue;

      tileCanvas.width = width;
      tileCanvas.height = height;
      tileCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height);

      tiles.push(tileCtx.getImageData(0, 0, width, height));
    }
  }

  return tiles;
}
