import * as THREE from 'three';

const BARYCENTER = new THREE.Vector3();
const TRIANGLE = new THREE.Triangle();
const VECTOR_A = new THREE.Vector3();
const VECTOR_B = new THREE.Vector3();
const VECTOR_C = new THREE.Vector3();
const NORMAL_A = new THREE.Vector3();
const NORMAL_B = new THREE.Vector3();
const NORMAL_C = new THREE.Vector3();

export default function getSurfaceNormalWorld(
  mesh: THREE.Mesh,
  face: THREE.Face,
  pointWorld?: THREE.Vector3
) {
  const normals = mesh.geometry.getAttribute('normal');

  if (!normals || !pointWorld) {
    return face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  }

  const pointLocal = mesh.worldToLocal(pointWorld.clone());

  VECTOR_A.fromBufferAttribute(mesh.geometry.getAttribute('position'), face.a);
  VECTOR_B.fromBufferAttribute(mesh.geometry.getAttribute('position'), face.b);
  VECTOR_C.fromBufferAttribute(mesh.geometry.getAttribute('position'), face.c);

  TRIANGLE.set(VECTOR_A, VECTOR_B, VECTOR_C);
  TRIANGLE.getBarycoord(pointLocal, BARYCENTER);

  if (
    !Number.isFinite(BARYCENTER.x) ||
    !Number.isFinite(BARYCENTER.y) ||
    !Number.isFinite(BARYCENTER.z)
  ) {
    return face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  }

  NORMAL_A.fromBufferAttribute(normals, face.a);
  NORMAL_B.fromBufferAttribute(normals, face.b);
  NORMAL_C.fromBufferAttribute(normals, face.c);

  const normalLocal = new THREE.Vector3()
    .addScaledVector(NORMAL_A, BARYCENTER.x)
    .addScaledVector(NORMAL_B, BARYCENTER.y)
    .addScaledVector(NORMAL_C, BARYCENTER.z)
    .normalize();

  if (normalLocal.lengthSq() === 0) {
    return face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
  }

  return normalLocal.transformDirection(mesh.matrixWorld).normalize();
}
