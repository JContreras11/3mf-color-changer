import * as THREE from 'three';

import changeMeshColor from './threejs/changeMeshColor';

export type TruckerColorSections = {
  brim: string;
  crown: string;
  front: string;
};

export type TruckerColorPreset = {
  description: string;
  id: string;
  label: string;
  sections: TruckerColorSections;
};

export const TRUCKER_COLOR_PRESETS: readonly TruckerColorPreset[] = [
  {
    id: 'classic-americana',
    label: 'Classic Americana',
    description: 'Royal crown, bright visor, and a clean front panel.',
    sections: {
      crown: '#2155F5',
      brim: '#E11D48',
      front: '#F8FAFC',
    },
  },
  {
    id: 'sunset-racing',
    label: 'Sunset Racing',
    description: 'Warm orange crown with a dark charcoal visor.',
    sections: {
      crown: '#F97316',
      brim: '#1F2937',
      front: '#FFF7ED',
    },
  },
  {
    id: 'forest-trail',
    label: 'Forest Trail',
    description: 'Outdoor-inspired green, tan, and cream pairing.',
    sections: {
      crown: '#166534',
      brim: '#B45309',
      front: '#FEF3C7',
    },
  },
  {
    id: 'midnight-steel',
    label: 'Midnight Steel',
    description: 'Dark monochrome combo with a crisp silver face.',
    sections: {
      crown: '#111827',
      brim: '#374151',
      front: '#E5E7EB',
    },
  },
  {
    id: 'ice-pop',
    label: 'Ice Pop',
    description: 'Fresh cyan, punchy magenta, and a bright white front.',
    sections: {
      crown: '#0891B2',
      brim: '#DB2777',
      front: '#FFFFFF',
    },
  },
] as const;

type MeshEntry = {
  boxInCapSpace: THREE.Box3;
  centerInCapSpace: THREE.Vector3;
  flatness: number;
  footprint: number;
  mesh: THREE.Mesh;
  normalizedLabel: string;
  volume: number;
};

type CapSections = {
  brim: THREE.Mesh[];
  crown: THREE.Mesh[];
  front: THREE.Mesh[];
};

const BRIM_NAME_TOKENS = ['visera', 'visor', 'brim', 'bill', 'peak'];
const FRONT_NAME_TOKENS = ['frontal', 'front panel', 'panel frontal', 'front'];

export function applyTruckerCapPreset(
  root: THREE.Object3D,
  sections: TruckerColorSections
) {
  const capSections = resolveTruckerCapSections(root);

  if (!capSections) {
    return false;
  }

  capSections.crown.forEach((mesh) => changeMeshColor(mesh, sections.crown));
  capSections.front.forEach((mesh) => changeMeshColor(mesh, sections.front));
  capSections.brim.forEach((mesh) => changeMeshColor(mesh, sections.brim));

  return true;
}

function resolveTruckerCapSections(root: THREE.Object3D): CapSections | null {
  const capRoot = getPrimaryCapRoot(root);
  const entries = getCapMeshEntries(capRoot);

  if (entries.length < 4) {
    return null;
  }

  const namedSections = resolveNamedTruckerCapSections(entries);

  if (namedSections) {
    return namedSections;
  }

  const overallBox = entries.reduce(
    (box, entry) => box.union(entry.boxInCapSpace.clone()),
    new THREE.Box3().copy(entries[0].boxInCapSpace)
  );
  const capCenter = overallBox.getCenter(new THREE.Vector3());
  const maxFootprint = Math.max(...entries.map((entry) => entry.footprint));
  const maxVolume = Math.max(...entries.map((entry) => entry.volume));

  const brimCandidates = entries
    .filter(
      (entry) =>
        entry.flatness <= 0.32 && entry.footprint >= maxFootprint * 0.035
    )
    .sort((a, b) => {
      const distanceDelta =
        b.centerInCapSpace.distanceToSquared(capCenter) -
        a.centerInCapSpace.distanceToSquared(capCenter);

      if (distanceDelta !== 0) {
        return distanceDelta;
      }

      return b.footprint - a.footprint;
    });

  const brimSeeds = brimCandidates.slice(0, 2);

  if (brimSeeds.length === 0) {
    return null;
  }

  const brimCenter = averageVectors(
    brimSeeds.map((entry) => entry.centerInCapSpace)
  );
  const forwardAxis = brimCenter.clone().sub(capCenter).normalize();

  if (forwardAxis.lengthSq() === 0) {
    return null;
  }

  const remainingEntries = entries.filter(
    (entry) => !brimSeeds.some((seed) => seed.mesh.uuid === entry.mesh.uuid)
  );

  const majorEntries = remainingEntries.filter(
    (entry) => entry.footprint >= maxFootprint * 0.22
  );
  const lateralAxis = getPrincipalAxis(
    majorEntries.length > 0 ? majorEntries : remainingEntries,
    capCenter,
    forwardAxis
  );

  const remainingFootprints = remainingEntries.map((entry) => entry.footprint);
  const maxRemainingFootprint = Math.max(...remainingFootprints);
  const forwardValues = remainingEntries.map((entry) =>
    getProjection(entry.centerInCapSpace, capCenter, forwardAxis)
  );
  const maxAbsLateral = Math.max(
    ...remainingEntries.map((entry) =>
      Math.abs(getProjection(entry.centerInCapSpace, capCenter, lateralAxis))
    ),
    1
  );
  const forwardRange =
    Math.max(...forwardValues) - Math.min(...forwardValues) || 1;
  const frontThreshold = Math.max(0, Math.max(...forwardValues) - forwardRange * 0.42);
  const lateralThreshold = maxAbsLateral * 0.42;

  const topButtonCandidate = remainingEntries
    .filter(
      (entry) =>
        entry.volume <= maxVolume * 0.02 &&
        Math.abs(getProjection(entry.centerInCapSpace, capCenter, lateralAxis)) <=
          lateralThreshold * 0.85
    )
    .sort(
      (a, b) =>
        b.centerInCapSpace.z - a.centerInCapSpace.z ||
        a.volume - b.volume
    )[0];

  const frontMajorSeeds = remainingEntries.filter((entry) => {
    if (topButtonCandidate?.mesh.uuid === entry.mesh.uuid) {
      return false;
    }

    const forwardProjection = getProjection(
      entry.centerInCapSpace,
      capCenter,
      forwardAxis
    );
    const lateralProjection = Math.abs(
      getProjection(entry.centerInCapSpace, capCenter, lateralAxis)
    );

    return (
      forwardProjection >= frontThreshold &&
      lateralProjection <= lateralThreshold &&
      entry.footprint >= maxRemainingFootprint * 0.45
    );
  });

  const fallbackFrontSeed = [...remainingEntries]
    .filter((entry) => topButtonCandidate?.mesh.uuid !== entry.mesh.uuid)
    .sort((a, b) => {
      const forwardDelta =
        getProjection(b.centerInCapSpace, capCenter, forwardAxis) -
        getProjection(a.centerInCapSpace, capCenter, forwardAxis);

      if (forwardDelta !== 0) {
        return forwardDelta;
      }

      return b.footprint - a.footprint;
    })[0];

  const frontSeeds = frontMajorSeeds.length
    ? frontMajorSeeds
    : fallbackFrontSeed
      ? [fallbackFrontSeed]
      : [];

  if (frontSeeds.length === 0) {
    return null;
  }

  const brimIds = new Set(brimSeeds.map((entry) => entry.mesh.uuid));
  const frontIds = new Set(frontSeeds.map((entry) => entry.mesh.uuid));
  const crownIds = new Set<string>();

  if (topButtonCandidate) {
    crownIds.add(topButtonCandidate.mesh.uuid);
  }

  remainingEntries.forEach((entry) => {
    if (frontIds.has(entry.mesh.uuid) || crownIds.has(entry.mesh.uuid)) {
      return;
    }

    const forwardProjection = getProjection(
      entry.centerInCapSpace,
      capCenter,
      forwardAxis
    );
    const lateralProjection = Math.abs(
      getProjection(entry.centerInCapSpace, capCenter, lateralAxis)
    );
    const looksLikeFront =
      forwardProjection >= frontThreshold &&
      lateralProjection <= lateralThreshold * 1.28 &&
      entry.volume >= maxVolume * 0.035;

    if (looksLikeFront) {
      frontIds.add(entry.mesh.uuid);
      return;
    }

    crownIds.add(entry.mesh.uuid);
  });

  return {
    brim: entries
      .filter((entry) => brimIds.has(entry.mesh.uuid))
      .map((entry) => entry.mesh),
    front: entries
      .filter((entry) => frontIds.has(entry.mesh.uuid))
      .map((entry) => entry.mesh),
    crown: entries
      .filter(
        (entry) =>
          !brimIds.has(entry.mesh.uuid) &&
          !frontIds.has(entry.mesh.uuid) &&
          crownIds.has(entry.mesh.uuid)
      )
      .map((entry) => entry.mesh),
  };
}

function getPrimaryCapRoot(root: THREE.Object3D) {
  if (root.children.length === 0) {
    return root;
  }

  return [...root.children].sort((a, b) => {
    const meshCountDelta = countPaintableMeshes(b) - countPaintableMeshes(a);

    if (meshCountDelta !== 0) {
      return meshCountDelta;
    }

    const volumeDelta = getApproximateObjectVolume(b) - getApproximateObjectVolume(a);

    if (volumeDelta !== 0) {
      return volumeDelta;
    }

    return b.children.length - a.children.length;
  })[0];
}

function getCapMeshEntries(capRoot: THREE.Object3D): MeshEntry[] {
  capRoot.updateWorldMatrix(true, true);

  const entries: MeshEntry[] = [];

  capRoot.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (
      !mesh.isMesh ||
      mesh.userData.excludeFromPainting ||
      !(mesh.geometry instanceof THREE.BufferGeometry)
    ) {
      return;
    }

    const boxInCapSpace = getBoundingBoxInObjectSpace(mesh, capRoot);
    const size = boxInCapSpace.getSize(new THREE.Vector3());
    const sortedSizes = [size.x, size.y, size.z].sort((a, b) => b - a);
    const centerInCapSpace = boxInCapSpace.getCenter(new THREE.Vector3());
    const footprint = sortedSizes[0] * sortedSizes[1];
    const volume = size.x * size.y * size.z;
    const flatness = sortedSizes[2] / Math.max(sortedSizes[0], 0.0001);
    const normalizedLabel = normalizeMeshLabel(getMeshLabel(mesh, capRoot));

    entries.push({
      mesh,
      boxInCapSpace,
      centerInCapSpace,
      footprint,
      volume,
      flatness,
      normalizedLabel,
    });
  });

  return entries;
}

function getBoundingBoxInObjectSpace(
  mesh: THREE.Mesh,
  targetSpace: THREE.Object3D
) {
  const geometry = mesh.geometry;

  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }

  const boundingBox = geometry.boundingBox;

  if (!boundingBox) {
    return new THREE.Box3();
  }

  const meshToTarget = new THREE.Matrix4()
    .copy(targetSpace.matrixWorld)
    .invert()
    .multiply(mesh.matrixWorld);
  const corners = getBoxCorners(boundingBox);
  const transformedBox = new THREE.Box3();

  corners.forEach((corner) => {
    transformedBox.expandByPoint(corner.applyMatrix4(meshToTarget));
  });

  return transformedBox;
}

function getBoxCorners(box: THREE.Box3) {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
}

function resolveNamedTruckerCapSections(entries: MeshEntry[]): CapSections | null {
  const brimEntries = entries.filter((entry) =>
    hasAnyNameToken(entry.normalizedLabel, BRIM_NAME_TOKENS)
  );
  const frontEntries = entries.filter((entry) =>
    hasAnyNameToken(entry.normalizedLabel, FRONT_NAME_TOKENS)
  );

  if (brimEntries.length === 0 || frontEntries.length === 0) {
    return null;
  }

  const brimIds = new Set(brimEntries.map((entry) => entry.mesh.uuid));
  const frontIds = new Set(
    frontEntries
      .filter((entry) => !brimIds.has(entry.mesh.uuid))
      .map((entry) => entry.mesh.uuid)
  );
  const crownEntries = entries.filter(
    (entry) => !brimIds.has(entry.mesh.uuid) && !frontIds.has(entry.mesh.uuid)
  );

  if (frontIds.size === 0 || crownEntries.length === 0) {
    return null;
  }

  return {
    brim: brimEntries.map((entry) => entry.mesh),
    front: entries
      .filter((entry) => frontIds.has(entry.mesh.uuid))
      .map((entry) => entry.mesh),
    crown: crownEntries.map((entry) => entry.mesh),
  };
}

function getMeshLabel(mesh: THREE.Mesh, capRoot: THREE.Object3D) {
  const labels: string[] = [];
  let current: THREE.Object3D | null = mesh;

  while (current && current !== capRoot) {
    if (current.name) {
      labels.push(current.name);
    }

    current = current.parent;
  }

  return labels.join(' ');
}

function normalizeMeshLabel(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAnyNameToken(label: string, tokens: readonly string[]) {
  if (!label) {
    return false;
  }

  return tokens.some((token) => label.includes(token));
}

function countPaintableMeshes(object: THREE.Object3D) {
  let count = 0;

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.isMesh && !mesh.userData.excludeFromPainting) {
      count += 1;
    }
  });

  return count;
}

function getApproximateObjectVolume(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());

  return size.x * size.y * size.z;
}

function getProjection(
  point: THREE.Vector3,
  center: THREE.Vector3,
  axis: THREE.Vector3
) {
  return point.clone().sub(center).dot(axis);
}

function averageVectors(vectors: THREE.Vector3[]) {
  const total = vectors.reduce(
    (sum, vector) => sum.add(vector.clone()),
    new THREE.Vector3()
  );

  return total.divideScalar(Math.max(vectors.length, 1));
}

function getPrincipalAxis(
  entries: MeshEntry[],
  center: THREE.Vector3,
  forwardAxis: THREE.Vector3
) {
  const covariance = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  entries.forEach((entry) => {
    const offset = entry.centerInCapSpace.clone().sub(center);
    const projected = offset.sub(
      forwardAxis.clone().multiplyScalar(offset.dot(forwardAxis))
    );

    covariance[0][0] += projected.x * projected.x;
    covariance[0][1] += projected.x * projected.y;
    covariance[0][2] += projected.x * projected.z;
    covariance[1][0] += projected.y * projected.x;
    covariance[1][1] += projected.y * projected.y;
    covariance[1][2] += projected.y * projected.z;
    covariance[2][0] += projected.z * projected.x;
    covariance[2][1] += projected.z * projected.y;
    covariance[2][2] += projected.z * projected.z;
  });

  let axis = new THREE.Vector3(1, 0, 0);

  for (let index = 0; index < 16; index += 1) {
    const next = new THREE.Vector3(
      covariance[0][0] * axis.x +
        covariance[0][1] * axis.y +
        covariance[0][2] * axis.z,
      covariance[1][0] * axis.x +
        covariance[1][1] * axis.y +
        covariance[1][2] * axis.z,
      covariance[2][0] * axis.x +
        covariance[2][1] * axis.y +
        covariance[2][2] * axis.z
    );
    const orthogonal = next.sub(
      forwardAxis.clone().multiplyScalar(next.dot(forwardAxis))
    );

    if (orthogonal.lengthSq() === 0) {
      break;
    }

    axis = orthogonal.normalize();
  }

  if (axis.lengthSq() === 0) {
    axis = new THREE.Vector3(1, 0, 0);
  }

  return axis;
}
