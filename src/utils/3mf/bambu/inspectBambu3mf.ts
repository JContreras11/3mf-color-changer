import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';

import { getFilamentColors, type BambuProjectConfig } from './filamentSlots';

export type Bambu3mfInspection = {
  entryNames: string[];
  filamentColors: string[];
  hasModelSettings: boolean;
  hasProjectSettings: boolean;
  modelEntryNames: string[];
};

export async function inspectBambu3mf(blob: Blob): Promise<Bambu3mfInspection> {
  const zipReader = new ZipReader(new BlobReader(blob));

  try {
    const entries = await zipReader.getEntries();
    const entryNames = entries.map((entry) => entry.filename);
    const projectSettingsEntry = entries.find(
      (entry) =>
        entry.filename.toLowerCase() === 'metadata/project_settings.config'
    );
    const modelEntryNames = entryNames.filter((entryName) =>
      entryName.toLowerCase().endsWith('.model')
    );
    let filamentColors: string[] = [];

    if (
      projectSettingsEntry &&
      'getData' in projectSettingsEntry &&
      typeof projectSettingsEntry.getData === 'function'
    ) {
      try {
        const config = JSON.parse(
          await projectSettingsEntry.getData(new TextWriter())
        ) as BambuProjectConfig;
        filamentColors = getFilamentColors(config);
      } catch {
        filamentColors = [];
      }
    }

    return {
      entryNames,
      filamentColors,
      hasModelSettings: entryNames.some(
        (entryName) =>
          entryName.toLowerCase() === 'metadata/model_settings.config'
      ),
      hasProjectSettings: !!projectSettingsEntry,
      modelEntryNames,
    };
  } finally {
    await zipReader.close();
  }
}
