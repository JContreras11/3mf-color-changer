import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import * as THREE from 'three';

import getFaceColor from '../threejs/getFaceColor';

type ExportableMesh = {
  colors: string[];
  geometry: THREE.BufferGeometry;
  name: string;
};

const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const MATERIAL_NS =
  'http://schemas.microsoft.com/3dmanufacturing/material/2015/02';

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
    new TextReader(createContentTypesXml())
  );
  await zipWriter.add('_rels/.rels', new TextReader(createRelationshipsXml()));
  await zipWriter.add('3D/3dmodel.model', new TextReader(modelXml));
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

    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    const relativeMatrix = new THREE.Matrix4()
      .copy(rootInverseMatrix)
      .multiply(mesh.matrixWorld);

    geometry.applyMatrix4(relativeMatrix);

    exportableMeshes.push({
      colors: getFaceColors(geometry, mesh.material),
      geometry,
      name: mesh.name || (mesh.userData.isOverlay ? 'Overlay' : 'Mesh'),
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
  const faceCount = geometry.getAttribute('position').count / 3;
  const face = { a: 0, b: 0, c: 0 } as THREE.Face;
  const textureSampler = texture ? getTextureSampler(texture) : null;
  const uvAttribute = geometry.getAttribute('uv');

  for (let faceIndex = 0; faceIndex < faceCount; faceIndex += 1) {
    face.a = faceIndex * 3;
    face.b = face.a + 1;
    face.c = face.a + 2;

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

    const positions = mesh.geometry.getAttribute('position');

    for (let i = 0; i < positions.count; i += 1) {
      lines.push(
        `     <vertex x="${formatNumber(positions.getX(i))}" y="${formatNumber(
          positions.getY(i)
        )}" z="${formatNumber(positions.getZ(i))}"/>`
      );
    }

    lines.push('    </vertices>');
    lines.push('    <triangles>');

    for (let triangleIndex = 0; triangleIndex < mesh.colors.length; triangleIndex += 1) {
      lines.push(
        `     <triangle v1="${triangleIndex * 3}" v2="${
          triangleIndex * 3 + 1
        }" v3="${triangleIndex * 3 + 2}" pid="${colorGroupId}" p1="${
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
