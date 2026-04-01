import * as THREE from 'three';

import { Job } from '../components/JobProvider';
import exportSceneTo3mf from '../utils/3mf/exportSceneTo3mf';
import ProgressPromise from '../utils/ProgressPromise';

export const TYPE = 'exportFile';

export default function exportFileJob(
  fileOrPath: string | File,
  object: THREE.Object3D
): Job {
  return {
    type: TYPE,
    label: `Exporting file`,
    progressVariant: 'indeterminate',
    promise: new ProgressPromise(async (resolve, reject) => {
      try {
        const blob = await exportSceneTo3mf(object!, getFileBaseName(fileOrPath));
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = getDownloadName(fileOrPath);
        link.click();
      } catch (e) {
        reject(e);
      }

      resolve();
    }),
  };
}

function getDownloadName(fileOrPath: string | File) {
  return `${getFileBaseName(fileOrPath)}-edited.3mf`;
}

function getFileBaseName(fileOrPath: string | File) {
  const fileName =
    typeof fileOrPath === 'string'
      ? fileOrPath.split('?')[0].split('/').pop() || 'export.3mf'
      : fileOrPath.name || 'export.3mf';

  return fileName.replace(/\.3mf$/i, '') || 'export';
}
