// [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
// Este módulo es momentáneo para asegurar la fidelidad en Bambu Studio.
// Referencia para reversión: src/jobs/exportFile.ts → generateExportFile(), downloadExportBlob()

import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';

import {
  FAMILY_FALLBACK_PATHS,
  ORIGINAL_3MF_PATHS,
} from './exportConfig';
import {
  getCapFamily,
  getSelectedAddonId,
} from '../etc/designCatalog';

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
 *
 * Resolves the path of the original .3mf file that matches the currently
 * loaded model. Returns `null` when no mapping exists (e.g. custom upload).
 *
 * Referencia para reversión: src/jobs/exportFile.ts → resolveSourceFile()
 */
export function resolveOriginal3mfPath(
  fileOrPath: string | File | undefined
): string | null {
  if (!fileOrPath) {
    return null;
  }

  // 1. Try matching via addon id
  const addonId = getSelectedAddonId(fileOrPath);

  if (addonId && ORIGINAL_3MF_PATHS[addonId]) {
    return ORIGINAL_3MF_PATHS[addonId];
  }

  // 2. Try matching via cap family fallback
  const family = getCapFamily(fileOrPath);

  if (family !== 'custom' && FAMILY_FALLBACK_PATHS[family]) {
    return FAMILY_FALLBACK_PATHS[family];
  }

  // 3. If the fileOrPath is itself a string pointing to a public path, use it directly
  if (typeof fileOrPath === 'string' && fileOrPath.endsWith('.3mf')) {
    return fileOrPath.startsWith('/') ? fileOrPath : `/${fileOrPath}`;
  }

  return null;
}

/**
 * [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
 *
 * Downloads the original, untouched .3mf file from the server, renames the
 * internal project entry with the user-provided project name, and triggers a
 * browser download.
 *
 * The file's supports, bed layout, and filament assignment are fully preserved.
 *
 * @param originalPath  Public path of the original .3mf (e.g. "/examples/trucker/…")
 * @param projectName   User-provided project name (used as the download filename)
 *
 * Referencia para reversión: src/jobs/exportFile.ts → downloadExportBlob()
 */
export async function downloadOriginal3mf(
  originalPath: string,
  projectName: string
): Promise<void> {
  const response = await fetch(originalPath, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch the original .3mf file from "${originalPath}" (HTTP ${response.status}).`
    );
  }

  const sourceBlob = await response.blob();
  const sanitizedName = sanitizeProjectName(projectName);
  const downloadFileName = `${sanitizedName}.3mf`;

  // Attempt to rename the internal project title inside the .3mf zip
  // while preserving every other byte.
  let finalBlob: Blob;

  try {
    finalBlob = await renameProjectInside3mf(sourceBlob, sanitizedName);
  } catch {
    // If renaming fails for any reason, just download the raw file as-is.
    finalBlob = sourceBlob;
  }

  triggerBlobDownload(finalBlob, downloadFileName);
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads the .3mf as a zip, renames the `<metadata name="Title">` entry inside
 * any `.model` file to reflect the user's project name, then re-zips.
 *
 * All other contents (thumbnails, slicer config, plate definitions, supports,
 * filament mappings) are passed through byte-for-byte.
 */
async function renameProjectInside3mf(
  sourceBlob: Blob,
  projectName: string
): Promise<Blob> {
  const zipReader = new ZipReader(new BlobReader(sourceBlob));
  const entries = await zipReader.getEntries();

  const outputBlobWriter = new BlobWriter('model/3mf');
  const zipWriter = new ZipWriter(outputBlobWriter);

  for (const entry of entries) {
    if (!('getData' in entry) || typeof entry.getData !== 'function') {
      continue;
    }

    const isModelFile = entry.filename.toLowerCase().endsWith('.model');

    if (isModelFile) {
      // Read as text, patch the title, write back
      const textWriter = new TextWriter();
      const modelXml = await entry.getData(textWriter);
      const patchedXml = replaceProjectTitle(modelXml, projectName);

      await zipWriter.add(entry.filename, new TextReader(patchedXml));
    } else {
      // Pass through byte-for-byte
      const blobWriter = new BlobWriter();
      const data = await entry.getData(blobWriter);

      await zipWriter.add(entry.filename, new BlobReader(data));
    }
  }

  await zipWriter.close();
  await zipReader.close();

  return outputBlobWriter.getData();
}

/**
 * Replaces `<metadata name="Title">…</metadata>` with the project name.
 * If no title metadata exists, the XML is returned unchanged.
 */
function replaceProjectTitle(xml: string, title: string): string {
  const titlePattern =
    /(<metadata\s+name=["']Title["']\s*>)([\s\S]*?)(<\/metadata>)/i;

  if (titlePattern.test(xml)) {
    return xml.replace(titlePattern, `$1${escapeXml(title)}$3`);
  }

  return xml;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeProjectName(name: string): string {
  return (
    name
      .trim()
      .replace(/\.3mf$/i, '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'MyProject'
  );
}

function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
