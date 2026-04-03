import { FileLoader, type Group, type Object3DEventMap } from 'three';

import { ThreeMFLoader } from '../../utils/threejs/PatchedThreeMFLoader.js';

export default function readFromUrl(
  url: string
): Promise<Group<Object3DEventMap>> {
  return new Promise((resolve, reject) => {
    const loader = new FileLoader();

    loader.setResponseType('arraybuffer');
    loader.load(
      encodeURI(url),
      (data) => {
        try {
          const threeMfLoader = new ThreeMFLoader();
          const object = threeMfLoader.parse(data as ArrayBuffer);
          resolve(object);
        } catch (error) {
          reject(normalizeLoadError(error));
        }
      },
      undefined,
      (error) => {
        reject(normalizeLoadError(error));
      }
    );
  });
}

function normalizeLoadError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('Could not load 3MF file.');
}
