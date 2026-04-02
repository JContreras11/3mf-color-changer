import * as THREE from 'three';

import { Job } from '../components/JobProvider';
import exportSceneTo3mf from '../utils/3mf/exportSceneTo3mf';
import ProgressPromise from '../utils/ProgressPromise';

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
  const blob = await exportSceneTo3mf(object, baseName);

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
