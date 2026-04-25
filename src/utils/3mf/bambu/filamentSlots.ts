export type BambuProjectConfig = Record<string, unknown> & {
  filament_colour?: unknown;
};

export const MAX_BAMBU_FILAMENT_SLOTS = 32;

export type FilamentSlotSource = 'existing' | 'appended';

export type FilamentSlotAssignment = {
  color: string;
  slot: number;
  source: FilamentSlotSource;
};

export type AppendFilamentColorsResult = {
  appendedColors: string[];
  assignments: FilamentSlotAssignment[];
  existingColorCount: number;
  finalColorCount: number;
};

const PER_FILAMENT_KEY_PATTERN = /^(filament_|flush_volumes_)/;

export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim();
  const match = trimmed.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i);

  if (!match) {
    return null;
  }

  const rgb = match[1];
  const expanded =
    rgb.length === 3
      ? rgb
          .split('')
          .map((char) => `${char}${char}`)
          .join('')
      : rgb;

  return `#${expanded.toUpperCase()}`;
}

export function getFilamentColors(config: BambuProjectConfig): string[] {
  const colors = Array.isArray(config.filament_colour)
    ? config.filament_colour
    : [];

  return colors
    .map((color) =>
      typeof color === 'string' ? normalizeHexColor(color) : null
    )
    .filter((color): color is string => !!color);
}

export function appendFilamentColorsToProjectConfig(
  config: BambuProjectConfig,
  colorsToAppend: readonly string[]
): AppendFilamentColorsResult {
  const rawExistingColors = Array.isArray(config.filament_colour)
    ? [...config.filament_colour]
    : [];
  const existingColors = rawExistingColors.map((color) =>
    typeof color === 'string'
      ? normalizeHexColor(color) || color.toUpperCase()
      : String(color)
  );
  const existingColorCount = existingColors.length;
  const normalizedColorsToAppend = uniqueNormalizedColors(colorsToAppend);
  const assignments: FilamentSlotAssignment[] = [];
  const appendedColors: string[] = [];

  for (const color of normalizedColorsToAppend) {
    const existingIndex = existingColors.findIndex(
      (existingColor) => normalizeHexColor(existingColor) === color
    );

    if (existingIndex >= 0) {
      assignments.push({
        color,
        slot: existingIndex + 1,
        source: 'existing',
      });
      continue;
    }

    existingColors.push(color);
    appendedColors.push(color);
    assignments.push({
      color,
      slot: existingColors.length,
      source: 'appended',
    });
  }

  if (appendedColors.length > 0) {
    extendPerFilamentArrays(config, existingColorCount, existingColors.length);
  }

  config.filament_colour = existingColors;

  return {
    appendedColors,
    assignments,
    existingColorCount,
    finalColorCount: existingColors.length,
  };
}

export function buildColorSlotMap(
  assignments: readonly FilamentSlotAssignment[],
  config: BambuProjectConfig
): Map<string, number> {
  const slotByColor = new Map<string, number>();

  getFilamentColors(config).forEach((color, index) => {
    slotByColor.set(color, index + 1);
  });

  assignments.forEach((assignment) => {
    slotByColor.set(assignment.color, assignment.slot);
  });

  return slotByColor;
}

function uniqueNormalizedColors(colors: readonly string[]): string[] {
  const uniqueColors: string[] = [];

  for (const color of colors) {
    const normalizedColor = normalizeHexColor(color);

    if (normalizedColor && !uniqueColors.includes(normalizedColor)) {
      uniqueColors.push(normalizedColor);
    }
  }

  return uniqueColors;
}

function extendPerFilamentArrays(
  config: BambuProjectConfig,
  previousCount: number,
  nextCount: number
): void {
  if (previousCount <= 0 || nextCount <= previousCount) {
    return;
  }

  for (const [key, value] of Object.entries(config)) {
    if (key === 'filament_colour' || !PER_FILAMENT_KEY_PATTERN.test(key)) {
      continue;
    }

    if (!Array.isArray(value)) {
      continue;
    }

    if (key === 'flush_volumes_matrix' || value.length === previousCount ** 2) {
      config[key] = extendSquareMatrix(value, previousCount, nextCount);
      continue;
    }

    if (value.length === previousCount) {
      config[key] = extendLinearArray(value, previousCount, nextCount, 1);
      continue;
    }

    if (value.length === previousCount * 2) {
      config[key] = extendLinearArray(value, previousCount, nextCount, 2);
      continue;
    }

    if (value.length === previousCount * 4) {
      config[key] = extendLinearArray(value, previousCount, nextCount, 4);
    }
  }
}

function extendLinearArray<T>(
  values: T[],
  previousCount: number,
  nextCount: number,
  stride: number
): T[] {
  const nextValues = [...values];
  const template = values.slice(0, stride);

  for (let slot = previousCount; slot < nextCount; slot += 1) {
    for (let offset = 0; offset < stride; offset += 1) {
      nextValues.push(cloneConfigValue(template[offset] ?? template[0]));
    }
  }

  return nextValues;
}

function extendSquareMatrix<T>(
  values: T[],
  previousCount: number,
  nextCount: number
): T[] {
  const fallback = cloneConfigValue(values[0]);
  const nextValues: T[] = [];

  for (let row = 0; row < nextCount; row += 1) {
    for (let col = 0; col < nextCount; col += 1) {
      if (row < previousCount && col < previousCount) {
        nextValues.push(values[row * previousCount + col]);
      } else {
        nextValues.push(cloneConfigValue(fallback));
      }
    }
  }

  return nextValues;
}

function cloneConfigValue<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}
