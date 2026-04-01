import * as THREE from 'three';

export default function getFace(
  mesh: THREE.Mesh,
  faceIndex: number
): THREE.Face & { v1: THREE.Vector3; v2: THREE.Vector3; v3: THREE.Vector3 } {
  const triangle = new THREE.Triangle();
  const normal = new THREE.Vector3();
  const position = mesh.geometry.attributes.position;

  let a = faceIndex * 3;
  let b = faceIndex * 3 + 1;
  let c = faceIndex * 3 + 2;

  const index = mesh.geometry.index;
  if (index) {
    a = index.getX(faceIndex * 3);
    b = index.getX(faceIndex * 3 + 1);
    c = index.getX(faceIndex * 3 + 2);
  }

  triangle.setFromAttributeAndIndices(position, a, b, c);
  triangle.getNormal(normal);

  return {
    a,
    b,
    c,
    normal,
    materialIndex: -1, // TODO
    v1: triangle.a,
    v2: triangle.b,
    v3: triangle.c,
  };
}
