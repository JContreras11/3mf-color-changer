import * as THREE from 'three';

import getSurfaceNormalWorld from './getSurfaceNormalWorld';

const MIN_OFFSET = 0.05;
const EPSILON = 1e-8;
const BASE_ROTATION_DEGREES = 180;

type RasterOverlayPlacementProps = {
  camera?: THREE.Camera;
  face: THREE.Face;
  height: number;
  pointWorld: THREE.Vector3;
  root: THREE.Object3D;
  rotationDegrees?: number;
  targetMesh: THREE.Mesh;
  width: number;
};

export type RasterOverlayPlacement = {
  bitangentRoot: THREE.Vector3;
  cornersRoot: [
    THREE.Vector3,
    THREE.Vector3,
    THREE.Vector3,
    THREE.Vector3,
  ];
  height: number;
  normalRoot: THREE.Vector3;
  positionRoot: THREE.Vector3;
  quaternionRoot: THREE.Quaternion;
  tangentRoot: THREE.Vector3;
  width: number;
};

export function getRasterOverlayDimensions(
  canvas: HTMLCanvasElement,
  size: number
) {
  const aspect = canvas.width / canvas.height || 1;
  const maxDimension = Math.max(size, 0.1);
  const width = aspect >= 1 ? maxDimension : maxDimension * aspect;
  const height = aspect >= 1 ? maxDimension / aspect : maxDimension;

  return {
    aspect,
    height,
    maxDimension,
    width,
  };
}

export function getRasterOverlayPlacement({
  camera,
  face,
  height,
  pointWorld,
  root,
  rotationDegrees = 0,
  targetMesh,
  width,
}: RasterOverlayPlacementProps): RasterOverlayPlacement {
  root.updateMatrixWorld(true);
  targetMesh.updateMatrixWorld(true);

  const normalWorld = getSurfaceNormalWorld(targetMesh, face, pointWorld);
  const pointRoot = root.worldToLocal(pointWorld.clone());
  const normalRoot = worldDirectionToLocal(root, normalWorld);
  const tangentRoot =
    getViewAlignedTangentRoot(root, camera, normalWorld, normalRoot) ||
    getFaceTangent(root, targetMesh, face, normalRoot);
  orientTangentToCameraUp(root, camera, normalWorld, normalRoot, tangentRoot);
  const bitangentRoot = new THREE.Vector3()
    .crossVectors(normalRoot, tangentRoot)
    .normalize();
  const positionRoot = pointRoot.add(
    normalRoot.clone().multiplyScalar(
      Math.max(Math.max(width, height) * 0.002, MIN_OFFSET)
    )
  );
  const quaternionRoot = getOverlayQuaternion(
    tangentRoot,
    bitangentRoot,
    normalRoot,
    rotationDegrees
  );
  const cornersRoot = getOverlayCornersRoot({
    height,
    positionRoot,
    quaternionRoot,
    width,
  });

  return {
    bitangentRoot,
    cornersRoot,
    height,
    normalRoot,
    positionRoot,
    quaternionRoot,
    tangentRoot,
    width,
  };
}

function getOverlayQuaternion(
  tangentRoot: THREE.Vector3,
  bitangentRoot: THREE.Vector3,
  normalRoot: THREE.Vector3,
  rotationDegrees: number
) {
  const basis = new THREE.Matrix4().makeBasis(
    tangentRoot,
    bitangentRoot,
    normalRoot
  );
  const quaternion = new THREE.Quaternion().setFromRotationMatrix(basis);
  const rotation = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    THREE.MathUtils.degToRad(rotationDegrees + BASE_ROTATION_DEGREES)
  );

  return quaternion.multiply(rotation).normalize();
}

function getOverlayCornersRoot({
  height,
  positionRoot,
  quaternionRoot,
  width,
}: {
  height: number;
  positionRoot: THREE.Vector3;
  quaternionRoot: THREE.Quaternion;
  width: number;
}) {
  const localCorners = [
    new THREE.Vector3(-width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, -height / 2, 0),
    new THREE.Vector3(width / 2, height / 2, 0),
    new THREE.Vector3(-width / 2, height / 2, 0),
  ] as const;

  return localCorners.map((corner) =>
    corner.clone().applyQuaternion(quaternionRoot).add(positionRoot)
  ) as RasterOverlayPlacement['cornersRoot'];
}

function worldDirectionToLocal(
  root: THREE.Object3D,
  directionWorld: THREE.Vector3
) {
  const originRoot = root.worldToLocal(new THREE.Vector3(0, 0, 0));
  const targetRoot = root.worldToLocal(directionWorld.clone());

  return targetRoot.sub(originRoot).normalize();
}

function getViewAlignedTangentRoot(
  root: THREE.Object3D,
  camera: THREE.Camera | undefined,
  normalWorld: THREE.Vector3,
  normalRoot: THREE.Vector3
) {
  if (!camera) {
    return null;
  }

  camera.updateMatrixWorld(true);

  const cameraRightWorld = new THREE.Vector3()
    .setFromMatrixColumn(camera.matrixWorld, 0)
    .normalize();
  const tangentRight = cameraRightWorld.projectOnPlane(normalWorld);

  if (tangentRight.lengthSq() > EPSILON) {
    return worldDirectionToLocal(root, tangentRight).normalize();
  }

  const cameraUpWorld = new THREE.Vector3()
    .setFromMatrixColumn(camera.matrixWorld, 1)
    .normalize();
  const bitangentWorld = cameraUpWorld.projectOnPlane(normalWorld);

  if (bitangentWorld.lengthSq() > EPSILON) {
    const bitangentRoot = worldDirectionToLocal(root, bitangentWorld).normalize();

    return new THREE.Vector3()
      .crossVectors(bitangentRoot, normalRoot)
      .normalize();
  }

  return null;
}

function orientTangentToCameraUp(
  root: THREE.Object3D,
  camera: THREE.Camera | undefined,
  normalWorld: THREE.Vector3,
  normalRoot: THREE.Vector3,
  tangentRoot: THREE.Vector3
) {
  if (!camera) {
    return;
  }

  camera.updateMatrixWorld(true);

  const cameraUpWorld = new THREE.Vector3()
    .setFromMatrixColumn(camera.matrixWorld, 1)
    .normalize()
    .projectOnPlane(normalWorld);

  if (cameraUpWorld.lengthSq() <= EPSILON) {
    return;
  }

  cameraUpWorld.normalize();

  const tangentWorld = localDirectionToWorld(root, tangentRoot);
  const bitangentWorld = new THREE.Vector3()
    .crossVectors(normalWorld, tangentWorld)
    .normalize();

  if (bitangentWorld.dot(cameraUpWorld) < 0) {
    tangentRoot.negate();
  }

  // Keep the tangent orthogonal and normalized after any negation.
  tangentRoot.projectOnPlane(normalRoot).normalize();
}

function getFaceTangent(
  root: THREE.Object3D,
  mesh: THREE.Mesh,
  face: THREE.Face,
  normalRoot: THREE.Vector3
) {
  const positions = mesh.geometry.attributes.position;
  const meshToRoot = new THREE.Matrix4()
    .copy(root.matrixWorld)
    .invert()
    .multiply(mesh.matrixWorld);

  const v1 = new THREE.Vector3()
    .fromBufferAttribute(positions, face.a)
    .applyMatrix4(meshToRoot);
  const v2 = new THREE.Vector3()
    .fromBufferAttribute(positions, face.b)
    .applyMatrix4(meshToRoot);
  const v3 = new THREE.Vector3()
    .fromBufferAttribute(positions, face.c)
    .applyMatrix4(meshToRoot);

  const edges = [
    new THREE.Vector3().subVectors(v2, v1),
    new THREE.Vector3().subVectors(v3, v2),
    new THREE.Vector3().subVectors(v1, v3),
  ].sort((a, b) => b.lengthSq() - a.lengthSq());

  const tangent = edges[0].clone().projectOnPlane(normalRoot).normalize();

  if (tangent.lengthSq() > EPSILON) {
    return tangent;
  }

  const fallback =
    Math.abs(normalRoot.y) < 0.99
      ? new THREE.Vector3(0, 1, 0)
      : new THREE.Vector3(1, 0, 0);

  return new THREE.Vector3().crossVectors(fallback, normalRoot).normalize();
}

function localDirectionToWorld(root: THREE.Object3D, directionRoot: THREE.Vector3) {
  const originWorld = root.localToWorld(new THREE.Vector3(0, 0, 0));
  const targetWorld = root.localToWorld(directionRoot.clone());

  return targetWorld.sub(originWorld).normalize();
}
