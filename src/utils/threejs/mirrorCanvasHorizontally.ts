export default function mirrorCanvasHorizontally(
  sourceCanvas: HTMLCanvasElement,
  enabled = false
) {
  if (!enabled) {
    return sourceCanvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create a mirrored overlay canvas.');
  }

  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(sourceCanvas, 0, 0);

  return canvas;
}
