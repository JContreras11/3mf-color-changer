import * as THREE from 'three';

import { Job } from '../components/JobProvider';
import { collectBambuNativeOverlayPatches } from '../utils/3mf/bambu/collectNativeOverlayPatches';
import { patchBambu3mfWithNativeOverlayGeometry } from '../utils/3mf/bambu/nativeOverlayGeometryPatcher';
import { changeColors } from '../utils/3mf/changeColors';
import exportSceneTo3mf from '../utils/3mf/exportSceneTo3mf';
import ProgressPromise from '../utils/ProgressPromise';
import { normalizeExamplePath } from '../utils/examplePaths';

export const TYPE = 'exportFile';

export type GeneratedExportFile = {
  baseName: string;
  blob: Blob;
  downloadName: string;
};

export default function exportFileJob(
  fileOrPath: string | File,
  object: THREE.Object3D
): Job {
  return {
    type: TYPE,
    label: 'Exporting file',
    progressVariant: 'indeterminate',
    promise: new ProgressPromise(async (resolve, reject) => {
      try {
        const exportFile = await generateExportFile(fileOrPath, object);

        downloadExportBlob(exportFile.blob, exportFile.downloadName);
        resolve();
      } catch (e) {
        reject(e);
      }
    }),
  };
}

export async function generateExportFile(
  fileOrPath: string | File,
  object: THREE.Object3D
): Promise<GeneratedExportFile> {
  const baseName = getFileBaseName(fileOrPath);
  const sourceFile = await resolveSourceFile(fileOrPath);
  const hasProjectedOverlays = hasOverlayMeshes(object);
  let blob: Blob;

  if (sourceFile) {
    try {
      const nativePreservingBlob = await changeColors(sourceFile, object);

      if (hasProjectedOverlays) {
        const overlayPatches = collectBambuNativeOverlayPatches(object);

        if (overlayPatches.length === 0) {
          throw new Error(
            'This overlay does not include Bambu-compatible geometry metadata. Remove it and place the graphic again before exporting.'
          );
        }

        const patchedExport = await patchBambu3mfWithNativeOverlayGeometry(
          nativePreservingBlob,
          overlayPatches
        );
        blob = patchedExport.blob;
      } else {
        blob = nativePreservingBlob;
      }
    } catch (error) {
      if (hasProjectedOverlays) {
        throw error;
      }

      blob = await exportSceneTo3mf(object, baseName);
    }
  } else {
    if (hasProjectedOverlays) {
      throw new Error(
        'Native overlay export needs the original Bambu 3MF file. Please use a curated cap file or reload the source 3MF before exporting graphics/text.'
      );
    }

    blob = await exportSceneTo3mf(object, baseName);
  }

  return {
    baseName,
    blob,
    downloadName: getDownloadName(fileOrPath),
  };
}

export function downloadExportBlob(blob: Blob, downloadName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = downloadName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function getDownloadName(fileOrPath: string | File) {
  return `${getFileBaseName(fileOrPath)}-edited.3mf`;
}

export function getFileBaseName(fileOrPath: string | File) {
  const fileName =
    typeof fileOrPath === 'string'
      ? fileOrPath.split('?')[0].split('/').pop() || 'export.3mf'
      : fileOrPath.name || 'export.3mf';

  return fileName.replace(/\.3mf$/i, '') || 'export';
}

async function resolveSourceFile(fileOrPath: string | File) {
  if (typeof fileOrPath !== 'string') {
    return fileOrPath;
  }

  const sourcePath = normalizeExamplePath(fileOrPath);
  const response = await fetch(sourcePath, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const blob = await response.blob();

  return new File([blob], getFileNameFromPath(sourcePath), {
    type: blob.type || 'model/3mf',
  });
}

function getFileNameFromPath(path: string) {
  return path.split('?')[0].split('/').pop() || 'export.3mf';
}

function hasOverlayMeshes(root: THREE.Object3D) {
  let hasOverlay = false;

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.isMesh && mesh.userData.isOverlay) {
      hasOverlay = true;
    }
  });

  return hasOverlay;
}
