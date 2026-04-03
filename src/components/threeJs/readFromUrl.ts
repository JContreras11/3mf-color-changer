import type { Group, Object3DEventMap } from 'three';

import { ThreeMFLoader } from '../../utils/threejs/PatchedThreeMFLoader.js';
import { normalizeExamplePath } from '../../utils/examplePaths';

export default function readFromUrl(
  url: string,
  options?: {
    signal?: AbortSignal;
  }
): Promise<Group<Object3DEventMap>> {
  return loadFromUrl(url, options?.signal);
}

async function loadFromUrl(url: string, signal?: AbortSignal) {
  const normalizedUrl = encodeURI(normalizeExamplePath(url));
  const response = await fetch(normalizedUrl, {
    cache: 'no-store',
    signal,
  });

  if (!response.ok) {
    throw new Error('Could not load 3MF file.');
  }

  try {
    const threeMfLoader = new ThreeMFLoader();
    const data = await response.arrayBuffer();
    return threeMfLoader.parse(data);
  } catch (error) {
    throw normalizeLoadError(error);
  }
}

function normalizeLoadError(error: unknown): Error {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return error;
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Could not load 3MF file.');
}
