import * as THREE from 'three';

import {
  TRUCKER_ADDON_OPTIONS,
  getCapFamily,
  getCapFamilyLabel,
  getSelectedAddonId,
} from '../etc/designCatalog';
import type { GeneratedExportFile } from '../jobs/exportFile';

export type ExportSceneStats = {
  meshCount: number;
  overlayCount: number;
  triangleCount: number;
};

export type ExportReviewData = GeneratedExportFile &
  ExportSceneStats & {
    baseModelLabel: string;
    generatedAt: number;
    previewObject: THREE.Object3D;
    sourceFileName: string;
    sourceKindLabel: string;
    variantLabel: string | null;
  };

export function createExportReviewData({
  fileOrPath,
  object,
  previewObject,
  generatedFile,
}: {
  fileOrPath: string | File;
  object: THREE.Object3D;
  previewObject: THREE.Object3D;
  generatedFile: GeneratedExportFile;
}): ExportReviewData {
  const selectedAddonId = getSelectedAddonId(fileOrPath);
  const selectedAddon = selectedAddonId
    ? TRUCKER_ADDON_OPTIONS.find((option) => option.id === selectedAddonId)
    : null;

  return {
    ...generatedFile,
    ...collectExportSceneStats(object),
    baseModelLabel: getCapFamilyLabel(getCapFamily(fileOrPath)),
    generatedAt: Date.now(),
    previewObject,
    sourceFileName: getSourceFileName(fileOrPath),
    sourceKindLabel:
      typeof fileOrPath === 'string' ? 'Curated base file' : 'Local upload',
    variantLabel:
      selectedAddon && selectedAddon.title !== 'Base'
        ? selectedAddon.title
        : null,
  };
}

export function collectExportSceneStats(
  root: THREE.Object3D
): ExportSceneStats {
  let meshCount = 0;
  let overlayCount = 0;
  let triangleCount = 0;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh || !mesh.visible) {
      return;
    }

    const geometry = mesh.geometry;
    const position = geometry?.getAttribute?.('position');

    if (!position || position.count === 0) {
      return;
    }

    meshCount += 1;
    triangleCount += geometry.getIndex()
      ? geometry.getIndex()!.count / 3
      : position.count / 3;

    if (mesh.userData.isOverlay) {
      overlayCount += 1;
    }
  });

  return {
    meshCount,
    overlayCount,
    triangleCount,
  };
}

export function getSourceFileName(fileOrPath: string | File) {
  if (typeof fileOrPath !== 'string') {
    return fileOrPath.name || 'upload.3mf';
  }

  return fileOrPath.split('?')[0].split('/').pop() || 'export.3mf';
}
