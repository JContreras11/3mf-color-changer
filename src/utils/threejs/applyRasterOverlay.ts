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
const MAX_SEGMENTS = 180;
const MIN_SEGMENTS = 16;
const SEGMENTS_PER_MM = 3;
const SURFACE_OFFSET = 0.05;

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
  const geometry = createOverlayGeometry(
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

function createOverlayGeometry(
  canvas: HTMLCanvasElement,
  placement: ReturnType<typeof getRasterOverlayPlacement>,
  root: THREE.Object3D,
  targetMesh: THREE.Mesh,
  width: number,
  height: number,
  aspect: number
) {
  const { cols, rows } = getSegmentCounts(width, height, aspect);

  const imageData = getRasterData(canvas, cols, rows);
  const positions = new Float32Array((cols + 1) * (rows + 1) * 3);
  const uvs = new Float32Array((cols + 1) * (rows + 1) * 2);
  const indices: number[] = [];
  const hits = new Array<boolean>((cols + 1) * (rows + 1)).fill(false);
  const normalWorld = localDirectionToWorld(root, placement.normalRoot);
  const rayHeight = Math.max(width, height) * 2 + 2;
  const raycaster = new THREE.Raycaster();

  const cellWidth = width / cols;
  const cellHeight = height / rows;
  const xStart = -width / 2;
  const yStart = -height / 2;

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      const vertexIndex = row * (cols + 1) + col;
      const x = xStart + col * cellWidth;
      const y = yStart + row * cellHeight;
      const planePointRoot = new THREE.Vector3(x, y, 0)
        .applyQuaternion(placement.quaternionRoot)
        .add(placement.positionRoot);
      const projectedPoint = projectPointToSurface(
        planePointRoot,
        normalWorld,
        rayHeight,
        raycaster,
        root,
        targetMesh
      );
      const position = projectedPoint || planePointRoot;

      positions[vertexIndex * 3] = position.x;
      positions[vertexIndex * 3 + 1] = position.y;
      positions[vertexIndex * 3 + 2] = position.z;
      uvs[vertexIndex * 2] = col / cols;
      uvs[vertexIndex * 2 + 1] = 1 - row / rows;
      hits[vertexIndex] = !!projectedPoint;
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const pixelIndex = (row * cols + col) * 4;
      const alpha = imageData[pixelIndex + 3];

      if (alpha < ALPHA_THRESHOLD) {
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
  geometry.computeVertexNormals();

  return geometry;
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

function projectPointToSurface(
  planePointRoot: THREE.Vector3,
  normalWorld: THREE.Vector3,
  rayHeight: number,
  raycaster: THREE.Raycaster,
  root: THREE.Object3D,
  targetMesh: THREE.Mesh
) {
  const planePointWorld = root.localToWorld(planePointRoot.clone());
  const rayDirection = normalWorld.clone().negate().normalize();
  const rayOrigin = planePointWorld.clone().add(normalWorld.clone().multiplyScalar(rayHeight));
  const hit = raycastSurface(
    rayOrigin,
    rayDirection,
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

      return (
        getSurfaceNormalWorld(targetMesh, intersection.face, intersection.point).dot(
          expectedNormalWorld
        ) > 0
      );
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

      return (
        getSurfaceNormalWorld(targetMesh, intersection.face, intersection.point).dot(
          expectedNormalWorld
        ) > 0
      );
    }) || null
  );
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

function getSegmentCounts(width: number, height: number, aspect: number) {
  const dominantLength = Math.max(width, height);
  const dominantSegments = THREE.MathUtils.clamp(
    Math.round(dominantLength * SEGMENTS_PER_MM),
    MIN_SEGMENTS,
    MAX_SEGMENTS
  );

  if (aspect >= 1) {
    return {
      cols: dominantSegments,
      rows: THREE.MathUtils.clamp(
        Math.round(dominantSegments / Math.max(aspect, 1)),
        MIN_SEGMENTS,
        MAX_SEGMENTS
      ),
    };
  }

  return {
    cols: THREE.MathUtils.clamp(
      Math.round(dominantSegments * Math.max(aspect, 1e-3)),
      MIN_SEGMENTS,
      MAX_SEGMENTS
    ),
    rows: dominantSegments,
  };
}
