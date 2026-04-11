import { withBasePath } from '@/utils/basePath';

export type CapFamily =
  | 'trucker'
  | 'future'
  | 'bucket'
  | 'custom';

export type AddonArtwork =
  | 'base'
  | 'deer_gold'
  | 'deer_natural'
  | 'samurai'
  | 'viking';

export type AddonOption = {
  artwork: AddonArtwork;
  family: CapFamily;
  id: string;
  path: string;
  previewImages?: {
    front?: string;
    side?: string;
  };
  relatedPaths?: string[];
  subtitle: string;
  title: string;
};

export const TRUCKER_ADDON_OPTIONS: AddonOption[] = [
  {
    id: 'base',
    title: 'Base',
    subtitle: 'Base cap only',
    path: 'examples/trucker/Trucker Cap Base A1.3mf',
    artwork: 'base',
    family: 'trucker',
    previewImages: {
      side: withBasePath('/caps/addons/trucker/trucker_base_side.webp'),
      front: withBasePath('/caps/addons/trucker/trucker_base_front.webp'),
    },
    relatedPaths: [
      'examples/trucker/Trucker Cap Base A1.3mf',
      'examples/trucker/Trucker Cap Base.3mf',
      'examples/cuernos/Trucker Cap Base A1.3mf',
      'examples/cuernos/Trucker Cap Base.3mf',
      'examples/trucker_cap.3mf',
    ],
  },
  {
    id: 'deer-antlers-g',
    title: 'Deer Antlers G',
    subtitle: 'Trucker-only variation',
    path: 'examples/trucker/Deer Antlers G A1.3mf',
    artwork: 'deer_gold',
    family: 'trucker',
    previewImages: {
      side: withBasePath('/caps/addons/trucker/trucker_deer_side.png'),
      front: withBasePath('/caps/addons/trucker/trucker_deer_front.png'),
    },
    relatedPaths: [
      'examples/trucker/Deer Antlers G A1.3mf',
      'examples/trucker/Deer Antlers G.3mf',
      'examples/cuernos/Deer Antlers G.3mf',
      'examples/cuernos/Deer Antlers G A1.3mf',
    ],
  },
  {
    id: 'deer-antlers-p',
    title: 'Deer Antlers P',
    subtitle: 'Trucker-only variation',
    path: 'examples/trucker/Deer Antlers P A1.3mf',
    artwork: 'deer_natural',
    family: 'trucker',
    previewImages: {
      side: withBasePath('/caps/addons/trucker/trucker_mini_deer_side.webp'),
      front: withBasePath('/caps/addons/trucker/trucker_mini_deer_front.webp'),
    },
    relatedPaths: [
      'examples/trucker/Deer Antlers P A1.3mf',
      'examples/trucker/Deer Antlers P.3mf',
      'examples/cuernos/Deer Antlers P.3mf',
      'examples/cuernos/Deer Antlers P A1.3mf',
    ],
  },
  {
    id: 'samurai',
    title: 'Samurai',
    subtitle: 'Trucker-only variation',
    path: 'examples/trucker/Samurai A1.3mf',
    artwork: 'samurai',
    family: 'trucker',
    previewImages: {
      side: withBasePath('/caps/addons/trucker/trucker_samurai_side.png'),
    },
    relatedPaths: ['examples/trucker/Samurai A1.3mf'],
  },
  {
    id: 'viking-horns',
    title: 'Viking Horns',
    subtitle: 'Trucker-only variation',
    path: 'examples/trucker/Viking Horns A1.3mf',
    artwork: 'viking',
    family: 'trucker',
    previewImages: {
      side: withBasePath('/caps/addons/trucker/trucker_horns_side.png'),
      front: withBasePath('/caps/addons/trucker/trucker_horns_front.png'),
    },
    relatedPaths: [
      'examples/trucker/Viking Horns A1.3mf',
      'examples/trucker/Viking Horns.3mf',
      'examples/cuernos/Viking Horns.3mf',
      'examples/cuernos/Viking Horns A1.3mf',
    ],
  },
];

export function getCapFamily(file: File | string | undefined): CapFamily {
  const value = typeof file === 'string' ? file : file?.name || '';
  const normalized = value.toLowerCase();

  if (
    normalized.includes('trucker_cap') ||
    normalized.includes('trucker cap') ||
    normalized.includes('/cuernos/') ||
    normalized.includes('/trucker/') ||
    matchesAddonPath(normalized, TRUCKER_ADDON_OPTIONS)
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

  const matchedAddon = TRUCKER_ADDON_OPTIONS.find((option) =>
    optionPathMatches(option, normalized)
  );

  if (matchedAddon) {
    return matchedAddon.id;
  }

  if (normalized.includes('trucker_cap')) {
    return 'base';
  }

  return null;
}

function matchesAddonPath(normalizedFile: string, options: AddonOption[]) {
  return options.some((option) => optionPathMatches(option, normalizedFile));
}

function optionPathMatches(option: AddonOption, normalizedFile: string) {
  const candidates = [option.path, ...(option.relatedPaths || [])];

  return candidates.some((candidate) =>
    normalizedFile.includes(candidate.toLowerCase())
  );
}
