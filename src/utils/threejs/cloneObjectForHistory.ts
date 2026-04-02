import * as THREE from 'three';

const TEXTURE_KEYS = [
  'alphaMap',
  'aoMap',
  'bumpMap',
  'displacementMap',
  'emissiveMap',
  'envMap',
  'lightMap',
  'map',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
] as const;

const EMPTY_RAYCAST = () => null;

export default function cloneObjectForHistory(
  object: THREE.Object3D
): THREE.Object3D {
  const clone = object.clone(true);

  clone.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const mesh = child as THREE.Mesh;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = cloneMaterial(mesh.material);

    if (mesh.userData.excludeFromPainting) {
      mesh.raycast = EMPTY_RAYCAST;
    }
  });

  return clone;
}

function cloneMaterial(
  material: THREE.Material | THREE.Material[]
): THREE.Material | THREE.Material[] {
  if (Array.isArray(material)) {
    return material.map(cloneSingleMaterial);
  }

  return cloneSingleMaterial(material);
}

function cloneSingleMaterial(material: THREE.Material): THREE.Material {
  const cloned = material.clone();

  for (const key of TEXTURE_KEYS) {
    const texture = (material as THREE.Material & Record<string, unknown>)[key];

    if (texture instanceof THREE.Texture) {
      const clonedTexture = texture.clone();
      clonedTexture.needsUpdate = true;
      (cloned as THREE.Material & Record<string, unknown>)[key] = clonedTexture;
    }
  }

  return cloned;
}
