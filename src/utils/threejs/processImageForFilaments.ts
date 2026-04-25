export type FilamentImageOptions = {
  backgroundThreshold: number;
  maxColors: number;
  removeBackground: boolean;
};

export type FilamentImageResult = {
  canvas: HTMLCanvasElement;
  palette: string[];
};

export const MAX_FILAMENT_IMAGE_COLORS = 32;
const DEFAULT_MAX_COLORS = 8;
const DEFAULT_BACKGROUND_THRESHOLD = 46;
const MAX_KMEANS_ITERATIONS = 8;

export function getDefaultFilamentImageOptions(): FilamentImageOptions {
  return {
    backgroundThreshold: DEFAULT_BACKGROUND_THRESHOLD,
    maxColors: DEFAULT_MAX_COLORS,
    removeBackground: false,
  };
}

export function estimateFilamentPalette(
  sourceCanvas: HTMLCanvasElement,
  options: FilamentImageOptions
) {
  const downscaled = downscaleCanvas(sourceCanvas, 320);
  const imageData = getMutableImageData(downscaled);

  if (!imageData) {
    return [];
  }

  if (options.removeBackground) {
    applySimpleBackgroundRemoval(imageData, options.backgroundThreshold);
  }

  const centroids = runKmeans(
    imageData.data,
    imageData.width,
    imageData.height,
    options.maxColors
  );

  return centroids.map((color) => rgbToHex(color[0], color[1], color[2]));
}

export function processImageForFilaments(
  sourceCanvas: HTMLCanvasElement,
  options: FilamentImageOptions
): FilamentImageResult {
  const canvas = cloneCanvas(sourceCanvas);
  const imageData = getMutableImageData(canvas);

  if (!imageData) {
    return {
      canvas,
      palette: [],
    };
  }

  if (options.removeBackground) {
    applySimpleBackgroundRemoval(imageData, options.backgroundThreshold);
  }

  const centroids = runKmeans(
    imageData.data,
    imageData.width,
    imageData.height,
    options.maxColors
  );

  if (centroids.length > 0) {
    remapImageToPalette(imageData.data, centroids);
  }

  const context = canvas.getContext('2d');

  if (context) {
    context.putImageData(imageData, 0, 0);
  }

  return {
    canvas,
    palette: centroids.map((color) => rgbToHex(color[0], color[1], color[2])),
  };
}

function getMutableImageData(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  if (!context) {
    return null;
  }

  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function downscaleCanvas(sourceCanvas: HTMLCanvasElement, maxSide: number) {
  const longestSide = Math.max(sourceCanvas.width, sourceCanvas.height);

  if (longestSide <= maxSide) {
    return cloneCanvas(sourceCanvas);
  }

  const scale = maxSide / longestSide;
  const canvas = document.createElement('canvas');

  canvas.width = Math.max(1, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(1, Math.round(sourceCanvas.height * scale));

  const context = canvas.getContext('2d');

  if (!context) {
    return cloneCanvas(sourceCanvas);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  return canvas;
}

function cloneCanvas(sourceCanvas: HTMLCanvasElement) {
  const canvas = document.createElement('canvas');

  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const context = canvas.getContext('2d');

  if (context) {
    context.drawImage(sourceCanvas, 0, 0);
  }

  return canvas;
}

function applySimpleBackgroundRemoval(
  imageData: ImageData,
  threshold: number
) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const sampleRadius = Math.max(2, Math.round(Math.min(width, height) * 0.045));
  const samples = [
    ...readCornerSamples(data, width, height, 0, 0, sampleRadius),
    ...readCornerSamples(data, width, height, width - sampleRadius, 0, sampleRadius),
    ...readCornerSamples(data, width, height, 0, height - sampleRadius, sampleRadius),
    ...readCornerSamples(
      data,
      width,
      height,
      width - sampleRadius,
      height - sampleRadius,
      sampleRadius
    ),
  ];

  if (samples.length === 0) {
    return;
  }

  const background = samples.reduce(
    (acc, sample) => {
      acc[0] += sample[0];
      acc[1] += sample[1];
      acc[2] += sample[2];
      return acc;
    },
    [0, 0, 0]
  );

  background[0] /= samples.length;
  background[1] /= samples.length;
  background[2] /= samples.length;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];

    if (alpha === 0) {
      continue;
    }

    const distance = colorDistance(
      data[index],
      data[index + 1],
      data[index + 2],
      background[0],
      background[1],
      background[2]
    );

    if (distance <= threshold) {
      data[index + 3] = 0;
    }
  }
}

function readCornerSamples(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  size: number
) {
  const samples: [number, number, number][] = [];

  for (let y = startY; y < Math.min(height, startY + size); y += 1) {
    for (let x = startX; x < Math.min(width, startX + size); x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha < 12) {
        continue;
      }

      samples.push([data[index], data[index + 1], data[index + 2]]);
    }
  }

  return samples;
}

function runKmeans(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number,
  maxColors: number
): [number, number, number][] {
  const clampedColors = Math.max(
    1,
    Math.min(MAX_FILAMENT_IMAGE_COLORS, Math.round(maxColors))
  );
  const pixels = sampleOpaquePixels(rgbaData, width, height);

  if (pixels.length === 0) {
    return [];
  }

  const clusterCount = Math.min(clampedColors, pixels.length);
  const centroids = initializeCentroids(pixels, clusterCount);
  const assignment = new Uint16Array(pixels.length);

  for (let iteration = 0; iteration < MAX_KMEANS_ITERATIONS; iteration += 1) {
    const sums = new Array(clusterCount)
      .fill(null)
      .map(() => [0, 0, 0, 0] as [number, number, number, number]);

    for (let pixelIndex = 0; pixelIndex < pixels.length; pixelIndex += 1) {
      const pixel = pixels[pixelIndex];
      let bestCluster = 0;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
        const centroid = centroids[clusterIndex];
        const distance = colorDistance(
          pixel[0],
          pixel[1],
          pixel[2],
          centroid[0],
          centroid[1],
          centroid[2]
        );

        if (distance < bestDistance) {
          bestDistance = distance;
          bestCluster = clusterIndex;
        }
      }

      assignment[pixelIndex] = bestCluster;
      sums[bestCluster][0] += pixel[0];
      sums[bestCluster][1] += pixel[1];
      sums[bestCluster][2] += pixel[2];
      sums[bestCluster][3] += 1;
    }

    for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
      const sum = sums[clusterIndex];

      if (sum[3] === 0) {
        const fallback = pixels[Math.floor((clusterIndex / clusterCount) * pixels.length)];
        centroids[clusterIndex] = [...fallback] as [number, number, number];
        continue;
      }

      centroids[clusterIndex] = [
        Math.round(sum[0] / sum[3]),
        Math.round(sum[1] / sum[3]),
        Math.round(sum[2] / sum[3]),
      ];
    }
  }

  const usage = new Array(clusterCount).fill(0);

  for (let index = 0; index < assignment.length; index += 1) {
    usage[assignment[index]] += 1;
  }

  return centroids
    .map((centroid, index) => ({
      centroid,
      usage: usage[index],
    }))
    .filter((entry) => entry.usage > 0)
    .sort((a, b) => b.usage - a.usage)
    .map((entry) => entry.centroid as [number, number, number]);
}

function sampleOpaquePixels(
  rgbaData: Uint8ClampedArray,
  width: number,
  height: number
) {
  const totalPixels = width * height;
  const step = totalPixels > 32_000 ? Math.ceil(totalPixels / 32_000) : 1;
  const pixels: [number, number, number][] = [];

  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += step) {
    const rgbaIndex = pixelIndex * 4;

    if (rgbaData[rgbaIndex + 3] < 16) {
      continue;
    }

    pixels.push([
      rgbaData[rgbaIndex],
      rgbaData[rgbaIndex + 1],
      rgbaData[rgbaIndex + 2],
    ]);
  }

  return pixels;
}

function initializeCentroids(
  pixels: [number, number, number][],
  clusterCount: number
) {
  const centroids: [number, number, number][] = [];
  const used = new Set<number>();

  for (let index = 0; index < clusterCount; index += 1) {
    const target = Math.floor((index / clusterCount) * pixels.length);
    let pointer = target;

    while (used.has(pointer) && pointer < pixels.length - 1) {
      pointer += 1;
    }

    used.add(pointer);
    centroids.push([...pixels[pointer]] as [number, number, number]);
  }

  return centroids;
}

function remapImageToPalette(
  rgbaData: Uint8ClampedArray,
  palette: [number, number, number][]
) {
  for (let index = 0; index < rgbaData.length; index += 4) {
    if (rgbaData[index + 3] === 0) {
      continue;
    }

    const [r, g, b] = findClosestColor(
      rgbaData[index],
      rgbaData[index + 1],
      rgbaData[index + 2],
      palette
    );

    rgbaData[index] = r;
    rgbaData[index + 1] = g;
    rgbaData[index + 2] = b;
  }
}

function findClosestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  let closest = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < palette.length; index += 1) {
    const candidate = palette[index];
    const distance = colorDistance(
      r,
      g,
      b,
      candidate[0],
      candidate[1],
      candidate[2]
    );

    if (distance < bestDistance) {
      bestDistance = distance;
      closest = candidate;
    }
  }

  return closest;
}

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;

  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHex(r: number, g: number, b: number) {
  const normalize = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${normalize(r)}${normalize(g)}${normalize(b)}`;
}
