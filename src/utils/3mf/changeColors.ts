import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';
import * as THREE from 'three';

import getFace from '../threejs/getFace';
import getFaceColor from '../threejs/getFaceColor';
import { getFaceCount } from '../threejs/getFaceCount';
import { addColorGroup } from './addColorGroup';

export type Face = {
  v1: THREE.Vector3;
  v2: THREE.Vector3;
  v3: THREE.Vector3;
};

/* Applies the color changes to a given 3MF file and returns the content blob of the new file */
export async function changeColors(
  file: File,
  object: THREE.Object3D
): Promise<Blob> {
  // Unzip the used 3mf file
  const zipFileWriter = new BlobWriter();
  const zipFileReader = new BlobReader(file);
  const zipWriter = new ZipWriter(zipFileWriter);
  const zipReader = new ZipReader(zipFileReader);
  const entries = await zipReader.getEntries();
  // Use a high starting ID to prevent collisions with existing resource IDs in the 3MF XML
  let nextId = 1000000;

  // Loop through all entries and add them to the new zip file. If the entry is the
  // 3dmodel.model file, we will change the colors.
  for (const entry of entries) {
    // We process all .model files because 3MF objects might be stored in separate model files (e.g. 3D/Objects/A.model)
    if (!entry.filename.toLowerCase().endsWith('.model')) {
      if (!('getData' in entry) || typeof entry.getData !== 'function') {
        continue;
      }

      const writer = new BlobWriter();
      const data = await entry.getData(writer);
      await zipWriter.add(entry.filename, new BlobReader(data));

      continue;
    }

    const writer = new TextWriter();

    if ('getData' in entry && typeof entry.getData === 'function') {
      const data = await entry.getData(writer);
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(data, 'text/xml');

      // Check if the namespace for the material extension is loaded
      const namespace = xmlDoc.querySelector('xmlns\\:m');
      if (!namespace) {
        xmlDoc
          .getElementsByTagName('model')[0]
          .setAttribute(
            'xmlns:m',
            'http://schemas.microsoft.com/3dmanufacturing/material/2015/02'
          );
      }

      object.traverse((child: THREE.Object3D) => {
        const mesh = child as THREE.Mesh;

        if (!mesh.isMesh) {
          return;
        }

        // Find the object in the 3MF file that matches the mesh
        const xmlId = getXmlId(mesh);
        let obj: Element | null = null;
        
        if (xmlId) {
          obj = xmlDoc.querySelector(`object[id="${xmlId}"]`);
        }
        
        if (!obj) {
          obj = findObjectByName(xmlDoc, mesh.name);
        }

        if (obj) {
          const triangles = Array.from(obj.getElementsByTagName('triangle'));
          const lookup = new TriangleLookup(obj);
          const colorGroup: string[] = [];

          // Get the color of the mesh
          if ((mesh.material as THREE.MeshStandardMaterial).color) {
            colorGroup.push(`#${(mesh.material as THREE.MeshStandardMaterial).color.getHexString()}`);
          }

          // Go through all faces
          let faceMismatch = false;
          for (let i = 0; i < getFaceCount(mesh) / 3; ++i) {
            const face = getFace(mesh, i);
            const triangleIdx = lookup.find(face);

            if (triangleIdx === -1) {
              faceMismatch = true;
              break; // This mesh does not match this XML object (e.g. fallback selected wrong object)
            }

            // Find the color of the face
            const color = getFaceColor(mesh, face);

            // Add the color to the color group
            if (!colorGroup.includes(color)) {
              colorGroup.push(color);
            }

            // Set the pid and p1 attributes on the triangle
            triangles[triangleIdx].setAttribute('pid', nextId.toString());
            triangles[triangleIdx].setAttribute(
              'p1',
              colorGroup.findIndex((c) => c === color).toString()
            );
          }

          if (faceMismatch) {
            return; // Skip altering this object if it doesn't match the current mesh
          }

          // It seems that in some cases, setting the color on the model is necessary. Otherwise
          // the color of the faces is not applied to the object. I don't know why this is the case.
          obj.setAttribute('pid', nextId.toString());
          obj.setAttribute('pindex', '0');

          addColorGroup(xmlDoc, colorGroup, nextId.toString());
          ++nextId;
        }
      });

      // TODO Remove unused colors and color groups

      // Save the file
      const serializer = new XMLSerializer();
      const xmlString = serializer.serializeToString(xmlDoc);

      await zipWriter.add(entry.filename, new TextReader(xmlString));
    } else {
      throw new Error('ZIP entry does not have a getData method');
    }
  }

  // Download the file
  await zipWriter.close();

  // Get the data blob and return it
  return zipFileWriter.getData();
}

function getXmlId(object: THREE.Object3D): string | undefined {
  if (object.userData && object.userData.xmlId) {
    return object.userData.xmlId;
  }
  if (object.parent) {
    return getXmlId(object.parent);
  }
  return undefined;
}

function findObjectByName(xmlDoc: Document, name: string): Element | null {
  const object = xmlDoc.querySelector(`object[name="${name}"]`);

  // If we don't find an object with the given name, we check if there is only one
  // object in the file. If so, we can assume that this is the object we want to
  // modify.
  if (!object) {
    const objects = xmlDoc.querySelectorAll('object');
    // Ensure we only fallback if there's exactly 1 object AND it is actually a mesh object (not a component)
    if (objects.length === 1 && objects[0].querySelector('mesh')) {
      return objects[0];
    }
    // If not found by name, try to find one that has the same triangle count roughly but we'll just check all mesh ones later... 
    // Fallback: we return null if we can't be sure! Actually, let's return all mesh objects and let the vertex check sort it out.
    // However, function signature is Element | null. So we'll stick to null if multiple.
  }

  return object;
}

class TriangleLookup {
  private triangleIndexMap: Map<string, number>;
  private vertexGrid: Map<string, number[]>;
  private vertexCoords: { x: number; y: number; z: number }[];

  constructor(mesh: Element) {
    this.vertexGrid = new Map();
    this.triangleIndexMap = new Map();
    this.vertexCoords = [];

    const vertices = mesh.getElementsByTagName('vertex');
    for (let i = 0; i < vertices.length; ++i) {
      const vertex = vertices[i];
      const x = parseFloat(vertex.getAttribute('x')!);
      const y = parseFloat(vertex.getAttribute('y')!);
      const z = parseFloat(vertex.getAttribute('z')!);

      this.vertexCoords.push({ x, y, z });

      const hash = this.hash(x, y, z);
      if (!this.vertexGrid.has(hash)) {
        this.vertexGrid.set(hash, []);
      }
      this.vertexGrid.get(hash)!.push(i);
    }

    const triangles = mesh.getElementsByTagName('triangle');
    for (let i = 0; i < triangles.length; ++i) {
      const t = triangles[i];
      const v1 = t.getAttribute('v1');
      const v2 = t.getAttribute('v2');
      const v3 = t.getAttribute('v3');
      this.triangleIndexMap.set(`${v1}_${v2}_${v3}`, i);
    }
  }

  private hash(x: number, y: number, z: number): string {
    return `${Math.round(x / 0.05)}_${Math.round(y / 0.05)}_${Math.round(z / 0.05)}`;
  }

  private getNeighbors(x: number, y: number, z: number): string[] {
    const hx = Math.round(x / 0.05);
    const hy = Math.round(y / 0.05);
    const hz = Math.round(z / 0.05);
    const hashes = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          hashes.push(`${hx + dx}_${hy + dy}_${hz + dz}`);
        }
      }
    }
    return hashes;
  }

  private findMatchingVertices(x: number, y: number, z: number): number[] {
    const hashes = this.getNeighbors(x, y, z);
    const matches: number[] = [];
    const used = new Set<number>();

    for (const hash of hashes) {
      const candidates = this.vertexGrid.get(hash) || [];
      for (const i of candidates) {
        if (used.has(i)) continue;
        used.add(i);
        const v = this.vertexCoords[i];
        if (
          Math.abs(v.x - x) < 0.01 &&
          Math.abs(v.y - y) < 0.01 &&
          Math.abs(v.z - z) < 0.01
        ) {
          matches.push(i);
        }
      }
    }
    return matches;
  }

  find(face: Face): number {
    const c1 = this.findMatchingVertices(face.v1.x, face.v1.y, face.v1.z);
    const c2 = this.findMatchingVertices(face.v2.x, face.v2.y, face.v2.z);
    const c3 = this.findMatchingVertices(face.v3.x, face.v3.y, face.v3.z);

    for (const v1 of c1) {
      for (const v2 of c2) {
        for (const v3 of c3) {
          const idx = this.triangleIndexMap.get(`${v1}_${v2}_${v3}`);
          if (idx !== undefined) return idx;
        }
      }
    }
    return -1;
  }
}
