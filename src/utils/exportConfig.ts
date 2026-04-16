// [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
// Este módulo controla la conmutación entre el export dinámico y el bridge nativo.
// Referencia para reversión: src/jobs/exportFile.ts → generateExportFile()

/**
 * Master toggle for the export pipeline.
 *
 * `false` → Downloads the original .3mf file as-is (Native Compatibility Mode).
 *           Preserves supports, bed layout, and filament assignment from Bambu Studio.
 *
 * `true`  → Falls back to the dynamic generation pipeline (generateExportFile).
 *
 * To revert the entire bridge, simply set this to `true`.
 */
export const useDynamicExport = false;

/**
 * Maps each addon option id to the public path of its original .3mf file.
 *
 * These paths should match the files stored under /public/examples/ which
 * contain the factory-configured Bambu Studio project (supports, plate layout,
 * filament mapping, etc.).
 */
export const ORIGINAL_3MF_PATHS: Record<string, string> = {
  base: '/examples/trucker/Trucker Cap Base A1.3mf',
  'deer-antlers-g': '/examples/trucker/Deer Antlers G A1.3mf',
  'deer-antlers-p': '/examples/trucker/Deer Antlers P A1.3mf',
  samurai: '/examples/trucker/Samurai A1.3mf',
  'viking-horns': '/examples/trucker/Viking Horns A1.3mf',
};

/**
 * Fallback mapping for non-addon cap families.
 * Used when the loaded file is a standalone cap (not from the addon catalog).
 */
export const FAMILY_FALLBACK_PATHS: Record<string, string> = {
  trucker: '/examples/trucker/Trucker Cap Base A1.3mf',
  bucket: '/examples/bucket_hat.3mf',
  future: '/examples/future_cap.3mf',
};
