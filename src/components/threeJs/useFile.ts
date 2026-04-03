import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

import readFromFile from './readFromFile';
import readFromUrl from './readFromUrl';
import { normalizeExamplePath } from '../../utils/examplePaths';

type UseFileState = {
  error: Error | null;
  isLoading: boolean;
};

export default function useFile(
  file: File | string | undefined
): [
  THREE.Object3D | null,
  (object: THREE.Object3D | null) => void,
  UseFileState,
] {
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    const abortController = new AbortController();
    requestIdRef.current = requestId;

    const isCurrentRequest = () =>
      requestIdRef.current === requestId && !abortController.signal.aborted;

    if (!file) {
      setObject(null);
      setIsLoading(false);
      setError(null);
      return () => {
        abortController.abort();
      };
    }

    setObject(null);
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        let nextObject;

        if (typeof file === 'string') {
          nextObject = await readFromUrl(normalizeExamplePath(file), {
            signal: abortController.signal,
          });
        } else {
          nextObject = await readFromFile(file);
        }

        if (!isCurrentRequest()) {
          return;
        }

        nextObject.rotation.set(-Math.PI / 2, 0, 0); // z-up conversion

        // Objects are way too big, scale them down. Most likely this is because 3MF files are
        // using mm as the unit, and we're using <idk>.
        nextObject.scale.set(0.01, 0.01, 0.01);

        nextObject.traverse(function (child) {
          const sceneChild = child as THREE.Object3D & {
            castShadow: boolean;
            receiveShadow: boolean;
          };
          const mesh = child as THREE.Mesh;

          sceneChild.castShadow = true;
          sceneChild.receiveShadow = true;

          if (mesh.isMesh) {
            // Check if we have a color attribute on the geometry. If we do, we
            // can assume that the model has vertex colors.
            const geometry = mesh.geometry as THREE.BufferGeometry;
            const attributes = geometry.attributes;

            const currentMaterial = Array.isArray(mesh.material)
              ? mesh.material[0]
              : mesh.material;

            mesh.material = new THREE.MeshPhongMaterial({
              color:
                (currentMaterial as THREE.MeshStandardMaterial)?.color?.clone() ||
                new THREE.Color(0xffffff),
              map: (currentMaterial as THREE.MeshStandardMaterial)?.map ?? null,
              transparent:
                (currentMaterial as THREE.MeshStandardMaterial)?.transparent ??
                false,
              opacity:
                (currentMaterial as THREE.MeshStandardMaterial)?.opacity ?? 1,
              vertexColors: !!attributes.color,
              flatShading: true,
            });

            if (child.geometry.index) {
              child.geometry = geometry.toNonIndexed();
            }
          }
        });

        if (isCurrentRequest()) {
          setObject(nextObject);
        }
      } catch (error) {
        if (isAbortError(error) || !isCurrentRequest()) {
          return;
        }

        if (isCurrentRequest()) {
          setError(normalizeLoadError(error));
        }
      } finally {
        if (isCurrentRequest()) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      abortController.abort();
    };
  }, [file]);

  return [object, setObject, { error, isLoading }];
}

function normalizeLoadError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  return new Error('Could not load 3MF file.');
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}
