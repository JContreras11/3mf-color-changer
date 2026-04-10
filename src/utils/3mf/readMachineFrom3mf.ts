import { BlobReader, TextWriter, ZipReader } from '@zip.js/zip.js';

export default async function readMachineFrom3mf(blob: Blob) {
  const zipReader = new ZipReader(new BlobReader(blob));

  try {
    const entries = await zipReader.getEntries();
    const settingsEntry = entries.find(
      (entry) =>
        entry.filename.toLowerCase() === 'metadata/project_settings.config'
    );

    if (
      !settingsEntry ||
      !('getData' in settingsEntry) ||
      typeof settingsEntry.getData !== 'function'
    ) {
      return null;
    }

    const content = await settingsEntry.getData(new TextWriter());
    const parsed = JSON.parse(content);
    const printerModel =
      typeof parsed?.printer_model === 'string' ? parsed.printer_model : null;

    return {
      printerModel,
    };
  } catch {
    return null;
  } finally {
    await zipReader.close();
  }
}
