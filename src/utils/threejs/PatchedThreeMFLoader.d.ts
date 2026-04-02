import type * as THREE from 'three';

declare class ThreeMFLoader {
  availableExtensions: unknown[];
  constructor(manager?: unknown);
  addExtension(extension: unknown): void;
  parse(data: ArrayBuffer): THREE.Group<THREE.Object3DEventMap>;
}

export { ThreeMFLoader };
