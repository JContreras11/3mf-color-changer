export type CapFamily =
  | 'trucker'
  | 'future'
  | 'bucket'
  | 'custom';

export type AddonArtwork =
  | 'base'
  | 'deer_gold'
  | 'deer_natural'
  | 'viking';

export type AddonOption = {
  artwork: AddonArtwork;
  family: CapFamily;
  id: string;
  path: string;
  subtitle: string;
  title: string;
};

export const TRUCKER_ADDON_OPTIONS: AddonOption[] = [
  {
    id: 'base',
    title: 'Base',
    subtitle: 'Base cap only',
    path: 'examples/trucker_cap.3mf',
    artwork: 'base',
    family: 'trucker',
  },
  {
    id: 'deer-antlers-gold',
    title: 'Deer Antlers Gold',
    subtitle: 'Trucker-only variation',
    path: 'examples/Cuernos/Deer Antlers G.3mf',
    artwork: 'deer_gold',
    family: 'trucker',
  },
  {
    id: 'deer-antlers-natural',
    title: 'Deer Antlers Natural',
    subtitle: 'Trucker-only variation',
    path: 'examples/Cuernos/Deer Antlers P.3mf',
    artwork: 'deer_natural',
    family: 'trucker',
  },
  {
    id: 'viking-horns',
    title: 'Viking Horns',
    subtitle: 'Trucker-only variation',
    path: 'examples/Cuernos/Viking Horns.3mf',
    artwork: 'viking',
    family: 'trucker',
  },
];

export function getCapFamily(file: File | string | undefined): CapFamily {
  const value = typeof file === 'string' ? file : file?.name || '';
  const normalized = value.toLowerCase();

  if (
    normalized.includes('trucker_cap') ||
    normalized.includes('trucker cap') ||
    normalized.includes('/cuernos/')
  ) {
    return 'trucker';
  }

  if (normalized.includes('future_cap') || normalized.includes('future cap')) {
    return 'future';
  }

  if (normalized.includes('bucket_hat') || normalized.includes('bucket hat')) {
    return 'bucket';
  }

  return 'custom';
}

export function getCapFamilyLabel(family: CapFamily) {
  switch (family) {
    case 'trucker':
      return 'Trucker Cap';
    case 'future':
      return 'Future Cap';
    case 'bucket':
      return 'Bucket Hat';
    default:
      return 'Custom Upload';
  }
}

export function getSelectedAddonId(file: File | string | undefined) {
  if (typeof file !== 'string') {
    return null;
  }

  const normalized = file.toLowerCase();

  if (
    normalized.includes('deer antlers g') ||
    normalized.includes('deer-antlers-gold')
  ) {
    return 'deer-antlers-gold';
  }

  if (
    normalized.includes('deer antlers p') ||
    normalized.includes('deer-antlers-natural')
  ) {
    return 'deer-antlers-natural';
  }

  if (
    normalized.includes('viking horns') ||
    normalized.includes('viking-horns')
  ) {
    return 'viking-horns';
  }

  if (
    normalized.includes('trucker_cap') ||
    normalized.includes('trucker cap base') ||
    normalized.includes('/cuernos/')
  ) {
    return 'base';
  }

  return null;
}
