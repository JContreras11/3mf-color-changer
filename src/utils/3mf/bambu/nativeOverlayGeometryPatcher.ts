import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import * as THREE from 'three';

import {
  type BambuProjectConfig,
  MAX_BAMBU_FILAMENT_SLOTS,
  appendFilamentColorsToProjectConfig,
  buildColorSlotMap,
  getFilamentColors,
  normalizeHexColor,
} from './filamentSlots';
import type {
  BambuNativeOverlayExportReport,
  BambuNativeOverlayGeometryPart,
  BambuNativeOverlayPatch,
} from './nativeOverlayTypes';

const PROJECT_SETTINGS_ENTRY = 'metadata/project_settings.config';
const MODEL_SETTINGS_ENTRY = 'metadata/model_settings.config';
const ROOT_MODEL_ENTRY = '3d/3dmodel.model';
const ROOT_MODEL_RELS_ENTRY = '3d/_rels/3dmodel.model.rels';
const CORE_NS = 'http://schemas.microsoft.com/3dmanufacturing/core/2015/02';
const PRODUCTION_NS =
  'http://schemas.microsoft.com/3dmanufacturing/production/2015/06';
const MODEL_RELATIONSHIP_TYPE =
  'http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel';
const RELATIONSHIPS_NS =
  'http://schemas.openxmlformats.org/package/2006/relationships';
const IDENTITY_4X4_MATRIX = '1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1';
const ZIP_STORE_OPTIONS = {
  level: 0,
} as const;

export type BambuNativeOverlayGeometryPatchResult = {
  blob: Blob;
  report: BambuNativeOverlayExportReport;
};

type GeometryOverlayPatch = BambuNativeOverlayPatch & {
  geometryParts: BambuNativeOverlayGeometryPart[];
};

type OverlayInjectionPart = BambuNativeOverlayGeometryPart & {
  id: number;
  name: string;
  slot: number;
  uuid: string;
};

type OverlayInjection = {
  assemblyId: number | null;
  entryName: string;
  modelXml: string;
  overlayId: string;
  overlayName: string;
  parts: OverlayInjectionPart[];
  target: {
    modelPath: string;
    objectId: string;
  };
  transformedIntoAssembly: boolean;
  uuid: string;
};

type ReadableZipEntry = {
  filename: string;
  getData: <T>(writer: T) => Promise<unknown>;
};

export async function patchBambu3mfWithNativeOverlayGeometry(
  sourceBlob: Blob,
  patches: readonly BambuNativeOverlayPatch[]
): Promise<BambuNativeOverlayGeometryPatchResult> {
  const geometryPatches = normalizeGeometryPatches(patches);

  if (geometryPatches.length === 0) {
    throw new Error('No high-quality overlay geometry was found for export.');
  }

  const zipReader = new ZipReader(new BlobReader(sourceBlob));
  const outputWriter = new BlobWriter('model/3mf');
  const zipWriter = new ZipWriter(outputWriter);
  const warnings: string[] = [];

  try {
    const entries = await zipReader.getEntries();
    const projectSettingsEntry = findEntry(entries, PROJECT_SETTINGS_ENTRY);
    const rootModelEntry = findEntry(entries, ROOT_MODEL_ENTRY);
    const modelSettingsEntry = findEntry(entries, MODEL_SETTINGS_ENTRY);
    const rootRelsEntry = findEntry(entries, ROOT_MODEL_RELS_ENTRY);

    if (!projectSettingsEntry) {
      throw new Error(
        'This 3MF does not include Bambu project settings, so overlay filament slots cannot be appended safely.'
      );
    }

    if (!rootModelEntry) {
      throw new Error(
        'This 3MF does not include a root 3D/3dmodel.model file.'
      );
    }

    if (!modelSettingsEntry) {
      throw new Error(
        'This 3MF does not include Bambu model_settings.config, so overlay parts cannot be assigned to filament slots safely.'
      );
    }

    const projectConfig = JSON.parse(
      (await projectSettingsEntry.getData(new TextWriter())) as string
    ) as BambuProjectConfig;
    const constrainedPatches = constrainGeometryPatchesToNativeSlotLimit(
      geometryPatches,
      projectConfig,
      warnings
    );
    const overlayColors = constrainedPatches.flatMap((patch) =>
      patch.geometryParts.map((part) => part.color)
    );
    const slotResult = appendFilamentColorsToProjectConfig(
      projectConfig,
      overlayColors
    );
    const slotByColor = buildColorSlotMap(
      slotResult.assignments,
      projectConfig
    );
    const injections = constrainedPatches
      .map((patch, index) => buildOverlayInjection(patch, index, slotByColor))
      .filter((injection) => injection.parts.length > 0);

    if (injections.length === 0) {
      throw new Error(
        'Overlay colors could not be mapped to valid Bambu filament slots.'
      );
    }

    const rootModelXml = (await rootModelEntry.getData(
      new TextWriter()
    )) as string;
    const patchedRootModelXml = patchRootModelXml(rootModelXml, injections);
    const modelSettingsXml = (await modelSettingsEntry.getData(
      new TextWriter()
    )) as string;
    const patchedModelSettingsXml = patchModelSettingsXml(
      modelSettingsXml,
      injections
    );
    const patchedRootRelsXml = rootRelsEntry
      ? patchRootModelRelationshipsXml(
          (await rootRelsEntry.getData(new TextWriter())) as string,
          injections
        )
      : createRootModelRelationshipsXml(injections);
    const wroteEntries = new Set<string>();

    for (const entry of entries) {
      if (!('getData' in entry) || typeof entry.getData !== 'function') {
        continue;
      }

      const normalizedName = normalizeEntryName(entry.filename);
      wroteEntries.add(normalizedName);

      if (normalizedName === PROJECT_SETTINGS_ENTRY) {
        await zipWriter.add(
          entry.filename,
          new TextReader(JSON.stringify(projectConfig, null, 4)),
          ZIP_STORE_OPTIONS
        );
        continue;
      }

      if (normalizedName === ROOT_MODEL_ENTRY) {
        await zipWriter.add(
          entry.filename,
          new TextReader(patchedRootModelXml),
          ZIP_STORE_OPTIONS
        );
        continue;
      }

      if (normalizedName === MODEL_SETTINGS_ENTRY) {
        await zipWriter.add(
          entry.filename,
          new TextReader(patchedModelSettingsXml),
          ZIP_STORE_OPTIONS
        );
        continue;
      }

      if (normalizedName === ROOT_MODEL_RELS_ENTRY) {
        await zipWriter.add(
          entry.filename,
          new TextReader(patchedRootRelsXml),
          ZIP_STORE_OPTIONS
        );
        continue;
      }

      const data = await entry.getData(new BlobWriter());
      await zipWriter.add(
        entry.filename,
        new BlobReader(data),
        ZIP_STORE_OPTIONS
      );
    }

    if (!wroteEntries.has(ROOT_MODEL_RELS_ENTRY)) {
      await zipWriter.add(
        '3D/_rels/3dmodel.model.rels',
        new TextReader(patchedRootRelsXml),
        ZIP_STORE_OPTIONS
      );
    }

    for (const injection of injections) {
      await zipWriter.add(
        injection.entryName,
        new TextReader(injection.modelXml),
        ZIP_STORE_OPTIONS
      );
    }

    await zipWriter.close();

    return {
      blob: await outputWriter.getData(),
      report: {
        appendedColors: slotResult.appendedColors,
        colorSlots: slotResult.assignments,
        finalColorCount: slotResult.finalColorCount,
        geometryTriangles: countInjectionTriangles(injections),
        injectedObjects: injections.length,
        injectedParts: injections.reduce(
          (total, injection) => total + injection.parts.length,
          0
        ),
        warnings,
      },
    };
  } finally {
    await zipReader.close();
  }
}

function normalizeGeometryPatches(
  patches: readonly BambuNativeOverlayPatch[]
): GeometryOverlayPatch[] {
  return patches
    .map((patch) => {
      const geometryParts = (patch.geometryParts || [])
        .map((part) => ({
          ...part,
          color: normalizeHexColor(part.color) || part.color,
        }))
        .filter(
          (part) =>
            !!normalizeHexColor(part.color) &&
            part.vertices.length > 0 &&
            part.triangles.length > 0
        );

      return {
        ...patch,
        geometryParts,
        palette: uniquePatchPalette(geometryParts.map((part) => part.color)),
      };
    })
    .filter(
      (patch): patch is GeometryOverlayPatch => patch.geometryParts.length > 0
    );
}

function constrainGeometryPatchesToNativeSlotLimit(
  patches: readonly GeometryOverlayPatch[],
  projectConfig: BambuProjectConfig,
  warnings: string[]
): GeometryOverlayPatch[] {
  const existingColors = getFilamentColors(projectConfig);
  const usableExistingColors = existingColors.slice(
    0,
    MAX_BAMBU_FILAMENT_SLOTS
  );
  const availableNewSlots = Math.max(
    0,
    MAX_BAMBU_FILAMENT_SLOTS - existingColors.length
  );
  const usageByNewColor = new Map<string, number>();
  const existingColorSet = new Set(usableExistingColors);

  for (const patch of patches) {
    for (const part of patch.geometryParts) {
      const color = normalizeHexColor(part.color);

      if (!color || existingColorSet.has(color)) {
        continue;
      }

      usageByNewColor.set(
        color,
        (usageByNewColor.get(color) || 0) + part.triangles.length
      );
    }
  }

  const newColorsByUsage = Array.from(usageByNewColor.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([color]) => color);

  if (newColorsByUsage.length <= availableNewSlots) {
    return patches.map((patch) => mergePatchGeometryPartsByColor(patch));
  }

  const keptNewColors = new Set(newColorsByUsage.slice(0, availableNewSlots));
  const exportSafePalette = [...usableExistingColors, ...keptNewColors];

  if (exportSafePalette.length === 0) {
    warnings.push(
      'Overlay geometry could not be mapped because no Bambu filament slots are available.'
    );
    return patches.map((patch) => ({
      ...patch,
      geometryParts: [],
      palette: [],
    }));
  }

  warnings.push(
    `Overlay geometry colors were reduced automatically: ${newColorsByUsage.length} new colors were detected, but only ${availableNewSlots} Bambu filament slot${availableNewSlots === 1 ? '' : 's'} are available after the existing ${existingColors.length} filament color${existingColors.length === 1 ? '' : 's'}.`
  );

  return patches.map((patch) =>
    mergePatchGeometryPartsByColor({
      ...patch,
      geometryParts: patch.geometryParts.map((part) => {
        const color = normalizeHexColor(part.color);

        if (!color) {
          return part;
        }

        if (existingColorSet.has(color) || keptNewColors.has(color)) {
          return {
            ...part,
            color,
          };
        }

        return {
          ...part,
          color: findClosestHexColor(color, exportSafePalette),
        };
      }),
    })
  );
}

function mergePatchGeometryPartsByColor(
  patch: GeometryOverlayPatch
): GeometryOverlayPatch {
  const partsByColor = new Map<string, BambuNativeOverlayGeometryPart>();

  for (const part of patch.geometryParts) {
    const color = normalizeHexColor(part.color);

    if (!color) {
      continue;
    }

    const existingPart = partsByColor.get(color);

    if (!existingPart) {
      partsByColor.set(color, {
        ...part,
        color,
        triangles: [...part.triangles],
        vertices: [...part.vertices],
      });
      continue;
    }

    const vertexOffset = existingPart.vertices.length;
    existingPart.vertices.push(...part.vertices);
    existingPart.triangles.push(
      ...part.triangles.map(
        ([a, b, c]) =>
          [a + vertexOffset, b + vertexOffset, c + vertexOffset] as [
            number,
            number,
            number,
          ]
      )
    );
  }

  const geometryParts = Array.from(partsByColor.values()).sort((a, b) =>
    a.color.localeCompare(b.color)
  );

  return {
    ...patch,
    geometryParts,
    palette: uniquePatchPalette(geometryParts.map((part) => part.color)),
  };
}

function buildOverlayInjection(
  patch: GeometryOverlayPatch,
  patchIndex: number,
  slotByColor: Map<string, number>
): OverlayInjection {
  const overlayName = getOverlayName(patch, patchIndex);
  const overlaySlug = getSafeOverlaySlug(patch.overlayId, patchIndex);
  const parts = patch.geometryParts
    .map((part, index) => {
      const normalizedColor = normalizeHexColor(part.color) || part.color;
      const slot = slotByColor.get(normalizedColor);

      if (!slot || slot < 1 || slot > MAX_BAMBU_FILAMENT_SLOTS) {
        return null;
      }

      return {
        ...part,
        color: normalizedColor,
        id: index + 1,
        name: `${overlayName} ${normalizedColor}`,
        slot,
        uuid: makeUuid(),
      } satisfies OverlayInjectionPart;
    })
    .filter((part): part is OverlayInjectionPart => !!part);
  const injection: OverlayInjection = {
    assemblyId: null,
    entryName: `3D/Objects/make_your_caps_overlay_${overlaySlug}.model`,
    modelXml: '',
    overlayId: patch.overlayId,
    overlayName,
    parts,
    target: {
      modelPath: patch.target.modelPath,
      objectId: patch.target.objectId,
    },
    transformedIntoAssembly: false,
    uuid: makeUuid(),
  };

  return injection;
}

function patchRootModelXml(
  modelXml: string,
  injections: OverlayInjection[]
): string {
  const doc = parseXml(modelXml, 'Could not parse root 3MF model XML.');
  const build = doc.getElementsByTagName('build')[0];

  if (!build) {
    throw new Error('The root 3MF model is missing a build node.');
  }

  for (const injection of injections) {
    const targetAssembly = findRootAssemblyForOverlayTarget(doc, injection);

    if (!targetAssembly) {
      throw new Error(
        `Could not find the Bambu assembly that contains ${injection.target.modelPath} object ${injection.target.objectId}. Remove the graphic and place it on the cap again.`
      );
    }

    injection.assemblyId = targetAssembly.assemblyId;
    transformInjectionIntoAssemblySpace(injection, targetAssembly.buildMatrix);

    let nextPartId = getNextAvailableObjectReferenceId(doc);

    for (const part of injection.parts) {
      part.id = nextPartId;
      nextPartId += 1;

      const componentNode = doc.createElementNS(CORE_NS, 'component');
      componentNode.setAttributeNS(
        PRODUCTION_NS,
        'p:path',
        `/${injection.entryName}`
      );
      componentNode.setAttribute('objectid', String(part.id));
      componentNode.setAttributeNS(PRODUCTION_NS, 'p:UUID', makeUuid());
      targetAssembly.componentsNode.appendChild(componentNode);
    }

    injection.modelXml = buildOverlayModelXml(injection);
  }

  return serializeXml(doc);
}

function findRootAssemblyForOverlayTarget(
  doc: Document,
  injection: OverlayInjection
): {
  assemblyId: number;
  buildMatrix: THREE.Matrix4;
  componentsNode: Element;
} | null {
  const targetModelPath = normalizeEntryName(injection.target.modelPath);
  const targetObjectId = injection.target.objectId;
  const objects = Array.from(doc.getElementsByTagName('object'));

  for (const objectNode of objects) {
    const componentsNode = getFirstDirectChild(objectNode, 'components');

    if (!componentsNode) {
      continue;
    }

    const matchingComponent = Array.from(
      componentsNode.getElementsByTagName('component')
    ).find((componentNode) => {
      const componentPath = getModelReferencePath(componentNode);

      return (
        normalizeEntryName(componentPath || '') === targetModelPath &&
        componentNode.getAttribute('objectid') === targetObjectId
      );
    });

    if (!matchingComponent) {
      continue;
    }

    const assemblyId = Number.parseInt(objectNode.getAttribute('id') || '', 10);

    if (!Number.isFinite(assemblyId)) {
      continue;
    }

    return {
      assemblyId,
      buildMatrix: getBuildMatrixForObject(doc, String(assemblyId)),
      componentsNode,
    };
  }

  return null;
}

function transformInjectionIntoAssemblySpace(
  injection: OverlayInjection,
  buildMatrix: THREE.Matrix4
) {
  if (injection.transformedIntoAssembly) {
    return;
  }

  const inverseBuildMatrix = buildMatrix.clone().invert();
  const vertex = new THREE.Vector3();

  for (const part of injection.parts) {
    part.vertices = part.vertices.map(([x, y, z]) => {
      vertex.set(x, y, z).applyMatrix4(inverseBuildMatrix);

      return [
        roundGeometryCoordinate(vertex.x),
        roundGeometryCoordinate(vertex.y),
        roundGeometryCoordinate(vertex.z),
      ];
    });
  }

  injection.transformedIntoAssembly = true;
}

function getBuildMatrixForObject(doc: Document, objectId: string) {
  const build = doc.getElementsByTagName('build')[0];

  if (!build) {
    return new THREE.Matrix4();
  }

  for (const itemNode of Array.from(build.getElementsByTagName('item'))) {
    if (itemNode.getAttribute('objectid') !== objectId) {
      continue;
    }

    return parse3mfTransform(itemNode.getAttribute('transform'));
  }

  return new THREE.Matrix4();
}

function parse3mfTransform(transform: string | null) {
  const matrix = new THREE.Matrix4();

  if (!transform) {
    return matrix.identity();
  }

  const values = transform
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));

  if (values.length !== 12 || values.some((value) => !Number.isFinite(value))) {
    return matrix.identity();
  }

  matrix.set(
    values[0],
    values[3],
    values[6],
    values[9],
    values[1],
    values[4],
    values[7],
    values[10],
    values[2],
    values[5],
    values[8],
    values[11],
    0,
    0,
    0,
    1
  );

  return matrix;
}

function getModelReferencePath(node: Element) {
  for (const attr of Array.from(node.attributes)) {
    if (attr.name === 'path' || attr.name.endsWith(':path')) {
      return attr.value;
    }
  }

  return null;
}

function getNextAvailableObjectReferenceId(doc: Document) {
  let nextId = 1;

  for (const objectNode of Array.from(doc.getElementsByTagName('object'))) {
    const id = Number.parseInt(objectNode.getAttribute('id') || '', 10);

    if (Number.isFinite(id)) {
      nextId = Math.max(nextId, id + 1);
    }
  }

  for (const componentNode of Array.from(
    doc.getElementsByTagName('component')
  )) {
    const id = Number.parseInt(
      componentNode.getAttribute('objectid') || '',
      10
    );

    if (Number.isFinite(id)) {
      nextId = Math.max(nextId, id + 1);
    }
  }

  return nextId;
}

function patchRootModelRelationshipsXml(
  relsXml: string,
  injections: readonly OverlayInjection[]
): string {
  const doc = parseXml(
    relsXml,
    'Could not parse 3D/_rels/3dmodel.model.rels XML.'
  );
  const root = doc.documentElement;
  let nextRelIndex = getNextRelationshipIndex(root);

  for (const injection of injections) {
    if (relationshipExists(root, `/${injection.entryName}`)) {
      continue;
    }

    const relationship = doc.createElementNS(RELATIONSHIPS_NS, 'Relationship');
    relationship.setAttribute('Target', `/${injection.entryName}`);
    relationship.setAttribute('Id', `rel-overlay-${nextRelIndex}`);
    relationship.setAttribute('Type', MODEL_RELATIONSHIP_TYPE);
    root.appendChild(relationship);
    nextRelIndex += 1;
  }

  return serializeXml(doc);
}

function createRootModelRelationshipsXml(
  injections: readonly OverlayInjection[]
): string {
  const doc = document.implementation.createDocument(
    RELATIONSHIPS_NS,
    'Relationships'
  );
  const root = doc.documentElement;

  let index = 1;
  for (const injection of injections) {
    const relationship = doc.createElementNS(RELATIONSHIPS_NS, 'Relationship');
    relationship.setAttribute('Target', `/${injection.entryName}`);
    relationship.setAttribute('Id', `rel-overlay-${index}`);
    relationship.setAttribute('Type', MODEL_RELATIONSHIP_TYPE);
    root.appendChild(relationship);
    index += 1;
  }

  return serializeXml(doc);
}

function patchModelSettingsXml(
  modelSettingsXml: string,
  injections: readonly OverlayInjection[]
): string {
  const doc = parseXml(
    modelSettingsXml,
    'Could not parse Bambu model_settings.config XML.'
  );
  const config = doc.getElementsByTagName('config')[0];

  if (!config) {
    throw new Error('Bambu model_settings.config is missing a config node.');
  }

  for (const injection of injections) {
    if (!injection.assemblyId) {
      throw new Error('Overlay assembly id was not assigned.');
    }

    const objectNode =
      findDirectConfigObject(config, String(injection.assemblyId)) ||
      createConfigObject(doc, config, String(injection.assemblyId));

    for (const part of injection.parts) {
      const partNode = doc.createElement('part');
      partNode.setAttribute('id', String(part.id));
      partNode.setAttribute('subtype', 'normal_part');
      appendConfigMetadata(doc, partNode, 'name', part.name);
      appendConfigMetadata(doc, partNode, 'matrix', IDENTITY_4X4_MATRIX);
      appendConfigMetadata(
        doc,
        partNode,
        'source_file',
        'MakeYourCaps overlay'
      );
      appendConfigMetadata(doc, partNode, 'source_object_id', String(part.id));
      appendConfigMetadata(doc, partNode, 'source_volume_id', String(part.id));
      appendConfigMetadata(doc, partNode, 'source_offset_x', '0');
      appendConfigMetadata(doc, partNode, 'source_offset_y', '0');
      appendConfigMetadata(doc, partNode, 'source_offset_z', '0');
      appendConfigMetadata(doc, partNode, 'extruder', String(part.slot));
      appendMeshStat(doc, partNode, part.triangles.length);
      objectNode.appendChild(partNode);
    }
  }

  return serializeXml(doc);
}

function buildOverlayModelXml(injection: OverlayInjection): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<model unit="millimeter" xml:lang="en-US" xmlns="${CORE_NS}" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="${PRODUCTION_NS}" requiredextensions="p">`,
    ' <metadata name="BambuStudio:3mfVersion">1</metadata>',
    ' <resources>',
  ];

  for (const part of injection.parts) {
    lines.push(
      `  <object id="${part.id}" p:UUID="${part.uuid}" type="model" name="${escapeXml(part.name)}">`
    );
    lines.push('   <mesh>');
    lines.push('    <vertices>');

    for (const [x, y, z] of part.vertices) {
      lines.push(
        `     <vertex x="${formatNumber(x)}" y="${formatNumber(y)}" z="${formatNumber(z)}"/>`
      );
    }

    lines.push('    </vertices>');
    lines.push('    <triangles>');

    for (const [a, b, c] of part.triangles) {
      lines.push(`     <triangle v1="${a}" v2="${b}" v3="${c}"/>`);
    }

    lines.push('    </triangles>');
    lines.push('   </mesh>');
    lines.push('  </object>');
  }

  lines.push(' </resources>');
  lines.push('</model>');

  return lines.join('\n');
}

function appendConfigMetadata(
  doc: Document,
  parent: Element,
  key: string,
  value: string
) {
  const metadata = doc.createElement('metadata');
  metadata.setAttribute('key', key);
  metadata.setAttribute('value', value);
  parent.appendChild(metadata);
}

function appendMeshStat(doc: Document, parent: Element, faceCount: number) {
  const meshStat = doc.createElement('mesh_stat');
  meshStat.setAttribute('face_count', String(faceCount));
  meshStat.setAttribute('edges_fixed', '0');
  meshStat.setAttribute('degenerate_facets', '0');
  meshStat.setAttribute('facets_removed', '0');
  meshStat.setAttribute('facets_reversed', '0');
  meshStat.setAttribute('backwards_edges', '0');
  parent.appendChild(meshStat);
}

function findDirectConfigObject(
  config: Element,
  objectId: string
): Element | null {
  for (const child of Array.from(config.childNodes)) {
    if (child.nodeType !== Node.ELEMENT_NODE) {
      continue;
    }

    const element = child as Element;

    if (
      element.tagName.toLowerCase() === 'object' &&
      element.getAttribute('id') === objectId
    ) {
      return element;
    }
  }

  return null;
}

function createConfigObject(doc: Document, config: Element, objectId: string) {
  const objectNode = doc.createElement('object');
  const insertionPoint = getFirstDirectChild(config, 'plate');

  objectNode.setAttribute('id', objectId);
  appendConfigMetadata(doc, objectNode, 'name', 'MakeYourCaps Overlay Target');
  config.insertBefore(objectNode, insertionPoint);

  return objectNode;
}

function getNextRelationshipIndex(root: Element): number {
  let nextIndex = 1;

  for (const relationship of Array.from(
    root.getElementsByTagName('Relationship')
  )) {
    const id = relationship.getAttribute('Id') || '';
    const match = id.match(/(\d+)$/);

    if (match) {
      nextIndex = Math.max(nextIndex, Number.parseInt(match[1], 10) + 1);
    }
  }

  return nextIndex;
}

function relationshipExists(root: Element, target: string): boolean {
  const normalizedTarget = normalizeEntryName(target);

  return Array.from(root.getElementsByTagName('Relationship')).some(
    (relationship) =>
      normalizeEntryName(relationship.getAttribute('Target') || '') ===
      normalizedTarget
  );
}

function getFirstDirectChild(parent: Element, tagName: string): Element | null {
  const expectedTagName = tagName.toLowerCase();

  for (const child of Array.from(parent.childNodes)) {
    if (
      child.nodeType === Node.ELEMENT_NODE &&
      (child as Element).tagName.toLowerCase() === expectedTagName
    ) {
      return child as Element;
    }
  }

  return null;
}

function parseXml(xml: string, message: string): Document {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const parserError = doc.getElementsByTagName('parsererror')[0];

  if (parserError) {
    throw new Error(message);
  }

  return doc;
}

function serializeXml(doc: Document): string {
  const xml = new XMLSerializer().serializeToString(doc);

  return xml.startsWith('<?xml')
    ? xml
    : `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;
}

function findEntry<T extends { filename: string }>(
  entries: readonly T[],
  normalizedEntryName: string
): (T & ReadableZipEntry) | null {
  const entry = entries.find(
    (candidate) =>
      normalizeEntryName(candidate.filename) === normalizedEntryName
  );

  if (!entry || !('getData' in entry) || typeof entry.getData !== 'function') {
    return null;
  }

  return entry as T & ReadableZipEntry;
}

function countInjectionTriangles(
  injections: readonly OverlayInjection[]
): number {
  return injections.reduce(
    (total, injection) =>
      total +
      injection.parts.reduce(
        (partTotal, part) => partTotal + part.triangles.length,
        0
      ),
    0
  );
}

function uniquePatchPalette(colors: readonly string[]): string[] {
  const palette: string[] = [];

  for (const color of colors) {
    const normalizedColor = normalizeHexColor(color);

    if (normalizedColor && !palette.includes(normalizedColor)) {
      palette.push(normalizedColor);
    }
  }

  return palette;
}

function findClosestHexColor(
  color: string,
  palette: readonly string[]
): string {
  const source = hexToRgb(color);
  let closest = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of palette) {
    const distance = colorDistance(source, hexToRgb(candidate));

    if (distance < bestDistance) {
      bestDistance = distance;
      closest = candidate;
    }
  }

  return closest;
}

function hexToRgb(color: string): [number, number, number] {
  const normalizedColor = normalizeHexColor(color) || '#000000';

  return [
    Number.parseInt(normalizedColor.slice(1, 3), 16),
    Number.parseInt(normalizedColor.slice(3, 5), 16),
    Number.parseInt(normalizedColor.slice(5, 7), 16),
  ];
}

function colorDistance(
  a: [number, number, number],
  b: [number, number, number]
) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];

  return dr * dr + dg * dg + db * db;
}

function getOverlayName(patch: BambuNativeOverlayPatch, patchIndex: number) {
  const name = patch.overlayName?.trim();

  return name || `MakeYourCaps Graphic ${patchIndex + 1}`;
}

function getSafeOverlaySlug(overlayId: string, patchIndex: number) {
  const slug = overlayId.replace(/[^a-z0-9_-]/gi, '').slice(0, 48);

  return slug || `${Date.now()}_${patchIndex + 1}`;
}

function makeUuid() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const nibble = char === 'x' ? value : (value & 0x3) | 0x8;

    return nibble.toString(16);
  });
}

function formatNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}

function roundGeometryCoordinate(value: number) {
  return Number(value.toFixed(6));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, '&apos;');
}

function normalizeEntryName(entryName: string): string {
  return entryName.replace(/^\/+/, '').toLowerCase();
}
