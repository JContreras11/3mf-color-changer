import * as THREE from 'three';

import type {
  BambuNativeOverlayGeometryPart,
  BambuNativeOverlayPatch,
} from '../3mf/bambu/nativeOverlayTypes';
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
const MAX_SEGMENTS = 384;
const MIN_SEGMENTS = 8;
const SEGMENTS_PER_MM = 5;
const TEXTURE_PIXELS_PER_SEGMENT = 3;
const SURFACE_OFFSET = 0.08;
const NATIVE_GEOMETRY_THICKNESS = 0.55;
const GEOMETRY_POSITION_PRECISION = 1e-5;
const YIELD_EVERY_ROWS = 4;
const FACE_NORMAL_WORLD = new THREE.Vector3();
const GEOMETRY_COLOR_SAMPLE_POINTS: readonly [number, number, number][] = [
  [1 / 3, 1 / 3, 1 / 3],
  [0.6, 0.2, 0.2],
  [0.2, 0.6, 0.2],
  [0.2, 0.2, 0.6],
  [0.5, 0.5, 0],
  [0.5, 0, 0.5],
  [0, 0.5, 0.5],
] as const;

type ThreeMfSourceMetadata = {
  modelPath?: string;
  objectId?: string;
  objectName?: string | null;
  sourceTriangleIndices?: number[];
};

type OverlayGeometryBuild = {
  geometry: THREE.BufferGeometry;
  nativeOverlayPatch: Omit<
    BambuNativeOverlayPatch,
    'overlayId' | 'overlayName'
  > | null;
};

type NativeOverlayImageData = {
  data: Uint8ClampedArray;
  height: number;
  width: number;
};

type GeometryBoundaryEdge = {
  count: number;
  end: number;
  start: number;
};

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
  const overlayBuild = await createOverlayGeometry(
    canvas,
    placement,
    root,
    targetMesh,
    dimensions.width,
    dimensions.height,
    dimensions.aspect
  );
  const geometry = overlayBuild.geometry;
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
  if (overlayBuild.nativeOverlayPatch) {
    mesh.userData.bambuNativeOverlayPatch = {
      ...overlayBuild.nativeOverlayPatch,
      overlayId: mesh.uuid,
      overlayName: mesh.name,
    } satisfies BambuNativeOverlayPatch;
  }
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
  // Use smoothing for occupancy only. Thin logo/text strokes can disappear
  // entirely when a large source image is downsampled with nearest-neighbor.
  // Color export still samples the prepared source canvas directly below.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
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
): Promise<OverlayGeometryBuild> {
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
      // Keep active vertices exportable even if an individual corner ray misses
      // on a steep/curved section. Falling back to the placement plane avoids
      // losing whole thin strokes just because one quad corner could not hit.
      hits[vertexIndex] = requiresProjection ? 1 : 0;
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

  const geometryParts = buildNativeOverlayGeometryParts(geometry, canvas);

  return {
    geometry,
    nativeOverlayPatch: buildNativeOverlayPatch(targetMesh, geometryParts),
  };
}

function getGeometryTriangleVertexIndex(
  index: THREE.BufferAttribute | null,
  faceIndex: number,
  vertexOffset: number
) {
  if (index) {
    return index.getX(faceIndex * 3 + vertexOffset);
  }

  return faceIndex * 3 + vertexOffset;
}

function getNativeOverlayImageData(
  canvas: HTMLCanvasElement
): NativeOverlayImageData {
  const context = canvas.getContext('2d', {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error('Could not read the overlay image for native export.');
  }

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  return {
    data: imageData.data,
    height: imageData.height,
    width: imageData.width,
  };
}

function pickDominantColor(
  colorVotes: Map<string, number>
): { color: string; count: number } | null {
  let selectedColor: string | null = null;
  let selectedCount = 0;

  colorVotes.forEach((count, color) => {
    if (count > selectedCount) {
      selectedColor = color;
      selectedCount = count;
    }
  });

  if (!selectedColor) {
    return null;
  }

  return {
    color: selectedColor,
    count: selectedCount,
  };
}

function buildNativeOverlayGeometryParts(
  surfaceGeometry: THREE.BufferGeometry,
  canvas: HTMLCanvasElement
): BambuNativeOverlayGeometryPart[] {
  const position = surfaceGeometry.getAttribute('position');
  const uv = surfaceGeometry.getAttribute('uv');

  if (!position || !uv) {
    return [];
  }

  const index = surfaceGeometry.getIndex();
  const faceCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);
  const imageData = getNativeOverlayImageData(canvas);
  const trianglesByColor = new Map<string, [number, number, number][]>();

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    const a = getGeometryTriangleVertexIndex(index, faceIndex, 0);
    const b = getGeometryTriangleVertexIndex(index, faceIndex, 1);
    const c = getGeometryTriangleVertexIndex(index, faceIndex, 2);
    const color = sampleOverlayTriangleColorByUv(imageData, uv, a, b, c);

    if (!color) {
      continue;
    }

    const colorTriangles = trianglesByColor.get(color) || [];
    colorTriangles.push([a, b, c]);
    trianglesByColor.set(color, colorTriangles);
  }

  return Array.from(trianglesByColor.entries())
    .sort(([colorA], [colorB]) => colorA.localeCompare(colorB))
    .map(([color, sourceTriangles]) => {
      const surfacePart = buildSurfaceGeometryPart(position, sourceTriangles);
      const solidPart = buildSolidOverlayGeometryPart(
        surfacePart,
        NATIVE_GEOMETRY_THICKNESS
      );
      const meshData = extractNativeGeometryPartData(solidPart);

      surfacePart.dispose();
      solidPart.dispose();

      return {
        color,
        ...meshData,
      };
    })
    .filter((part) => part.triangles.length > 0 && part.vertices.length > 0);
}

function sampleOverlayColorByUv(
  imageData: NativeOverlayImageData,
  u: number,
  v: number
): string | null {
  if (u < 0 || u > 1 || v < 0 || v > 1) {
    return null;
  }

  const pixelX = Math.max(
    0,
    Math.min(imageData.width - 1, Math.round(u * (imageData.width - 1)))
  );
  const pixelY = Math.max(
    0,
    Math.min(imageData.height - 1, Math.round((1 - v) * (imageData.height - 1)))
  );
  const offset = (pixelY * imageData.width + pixelX) * 4;
  const alpha = imageData.data[offset + 3];

  if (alpha < ALPHA_THRESHOLD) {
    return null;
  }

  return `#${toHexByte(imageData.data[offset])}${toHexByte(
    imageData.data[offset + 1]
  )}${toHexByte(imageData.data[offset + 2])}`;
}

function sampleOverlayTriangleColorByUv(
  imageData: NativeOverlayImageData,
  uv: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  a: number,
  b: number,
  c: number
): string | null {
  const colorVotes = new Map<string, number>();
  const au = uv.getX(a);
  const av = uv.getY(a);
  const bu = uv.getX(b);
  const bv = uv.getY(b);
  const cu = uv.getX(c);
  const cv = uv.getY(c);

  for (const [wa, wb, wc] of GEOMETRY_COLOR_SAMPLE_POINTS) {
    const color = sampleOverlayColorByUv(
      imageData,
      au * wa + bu * wb + cu * wc,
      av * wa + bv * wb + cv * wc
    );

    if (!color) {
      continue;
    }

    colorVotes.set(color, (colorVotes.get(color) || 0) + 1);
  }

  return pickDominantColor(colorVotes)?.color || null;
}

function buildSurfaceGeometryPart(
  sourcePosition: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  sourceTriangles: [number, number, number][]
) {
  const vertexLookup = new Map<number, number>();
  const positions: number[] = [];
  const indices: number[] = [];

  for (const triangle of sourceTriangles) {
    const remappedTriangle = triangle.map((sourceVertexIndex) => {
      const existing = vertexLookup.get(sourceVertexIndex);

      if (existing !== undefined) {
        return existing;
      }

      const nextIndex = positions.length / 3;
      positions.push(
        sourcePosition.getX(sourceVertexIndex),
        sourcePosition.getY(sourceVertexIndex),
        sourcePosition.getZ(sourceVertexIndex)
      );
      vertexLookup.set(sourceVertexIndex, nextIndex);

      return nextIndex;
    }) as [number, number, number];

    indices.push(...remappedTriangle);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

function buildSolidOverlayGeometryPart(
  surfaceGeometry: THREE.BufferGeometry,
  thickness: number
) {
  const source = surfaceGeometry.clone();
  source.computeVertexNormals();

  const positions = source.getAttribute('position');
  const normals = source.getAttribute('normal');
  const index =
    source.getIndex() ||
    new THREE.BufferAttribute(
      Uint32Array.from({ length: positions.count }, (_, idx) => idx),
      1
    );
  const vertexCount = positions.count;
  const outputPositions = new Float32Array(vertexCount * 2 * 3);
  const outputIndices: number[] = [];
  const edges = new Map<string, GeometryBoundaryEdge>();
  const depth = Math.max(thickness, 0.01);

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const position = new THREE.Vector3().fromBufferAttribute(
      positions,
      vertexIndex
    );
    const normal = new THREE.Vector3()
      .fromBufferAttribute(normals, vertexIndex)
      .normalize();
    const backPosition = position.clone().addScaledVector(normal, -depth);
    const frontOffset = vertexIndex * 3;
    const backOffset = (vertexIndex + vertexCount) * 3;

    outputPositions[frontOffset] = position.x;
    outputPositions[frontOffset + 1] = position.y;
    outputPositions[frontOffset + 2] = position.z;
    outputPositions[backOffset] = backPosition.x;
    outputPositions[backOffset + 1] = backPosition.y;
    outputPositions[backOffset + 2] = backPosition.z;
  }

  for (let triangleIndex = 0; triangleIndex < index.count; triangleIndex += 3) {
    const a = index.getX(triangleIndex);
    const b = index.getX(triangleIndex + 1);
    const c = index.getX(triangleIndex + 2);

    outputIndices.push(a, b, c);
    outputIndices.push(a + vertexCount, c + vertexCount, b + vertexCount);

    registerGeometryBoundaryEdge(edges, a, b);
    registerGeometryBoundaryEdge(edges, b, c);
    registerGeometryBoundaryEdge(edges, c, a);
  }

  edges.forEach((edge) => {
    if (edge.count !== 1) {
      return;
    }

    outputIndices.push(
      edge.start,
      edge.end + vertexCount,
      edge.end,
      edge.start,
      edge.start + vertexCount,
      edge.end + vertexCount
    );
  });

  const solidGeometry = new THREE.BufferGeometry();
  solidGeometry.setAttribute(
    'position',
    new THREE.BufferAttribute(outputPositions, 3)
  );
  solidGeometry.setIndex(outputIndices);
  solidGeometry.computeVertexNormals();

  source.dispose();

  return solidGeometry;
}

function extractNativeGeometryPartData(
  geometry: THREE.BufferGeometry
): Pick<BambuNativeOverlayGeometryPart, 'triangles' | 'vertices'> {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const faceCount = index
    ? Math.floor(index.count / 3)
    : Math.floor(position.count / 3);
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  for (let vertexIndex = 0; vertexIndex < position.count; vertexIndex += 1) {
    vertices.push([
      roundGeometryPosition(position.getX(vertexIndex)),
      roundGeometryPosition(position.getY(vertexIndex)),
      roundGeometryPosition(position.getZ(vertexIndex)),
    ]);
  }

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    const triangle = [
      getGeometryTriangleVertexIndex(index, faceIndex, 0),
      getGeometryTriangleVertexIndex(index, faceIndex, 1),
      getGeometryTriangleVertexIndex(index, faceIndex, 2),
    ] as [number, number, number];

    if (
      isGeometryTriangleDegenerate(
        vertices[triangle[0]],
        vertices[triangle[1]],
        vertices[triangle[2]]
      )
    ) {
      continue;
    }

    triangles.push(triangle);
  }

  return {
    triangles,
    vertices,
  };
}

function registerGeometryBoundaryEdge(
  edges: Map<string, GeometryBoundaryEdge>,
  start: number,
  end: number
) {
  const key = start < end ? `${start}|${end}` : `${end}|${start}`;
  const existing = edges.get(key);

  if (existing) {
    existing.count += 1;
    return;
  }

  edges.set(key, {
    count: 1,
    end,
    start,
  });
}

function isGeometryTriangleDegenerate(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number]
) {
  const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);

  return ab.cross(ac).lengthSq() < GEOMETRY_POSITION_PRECISION;
}

function roundGeometryPosition(value: number) {
  return (
    Math.round(value / GEOMETRY_POSITION_PRECISION) *
    GEOMETRY_POSITION_PRECISION
  );
}

function buildNativeOverlayPatch(
  targetMesh: THREE.Mesh,
  geometryParts: BambuNativeOverlayGeometryPart[]
): Omit<BambuNativeOverlayPatch, 'overlayId' | 'overlayName'> | null {
  const metadata = getThreeMfSourceMetadata(targetMesh);

  if (
    !metadata?.modelPath ||
    !metadata.objectId ||
    geometryParts.length === 0
  ) {
    return null;
  }

  return {
    geometryParts,
    palette: Array.from(new Set(geometryParts.map((part) => part.color))),
    target: {
      modelPath: metadata.modelPath,
      objectId: metadata.objectId,
      objectName: metadata.objectName,
    },
  };
}

function toHexByte(value: number): string {
  return Math.round(value).toString(16).padStart(2, '0').toUpperCase();
}

function getThreeMfSourceMetadata(
  mesh: THREE.Mesh
): ThreeMfSourceMetadata | null {
  return (mesh.userData.threeMf as ThreeMfSourceMetadata | undefined) || null;
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

      return (
        getFaceNormalWorld(targetMesh, intersection.face).dot(
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
        getFaceNormalWorld(targetMesh, intersection.face).dot(
          expectedNormalWorld
        ) > 0
      );
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
