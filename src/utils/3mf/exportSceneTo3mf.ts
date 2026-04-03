import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import * as THREE from 'three';

import getFaceColor from '../threejs/getFaceColor';

type ExportableMesh = {
  colors: string[];
  name: string;
  triangles: [number, number, number][];
  vertices: THREE.Vector3[];
};

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const MATERIAL_NS =
  'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';
const OVERLAY_EXPORT_THICKNESS = 0.5;
const POSITION_PRECISION = 1e-6;
const ZIP_STORE_OPTIONS = {
  level: 0,
} as const;

export default async function exportSceneTo3mf(
  object: THREE.Object3D,
  title: string
) {
  const zipFileWriter = new BlobWriter();
  const zipWriter = new ZipWriter(zipFileWriter);

  const meshes = collectMeshes(object);
  const modelXml = buildModelXml(meshes, title);

  await zipWriter.add(
    '[Content_Types].xml',
    new TextReader(createContentTypesXml()),
    ZIP_STORE_OPTIONS
  );
  await zipWriter.add(
    '_rels/.rels',
    new TextReader(createRelationshipsXml()),
    ZIP_STORE_OPTIONS
  );
  await zipWriter.add(
    '3D/3dmodel.model',
    new TextReader(modelXml),
    ZIP_STORE_OPTIONS
  );
  await zipWriter.close();

  return zipFileWriter.getData();
}

function collectMeshes(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const rootInverseMatrix = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const exportableMeshes: ExportableMesh[] = [];

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh || !mesh.visible) {
      return;
    }

    const position = mesh.geometry?.getAttribute?.('position');

    if (!position || position.count === 0) {
      return;
    }

    const geometry = mesh.userData.isOverlay
      ? buildSolidOverlayGeometry(mesh.geometry, OVERLAY_EXPORT_THICKNESS)
      : mesh.geometry.clone();
    const relativeMatrix = new THREE.Matrix4()
      .copy(rootInverseMatrix)
      .multiply(mesh.matrixWorld);

    geometry.applyMatrix4(relativeMatrix);
    const { colors, triangles, vertices } = buildIndexedMeshData(
      geometry,
      getFaceColors(geometry, mesh.material)
    );

    if (triangles.length === 0 || vertices.length === 0) {
      return;
    }

    exportableMeshes.push({
      colors,
      name: mesh.name || (mesh.userData.isOverlay ? 'Overlay' : 'Mesh'),
      triangles,
      vertices,
    });
  });

  return exportableMeshes;
}

function getFaceColors(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[]
) {
  const colors: string[] = [];
  const materialColor = getMaterialColor(material);
  const texture = getMaterialTexture(material);
  const index = geometry.getIndex();
  const faceCount = index
    ? index.count / 3
    : geometry.getAttribute('position').count / 3;
  const face = { a: 0, b: 0, c: 0 } as THREE.Face;
  const textureSampler = texture ? getTextureSampler(texture) : null;
  const uvAttribute = geometry.getAttribute('uv');

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    if (index) {
      face.a = index.getX(faceIndex * 3);
      face.b = index.getX(faceIndex * 3 + 1);
      face.c = index.getX(faceIndex * 3 + 2);
    } else {
      face.a = faceIndex * 3;
      face.b = face.a + 1;
      face.c = face.a + 2;
    }

    if (geometry.getAttribute('color')) {
      colors.push(getFaceColor({ geometry } as THREE.Mesh, face).toUpperCase());
      continue;
    }

    if (textureSampler && uvAttribute) {
      const u =
        (uvAttribute.getX(face.a) +
          uvAttribute.getX(face.b) +
          uvAttribute.getX(face.c)) /
        3;
      const v =
        (uvAttribute.getY(face.a) +
          uvAttribute.getY(face.b) +
          uvAttribute.getY(face.c)) /
        3;

      colors.push(textureSampler(u, v));
      continue;
    }

    colors.push(materialColor);
  }

  return colors;
}

function buildModelXml(meshes: ExportableMesh[], title: string) {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}" xmlns:m="${MATERIAL_NS}">`,
    ` <metadata name="Title">${escapeXml(title)}</metadata>`,
    ' <metadata name="Application">3MF Color Changer</metadata>',
    ' <resources>',
  ];

  let nextId = 1;
  const buildItems: string[] = [];

  meshes.forEach((mesh, meshIndex) => {
    const objectId = nextId++;
    const colorGroupId = nextId++;
    const uniqueColors = Array.from(new Set(mesh.colors));
    const colorIndexLookup = new Map(
      uniqueColors.map((color, idx) => [color, idx] as const)
    );

    lines.push(`  <m:colorgroup id="${colorGroupId}">`);
    uniqueColors.forEach((color) => {
      lines.push(`   <m:color color="${color}"/>`);
    });
    lines.push('  </m:colorgroup>');

    lines.push(
      `  <object id="${objectId}" type="model" pid="${colorGroupId}" pindex="0" name="${escapeXml(
        getObjectName(mesh.name, meshIndex)
      )}">`
    );
    lines.push('   <mesh>');
    lines.push('    <vertices>');

    for (let i = 0; i < mesh.vertices.length; i += 1) {
      const vertex = mesh.vertices[i];
      lines.push(
        `     <vertex x="${formatNumber(vertex.x)}" y="${formatNumber(
          vertex.y
        )}" z="${formatNumber(vertex.z)}"/>`
      );
    }

    lines.push('    </vertices>');
    lines.push('    <triangles>');

    for (let triangleIndex = 0; triangleIndex < mesh.triangles.length; triangleIndex += 1) {
      const [v1, v2, v3] = mesh.triangles[triangleIndex];
      lines.push(
        `     <triangle v1="${v1}" v2="${v2}" v3="${v3}" pid="${colorGroupId}" p1="${
          colorIndexLookup.get(mesh.colors[triangleIndex]) || 0
        }"/>`
      );
    }

    lines.push('    </triangles>');
    lines.push('   </mesh>');
    lines.push('  </object>');
    buildItems.push(`  <item objectid="${objectId}"/>`);
  });

  lines.push(' </resources>');
  lines.push(' <build>');
  lines.push(...buildItems);
  lines.push(' </build>');
  lines.push('</model>');

  return lines.join('\n');
}

function createContentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
 <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
 <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;
}

function createRelationshipsXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
 <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;
}

function getMaterialColor(material: THREE.Material | THREE.Material[]) {
  const resolvedMaterial = Array.isArray(material) ? material[0] : material;
  const color = (resolvedMaterial as THREE.MeshStandardMaterial)?.color;

  if (!color) {
    return '#FFFFFF';
  }

  return `#${color.getHexString()}`.toUpperCase();
}

function getMaterialTexture(material: THREE.Material | THREE.Material[]) {
  const resolvedMaterial = Array.isArray(material) ? material[0] : material;
  return (resolvedMaterial as THREE.MeshStandardMaterial)?.map || null;
}

function getTextureSampler(texture: THREE.Texture) {
  const image = texture.image as CanvasImageSource & {
    height: number;
    width: number;
  };

  if (!image?.width || !image?.height) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;

  return (u: number, v: number) => {
    const wrappedU = THREE.MathUtils.euclideanModulo(u, 1);
    const wrappedV = THREE.MathUtils.euclideanModulo(v, 1);
    const x = Math.min(canvas.width - 1, Math.max(0, Math.round(wrappedU * (canvas.width - 1))));
    const y = Math.min(
      canvas.height - 1,
      Math.max(0, Math.round((1 - wrappedV) * (canvas.height - 1)))
    );
    const idx = (y * canvas.width + x) * 4;
    const color = new THREE.Color(
      data[idx] / 255,
      data[idx + 1] / 255,
      data[idx + 2] / 255
    );

    return `#${color.getHexString()}`.toUpperCase();
  };
}

function buildIndexedMeshData(geometry: THREE.BufferGeometry, faceColors: string[]) {
  const positions = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const faceCount = index ? index.count / 3 : positions.count / 3;
  const vertices: THREE.Vector3[] = [];
  const triangles: [number, number, number][] = [];
  const colors: string[] = [];
  const vertexIndexLookup = new Map<string, number>();

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    const sourceIndices = index
      ? [
          index.getX(faceIndex * 3),
          index.getX(faceIndex * 3 + 1),
          index.getX(faceIndex * 3 + 2),
        ]
      : [faceIndex * 3, faceIndex * 3 + 1, faceIndex * 3 + 2];

    const triangleVertices = sourceIndices.map((sourceIndex) =>
      new THREE.Vector3().fromBufferAttribute(positions, sourceIndex)
    );

    if (isDegenerateTriangle(triangleVertices[0], triangleVertices[1], triangleVertices[2])) {
      continue;
    }

    const triangle = sourceIndices.map((sourceIndex) => {
      const vertex = new THREE.Vector3().fromBufferAttribute(positions, sourceIndex);
      const key = getVertexKey(vertex);
      const existingIndex = vertexIndexLookup.get(key);

      if (existingIndex !== undefined) {
        return existingIndex;
      }

      const nextIndex = vertices.length;
      vertices.push(vertex);
      vertexIndexLookup.set(key, nextIndex);
      return nextIndex;
    }) as [number, number, number];

    triangles.push(triangle);
    colors.push(faceColors[faceIndex] || '#FFFFFF');
  }

  return { colors, triangles, vertices };
}

function buildSolidOverlayGeometry(
  geometry: THREE.BufferGeometry,
  thickness: number
) {
  const source = geometry.clone();
  source.computeVertexNormals();
  const positions = source.getAttribute('position');
  const normals = source.getAttribute('normal');
  const uvs = source.getAttribute('uv');
  const colorAttribute = source.getAttribute('color');
  const vertexCount = positions.count;
  const depth = Math.max(thickness, 0.01);
  const outputPositions = new Float32Array(vertexCount * 2 * 3);
  const outputUvs = uvs ? new Float32Array(vertexCount * 2 * 2) : null;
  const outputColors = colorAttribute
    ? new Float32Array(vertexCount * 2 * 3)
    : null;
  const sourceIndex =
    source.getIndex() ||
    new THREE.BufferAttribute(
      Uint32Array.from({ length: vertexCount }, (_, index) => index),
      1
    );
  const outputIndices: number[] = [];
  const edges = new Map<string, BoundaryEdge>();

  for (let vertexIndex = 0; vertexIndex < vertexCount; vertexIndex += 1) {
    const position = new THREE.Vector3().fromBufferAttribute(positions, vertexIndex);
    const normal = new THREE.Vector3()
      .fromBufferAttribute(normals, vertexIndex)
      .normalize();
    const backPosition = position.clone().add(normal.multiplyScalar(-depth));
    const frontOffset = vertexIndex * 3;
    const backOffset = (vertexIndex + vertexCount) * 3;

    outputPositions[frontOffset] = position.x;
    outputPositions[frontOffset + 1] = position.y;
    outputPositions[frontOffset + 2] = position.z;
    outputPositions[backOffset] = backPosition.x;
    outputPositions[backOffset + 1] = backPosition.y;
    outputPositions[backOffset + 2] = backPosition.z;

    if (outputUvs) {
      const frontUvOffset = vertexIndex * 2;
      const backUvOffset = (vertexIndex + vertexCount) * 2;
      const u = uvs.getX(vertexIndex);
      const v = uvs.getY(vertexIndex);

      outputUvs[frontUvOffset] = u;
      outputUvs[frontUvOffset + 1] = v;
      outputUvs[backUvOffset] = u;
      outputUvs[backUvOffset + 1] = v;
    }

    if (outputColors) {
      const frontColorOffset = vertexIndex * 3;
      const backColorOffset = (vertexIndex + vertexCount) * 3;
      const color = getVertexColorTuple(colorAttribute, vertexIndex);

      outputColors[frontColorOffset] = color[0];
      outputColors[frontColorOffset + 1] = color[1];
      outputColors[frontColorOffset + 2] = color[2];
      outputColors[backColorOffset] = color[0];
      outputColors[backColorOffset + 1] = color[1];
      outputColors[backColorOffset + 2] = color[2];
    }
  }

  for (let triangleIndex = 0; triangleIndex < sourceIndex.count; triangleIndex += 3) {
    const a = sourceIndex.getX(triangleIndex);
    const b = sourceIndex.getX(triangleIndex + 1);
    const c = sourceIndex.getX(triangleIndex + 2);

    outputIndices.push(a, b, c);
    outputIndices.push(a + vertexCount, c + vertexCount, b + vertexCount);

    registerBoundaryEdge(edges, a, b);
    registerBoundaryEdge(edges, b, c);
    registerBoundaryEdge(edges, c, a);
  }

  edges.forEach((edge) => {
    if (edge.count !== 1) {
      return;
    }

    outputIndices.push(
      edge.start,
      edge.end + vertexCount,
      edge.end,
      edge.start,
      edge.start + vertexCount,
      edge.end + vertexCount
    );
  });

  const solidGeometry = new THREE.BufferGeometry();
  solidGeometry.setAttribute('position', new THREE.BufferAttribute(outputPositions, 3));

  if (outputUvs) {
    solidGeometry.setAttribute('uv', new THREE.BufferAttribute(outputUvs, 2));
  }

  if (outputColors) {
    solidGeometry.setAttribute('color', new THREE.BufferAttribute(outputColors, 3));
  }

  solidGeometry.setIndex(outputIndices);
  solidGeometry.computeVertexNormals();

  return solidGeometry;
}

function registerBoundaryEdge(
  edges: Map<string, BoundaryEdge>,
  start: number,
  end: number
) {
  const key = start < end ? `${start}|${end}` : `${end}|${start}`;
  const existing = edges.get(key);

  if (existing) {
    existing.count += 1;
    return;
  }

  edges.set(key, {
    count: 1,
    end,
    start,
  });
}

function getVertexColorTuple(
  colorAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined,
  index: number
): ColorTuple {
  if (!colorAttribute) {
    return [1, 1, 1];
  }

  return [
    colorAttribute.getX(index),
    colorAttribute.getY(index),
    colorAttribute.getZ(index),
  ];
}

function isDegenerateTriangle(v1: THREE.Vector3, v2: THREE.Vector3, v3: THREE.Vector3) {
  return (
    new THREE.Vector3()
      .subVectors(v2, v1)
      .cross(new THREE.Vector3().subVectors(v3, v1))
      .lengthSq() < POSITION_PRECISION
  );
}

function getVertexKey(vertex: THREE.Vector3) {
  return [
    roundToPrecision(vertex.x),
    roundToPrecision(vertex.y),
    roundToPrecision(vertex.z),
  ].join(':');
}

function roundToPrecision(value: number) {
  return Math.round(value / POSITION_PRECISION) * POSITION_PRECISION;
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}

function getObjectName(name: string, index: number) {
  const trimmedName = name.trim();
  return trimmedName || `Mesh ${index + 1}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

type BoundaryEdge = {
  count: number;
  end: number;
  start: number;
};

type ColorTuple = [number, number, number];
