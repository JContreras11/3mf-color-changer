import * as THREE from 'three';

import type { BambuNativeOverlayPatch } from './nativeOverlayTypes';

export function collectBambuNativeOverlayPatches(
  root: THREE.Object3D
): BambuNativeOverlayPatch[] {
  const patches: BambuNativeOverlayPatch[] = [];

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh || !mesh.userData.isOverlay) {
      return;
    }

    const patch = mesh.userData.bambuNativeOverlayPatch as
      | BambuNativeOverlayPatch
      | undefined;

    if (isUsableOverlayPatch(patch)) {
      patches.push(patch);
    }
  });

  return patches;
}

function isUsableOverlayPatch(
  patch: BambuNativeOverlayPatch | undefined
): patch is BambuNativeOverlayPatch {
  return !!(
    patch &&
    patch.target.modelPath &&
    patch.target.objectId &&
    patch.geometryParts.length > 0
  );
}
