import * as THREE from 'three';

import getSurfaceNormalWorld from './getSurfaceNormalWorld';
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
const MIN_SEGMENTS = 8;
const SEGMENTS_PER_MM = 1;
const TEXTURE_PIXELS_PER_SEGMENT = 24;
const SURFACE_OFFSET = 0.05;
const YIELD_EVERY_ROWS = 4;
const FACE_NORMAL_WORLD = new THREE.Vector3();

export default async function applyRasterOverlay({
  camera,
  root,
  targetMesh,
  pointWorld,
  face,
  canvas,
  size,
  rotationDegrees = 0,
  name,
}: Props): Promise<THREE.Mesh> {
  const dimensions = getRasterOverlayDimensions(canvas, size);
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
  const geometry = await createOverlayGeometry(
    canvas,
    placement,
    root,
    targetMesh,
    dimensions.width,
    dimensions.height,
    dimensions.aspect
  );
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
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

  mesh.name = name || 'Overlay';
  mesh.position.set(0, 0, 0);
  mesh.quaternion.identity();
  mesh.renderOrder = 10;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.isOverlay = true;
  mesh.userData.excludeFromPainting = true;
  mesh.raycast = () => null;

  root.add(mesh);

  return mesh;
}

function getOpaqueCells(
  imageData: Uint8ClampedArray,
  cols: number,
  rows: number
) {
  const opaqueCells = new Uint8Array(cols * rows);

  for (let index = 0; index < cols * rows; index += 1) {
    opaqueCells[index] = imageData[index * 4 + 3] >= ALPHA_THRESHOLD ? 1 : 0;
  }

  return opaqueCells;
}

function getActiveVertices(
  opaqueCells: Uint8Array,
  cols: number,
  rows: number
) {
  const activeVertices = new Uint8Array((cols + 1) * (rows + 1));

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (!opaqueCells[row * cols + col]) {
        continue;
      }

      const topLeft = row * (cols + 1) + col;
      const topRight = topLeft + 1;
      const bottomLeft = (row + 1) * (cols + 1) + col;
      const bottomRight = bottomLeft + 1;

      activeVertices[topLeft] = 1;
      activeVertices[topRight] = 1;
      activeVertices[bottomLeft] = 1;
      activeVertices[bottomRight] = 1;
    }
  }

  return activeVertices;
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

async function createOverlayGeometry(
  canvas: HTMLCanvasElement,
  placement: ReturnType<typeof getRasterOverlayPlacement>,
  root: THREE.Object3D,
  targetMesh: THREE.Mesh,
  width: number,
  height: number,
  aspect: number
) {
  const { cols, rows } = getSegmentCounts(
    width,
    height,
    aspect,
    canvas.width,
    canvas.height
  );

  const imageData = getRasterData(canvas, cols, rows);
  const opaqueCells = getOpaqueCells(imageData, cols, rows);
  const activeVertices = getActiveVertices(opaqueCells, cols, rows);
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  const hits = new Uint8Array((cols + 1) * (rows + 1));
  const normalWorld = localDirectionToWorld(root, placement.normalRoot);
  const rayDirectionWorld = normalWorld.clone().negate();
  const rayHeight = Math.max(width, height) * 2 + 2;
  const raycaster = new THREE.Raycaster();
  const planePointRoot = new THREE.Vector3();
  const placementQuaternion = placement.quaternionRoot;
  const placementPosition = placement.positionRoot;

  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const xStart = -width / 2;
  const yStart = -height / 2;

  for (let row = 0; row <= rows; row += 1) {
    if (row > 0 && row % YIELD_EVERY_ROWS === 0) {
      await waitForNextPaint();
    }

    for (let col = 0; col <= cols; col += 1) {
      const vertexIndex = row * (cols + 1) + col;
      const x = xStart + col * cellWidth;
      const y = yStart + row * cellHeight;
      planePointRoot
        .set(x, y, 0)
        .applyQuaternion(placementQuaternion)
        .add(placementPosition);
      const requiresProjection = activeVertices[vertexIndex];
      const projectedPoint = requiresProjection
        ? projectPointToSurface(
            planePointRoot,
            normalWorld,
            rayDirectionWorld,
            rayHeight,
            raycaster,
            root,
            targetMesh
          )
        : null;
      const position = projectedPoint || planePointRoot;

      positions[vertexIndex * 3] = position.x;
      positions[vertexIndex * 3 + 1] = position.y;
      positions[vertexIndex * 3 + 2] = position.z;
      uvs[vertexIndex * 2] = col / cols;
      uvs[vertexIndex * 2 + 1] = 1 - row / rows;
      hits[vertexIndex] = requiresProjection && projectedPoint ? 1 : 0;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellIndex = row * cols + col;

      if (!opaqueCells[cellIndex]) {
        continue;
      }

      const i00 = row * (cols + 1) + col;
      const i10 = i00 + 1;
      const i01 = (row + 1) * (cols + 1) + col;
      const i11 = i01 + 1;

      if (!hits[i00] || !hits[i10] || !hits[i01] || !hits[i11]) {
        continue;
      }

      indices.push(i00, i10, i11, i00, i11, i01);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

function projectPointToSurface(
  planePointRoot: THREE.Vector3,
  normalWorld: THREE.Vector3,
  rayDirectionWorld: THREE.Vector3,
  rayHeight: number,
  raycaster: THREE.Raycaster,
  root: THREE.Object3D,
  targetMesh: THREE.Mesh
) {
  const planePointWorld = root.localToWorld(planePointRoot.clone());
  const rayOrigin = planePointWorld
    .clone()
    .add(normalWorld.clone().multiplyScalar(rayHeight));
  const hit = raycastSurface(
    rayOrigin,
    rayDirectionWorld,
    normalWorld,
    rayHeight * 2,
    raycaster,
    targetMesh
  );

  if (!hit) {
    return null;
  }

  const hitNormalWorld = getSurfaceNormalWorld(
    targetMesh,
    hit.face!,
    hit.point
  );
  const hitNormalRoot = worldDirectionToLocal(root, hitNormalWorld);

  return root
    .worldToLocal(hit.point.clone())
    .add(hitNormalRoot.multiplyScalar(SURFACE_OFFSET));
}

function raycastSurface(
  originWorld: THREE.Vector3,
  directionWorld: THREE.Vector3,
  expectedNormalWorld: THREE.Vector3,
  far: number,
  raycaster: THREE.Raycaster,
  targetMesh: THREE.Mesh
) {
  raycaster.near = 0;
  raycaster.far = far;
  raycaster.set(originWorld, directionWorld);

  const intersections = raycaster.intersectObject(targetMesh, false);
  const primaryHit =
    intersections.find((intersection) => {
      if (!intersection.face) {
        return false;
      }

      return getFaceNormalWorld(targetMesh, intersection.face).dot(
        expectedNormalWorld
      ) > 0;
    }) || null;

  if (primaryHit) {
    return primaryHit;
  }

  raycaster.set(originWorld, directionWorld.clone().negate());

  return (
    raycaster.intersectObject(targetMesh, false).find((intersection) => {
      if (!intersection.face) {
        return false;
      }

      return getFaceNormalWorld(targetMesh, intersection.face).dot(
        expectedNormalWorld
      ) > 0;
    }) || null
  );
}

function getFaceNormalWorld(mesh: THREE.Mesh, face: THREE.Face) {
  return FACE_NORMAL_WORLD.copy(face.normal)
    .transformDirection(mesh.matrixWorld)
    .normalize();
}

function worldDirectionToLocal(
  root: THREE.Object3D,
  directionWorld: THREE.Vector3
) {
  const originRoot = root.worldToLocal(new THREE.Vector3(0, 0, 0));
  const targetRoot = root.worldToLocal(directionWorld.clone());

  return targetRoot.sub(originRoot).normalize();
}

function localDirectionToWorld(
  root: THREE.Object3D,
  directionRoot: THREE.Vector3
) {
  const originWorld = root.localToWorld(new THREE.Vector3(0, 0, 0));
  const targetWorld = root.localToWorld(directionRoot.clone());

  return targetWorld.sub(originWorld).normalize();
}

function getSegmentCounts(
  width: number,
  height: number,
  aspect: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const dominantLength = Math.max(width, height);
  const sizeDrivenDominantSegments = THREE.MathUtils.clamp(
    Math.round(dominantLength * SEGMENTS_PER_MM),
    MIN_SEGMENTS,
    MAX_SEGMENTS
  );
  const sizeDrivenSegments =
    aspect >= 1
      ? {
          cols: sizeDrivenDominantSegments,
          rows: THREE.MathUtils.clamp(
            Math.round(sizeDrivenDominantSegments / Math.max(aspect, 1)),
            MIN_SEGMENTS,
            MAX_SEGMENTS
          ),
        }
      : {
          cols: THREE.MathUtils.clamp(
            Math.round(sizeDrivenDominantSegments * Math.max(aspect, 1e-3)),
            MIN_SEGMENTS,
            MAX_SEGMENTS
          ),
          rows: sizeDrivenDominantSegments,
        };
  const textureDrivenSegments = {
    cols: THREE.MathUtils.clamp(
      Math.round(canvasWidth / TEXTURE_PIXELS_PER_SEGMENT),
      MIN_SEGMENTS,
      MAX_SEGMENTS
    ),
    rows: THREE.MathUtils.clamp(
      Math.round(canvasHeight / TEXTURE_PIXELS_PER_SEGMENT),
      MIN_SEGMENTS,
      MAX_SEGMENTS
    ),
  };

  return {
    cols: Math.max(sizeDrivenSegments.cols, textureDrivenSegments.cols),
    rows: Math.max(sizeDrivenSegments.rows, textureDrivenSegments.rows),
  };
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
