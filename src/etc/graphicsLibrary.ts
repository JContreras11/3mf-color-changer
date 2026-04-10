export type GraphicLibraryItem = {
  id: string;
  label: string;
  path: string;
  type: 'png' | 'svg';
};

export const GRAPHICS_LIBRARY_ITEMS: readonly GraphicLibraryItem[] = [
  {
    id: 'bolt',
    label: 'Bolt',
    path: '/graphics-library/bolt.svg',
    type: 'svg',
  },
  {
    id: 'starburst',
    label: 'Starburst',
    path: '/graphics-library/starburst.svg',
    type: 'svg',
  },
  {
    id: 'crown',
    label: 'Crown',
    path: '/graphics-library/crown.svg',
    type: 'svg',
  },
  {
    id: 'flame',
    label: 'Flame',
    path: '/graphics-library/flame.svg',
    type: 'svg',
  },
  {
    id: 'skull',
    label: 'Skull',
    path: '/graphics-library/skull.svg',
    type: 'svg',
  },
  {
    id: 'brand-logo',
    label: 'Brand Logo',
    path: '/logo.png',
    type: 'png',
  },
] as const;
