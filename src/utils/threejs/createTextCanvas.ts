const BASE_FONT_SIZE = 220;
const MAX_TEXT_CANVAS_SIZE = 2048;
const TEXT_RENDER_SCALE = 2;

export default function createTextCanvas(text: string, color: string) {
  const safeText = text.trim();

  if (!safeText) {
    throw new Error('Please enter some text before placing it on the model.');
  }

  const fontSize = BASE_FONT_SIZE * TEXT_RENDER_SCALE;
  const padding = Math.round(fontSize * 0.35);
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  if (!measureContext) {
    throw new Error('Could not create a text canvas.');
  }

  const font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;

  measureContext.font = font;
  const metrics = measureContext.measureText(safeText);
  const rawWidth = Math.max(
    1,
    Math.ceil(metrics.width + padding * 2 + fontSize * 0.1)
  );
  const rawHeight = Math.max(1, Math.ceil(fontSize * 1.6 + padding * 2));
  const longestSide = Math.max(rawWidth, rawHeight);
  const exportScale = longestSide
    ? Math.min(1, MAX_TEXT_CANVAS_SIZE / longestSide)
    : 1;
  const width = Math.max(1, Math.round(rawWidth * exportScale));
  const height = Math.max(1, Math.round(rawHeight * exportScale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create a text canvas.');
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'medium';
  context.clearRect(0, 0, width, height);
  context.scale(exportScale, exportScale);
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(safeText, rawWidth / 2, rawHeight / 2);

  return canvas;
}
