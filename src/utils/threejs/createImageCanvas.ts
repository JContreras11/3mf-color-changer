const MAX_IMAGE_CANVAS_SIZE = 1400;

export default function createImageCanvas(
  file: File
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(imageUrl);
    };

    image.addEventListener('error', () => {
      cleanup();
      reject(new Error(`Could not load image "${file.name}".`));
    });

    image.addEventListener('load', () => {
      const longestSide = Math.max(image.width, image.height);
      const scale = longestSide
        ? Math.min(1, MAX_IMAGE_CANVAS_SIZE / longestSide)
        : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');

      if (!context) {
        cleanup();
        reject(new Error('Could not create an image canvas.'));
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      cleanup();
      resolve(canvas);
    });

    image.src = imageUrl;
  });
}
