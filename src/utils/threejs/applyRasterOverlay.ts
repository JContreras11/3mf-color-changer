import * as THREE from 'three';

import {
  getRasterOverlayDimensions,
  getRasterOverlayPlacement,
} from './rasterOverlayPlacement';

type Props = {
  camera?: THREE.Camera;
  root: THREE.Object3D;
  targetMesh: THREE.Mesh;
  pointWorld: THREE.Vector3;
  face: THREE.Face;
  canvas: HTMLCanvasElement;
  size: number;
  rotationDegrees?: number;
  name?: string;
};

const ALPHA_THRESHOLD = 24;
const MAX_SEGMENTS = 96;
const MIN_SEGMENTS = 12;

export default function applyRasterOverlay({
  camera,
  root,
  targetMesh,
  pointWorld,
  face,
  canvas,
  size,
  rotationDegrees = 0,
  name,
}: Props) {
  const dimensions = getRasterOverlayDimensions(canvas, size);
  const geometry = createOverlayGeometry(
    canvas,
    dimensions.width,
    dimensions.height,
    dimensions.aspect
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide,
    alphaTest: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    toneMapped: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  const placement = getRasterOverlayPlacement({
    camera,
    face,
    height: dimensions.height,
    pointWorld,
    root,
    rotationDegrees,
    targetMesh,
    width: dimensions.width,
  });

  mesh.name = name || 'Overlay';
  mesh.position.copy(placement.positionRoot);
  mesh.quaternion.copy(placement.quaternionRoot);
  mesh.renderOrder = 10;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.isOverlay = true;
  mesh.userData.excludeFromPainting = true;
  mesh.raycast = () => null;

  root.add(mesh);

  return mesh;
}

function createOverlayGeometry(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  aspect: number
) {
  const cols =
    aspect >= 1
      ? MAX_SEGMENTS
      : Math.max(MIN_SEGMENTS, Math.round(MAX_SEGMENTS * aspect));
  const rows =
    aspect >= 1
      ? Math.max(MIN_SEGMENTS, Math.round(MAX_SEGMENTS / aspect))
      : MAX_SEGMENTS;

  const imageData = getRasterData(canvas, cols, rows);
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];

  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const xStart = -width / 2;
  const yStart = -height / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const pixelIndex = (row * cols + col) * 4;
      const alpha = imageData[pixelIndex + 3];

      if (alpha < ALPHA_THRESHOLD) {
        continue;
      }

      const x0 = xStart + col * cellWidth;
      const x1 = x0 + cellWidth;
      const y0 = yStart + row * cellHeight;
      const y1 = y0 + cellHeight;

      const u0 = col / cols;
      const u1 = (col + 1) / cols;
      const v0 = 1 - row / rows;
      const v1 = 1 - (row + 1) / rows;

      const color = new THREE.Color(
        imageData[pixelIndex] / 255,
        imageData[pixelIndex + 1] / 255,
        imageData[pixelIndex + 2] / 255
      );

      pushTriangle(
        positions,
        uvs,
        colors,
        color,
        [x0, y0, 0],
        [x1, y0, 0],
        [x1, y1, 0],
        [u0, v0],
        [u1, v0],
        [u1, v1]
      );
      pushTriangle(
        positions,
        uvs,
        colors,
        color,
        [x0, y0, 0],
        [x1, y1, 0],
        [x0, y1, 0],
        [u0, v0],
        [u1, v1],
        [u0, v1]
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

function pushTriangle(
  positions: number[],
  uvs: number[],
  colors: number[],
  color: THREE.Color,
  p1: [number, number, number],
  p2: [number, number, number],
  p3: [number, number, number],
  uv1: [number, number],
  uv2: [number, number],
  uv3: [number, number]
) {
  positions.push(...p1, ...p2, ...p3);
  uvs.push(...uv1, ...uv2, ...uv3);

  for (let i = 0; i < 3; i += 1) {
    colors.push(color.r, color.g, color.b);
  }
}

function getRasterData(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = width;
  sampleCanvas.height = height;

  const context = sampleCanvas.getContext('2d');

  if (!context) {
    throw new Error('Could not sample the overlay image.');
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(canvas, 0, 0, width, height);

  return context.getImageData(0, 0, width, height).data;
}
