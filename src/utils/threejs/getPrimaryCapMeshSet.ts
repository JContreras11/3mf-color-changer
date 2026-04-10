import * as THREE from 'three';

const CAP_NAME_TOKENS = [
  'cap',
  'crown',
  'front',
  'frontal',
  'visor',
  'visera',
  'brim',
  'bill',
  'malla',
  'mesh',
  'panel',
  'back',
] as const;
const ADDON_NAME_TOKENS = [
  'antler',
  'horn',
  'viking',
  'samurai',
  'deer',
  'cuerno',
  'addon',
] as const;

type MeshEntry = {
  box: THREE.Box3;
  center: THREE.Vector3;
  mesh: THREE.Mesh;
  name: string;
  size: THREE.Vector3;
  volume: number;
};

export default function getPrimaryCapMeshSet(root: THREE.Object3D | null) {
  if (!root) {
    return new Set<string>();
  }

  root.updateWorldMatrix(true, true);

  const entries: MeshEntry[] = [];

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (
      !mesh.isMesh ||
      mesh.userData.isOverlay ||
      mesh.userData.excludeFromPainting ||
      !(mesh.geometry instanceof THREE.BufferGeometry)
    ) {
      return;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const size = box.getSize(new THREE.Vector3());
    const volume = size.x * size.y * size.z;

    if (!Number.isFinite(volume) || volume <= 0) {
      return;
    }

    entries.push({
      box,
      center: box.getCenter(new THREE.Vector3()),
      mesh,
      name: normalizeName(getMeshLabel(mesh)),
      size,
      volume,
    });
  });

  if (entries.length === 0) {
    return new Set<string>();
  }

  const maxVolume = Math.max(...entries.map((entry) => entry.volume));
  const volumeThreshold = maxVolume * 0.12;
  const seedEntries = entries.filter(
    (entry) =>
      entry.volume >= volumeThreshold || hasToken(entry.name, CAP_NAME_TOKENS)
  );
  const fallbackSeed = seedEntries.length > 0 ? seedEntries : [entries[0]];
  const capBox = fallbackSeed.reduce(
    (box, entry) => box.union(entry.box.clone()),
    fallbackSeed[0].box.clone()
  );
  const capSize = capBox.getSize(new THREE.Vector3());
  const capDiagonal = capSize.length();
  const zAllowance = capSize.z * 0.35;

  const selected = entries.filter((entry) => {
    if (hasToken(entry.name, ADDON_NAME_TOKENS)) {
      return false;
    }

    if (hasToken(entry.name, CAP_NAME_TOKENS)) {
      return true;
    }

    if (entry.volume >= volumeThreshold) {
      return true;
    }

    const centerDistance = distanceToBox(entry.center, capBox);
    const withinCapEnvelope = centerDistance <= capDiagonal * 0.16;
    const belowAddonBand = entry.center.z <= capBox.max.z + zAllowance;

    return withinCapEnvelope && belowAddonBand;
  });

  return new Set(selected.map((entry) => entry.mesh.uuid));
}

function getMeshLabel(mesh: THREE.Mesh) {
  const labels: string[] = [];
  let current: THREE.Object3D | null = mesh;

  while (current) {
    if (current.name) {
      labels.push(current.name);
    }

    current = current.parent;
  }

  return labels.join(' ');
}

function normalizeName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasToken(name: string, tokens: readonly string[]) {
  if (!name) {
    return false;
  }

  return tokens.some((token) => name.includes(token));
}

function distanceToBox(point: THREE.Vector3, box: THREE.Box3) {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
  const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
  const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
