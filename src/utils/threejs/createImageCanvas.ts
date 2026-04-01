export default function createImageCanvas(
  file: File
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener('error', () => {
      reject(new Error(`Could not read image "${file.name}".`));
    });

    reader.addEventListener('load', () => {
      const image = new Image();

      image.addEventListener('error', () => {
        reject(new Error(`Could not load image "${file.name}".`));
      });

      image.addEventListener('load', () => {
        const canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;

        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Could not create an image canvas.'));
          return;
        }

        context.drawImage(image, 0, 0);
        resolve(canvas);
      });

      image.src = reader.result as string;
    });

    reader.readAsDataURL(file);
  });
}
