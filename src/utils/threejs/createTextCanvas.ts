export default function createTextCanvas(text: string, color: string) {
  const safeText = text.trim();

  if (!safeText) {
    throw new Error('Please enter some text before placing it on the model.');
  }

  const fontSize = 220;
  const padding = Math.round(fontSize * 0.35);
  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  if (!measureContext) {
    throw new Error('Could not create a text canvas.');
  }

  measureContext.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  const metrics = measureContext.measureText(safeText);
  const width = Math.max(
    1,
    Math.ceil(metrics.width + padding * 2 + fontSize * 0.1)
  );
  const height = Math.max(1, Math.ceil(fontSize * 1.6 + padding * 2));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Could not create a text canvas.');
  }

  context.clearRect(0, 0, width, height);
  context.font = `700 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.fillText(safeText, width / 2, height / 2);

  return canvas;
}
