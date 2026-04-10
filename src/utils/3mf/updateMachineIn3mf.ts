import {
  BlobReader,
  BlobWriter,
  TextReader,
  TextWriter,
  ZipReader,
  ZipWriter,
} from '@zip.js/zip.js';

import type { MachineOption } from './machineProfiles';

const ZIP_STORE_OPTIONS = {
  level: 0,
} as const;

export default async function updateMachineIn3mf(
  blob: Blob,
  machine: MachineOption
) {
  const zipReader = new ZipReader(new BlobReader(blob));
  const blobWriter = new BlobWriter();
  const zipWriter = new ZipWriter(blobWriter);

  try {
    const entries = await zipReader.getEntries();

    for (const entry of entries) {
      if (!('getData' in entry) || typeof entry.getData !== 'function') {
        continue;
      }

      const isProjectSettings =
        entry.filename.toLowerCase() === 'metadata/project_settings.config';

      if (!isProjectSettings) {
        const fileBlob = await entry.getData(new BlobWriter());
        await zipWriter.add(entry.filename, new BlobReader(fileBlob), ZIP_STORE_OPTIONS);
        continue;
      }

      const content = await entry.getData(new TextWriter());
      const parsed = JSON.parse(content);

      parsed.printer_model = machine.printerModel;
      parsed.printer_settings_id = machine.printerSettingsId;

      await zipWriter.add(
        entry.filename,
        new TextReader(JSON.stringify(parsed, null, 2)),
        ZIP_STORE_OPTIONS
      );
    }

    await zipWriter.close();

    return blobWriter.getData();
  } finally {
    await zipReader.close();
  }
}
