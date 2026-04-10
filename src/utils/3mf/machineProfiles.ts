export type MachineOption = {
  id: 'H2D' | 'A1' | 'X1C' | 'P1P' | 'P1S';
  label: string;
  printerModel: string;
  printerSettingsId: string;
};

export const MACHINE_OPTIONS: readonly MachineOption[] = [
  {
    id: 'H2D',
    label: 'H2D',
    printerModel: 'Bambu Lab H2D',
    printerSettingsId: 'Bambu Lab H2D 0.4 nozzle',
  },
  {
    id: 'A1',
    label: 'A1',
    printerModel: 'Bambu Lab A1',
    printerSettingsId: 'Bambu Lab A1 0.4 nozzle',
  },
  {
    id: 'X1C',
    label: 'X1C',
    printerModel: 'Bambu Lab X1 Carbon',
    printerSettingsId: 'Bambu Lab X1 Carbon 0.4 nozzle',
  },
  {
    id: 'P1P',
    label: 'P1P',
    printerModel: 'Bambu Lab P1P',
    printerSettingsId: 'Bambu Lab P1P 0.4 nozzle',
  },
  {
    id: 'P1S',
    label: 'P1S',
    printerModel: 'Bambu Lab P1S',
    printerSettingsId: 'Bambu Lab P1S 0.4 nozzle',
  },
] as const;

export function getMachineByPrinterModel(printerModel?: string | null) {
  if (!printerModel) {
    return null;
  }

  const normalized = printerModel.toLowerCase();

  return (
    MACHINE_OPTIONS.find((option) =>
      option.printerModel.toLowerCase() === normalized
    ) ||
    MACHINE_OPTIONS.find((option) => normalized.includes(option.id.toLowerCase())) ||
    null
  );
}
