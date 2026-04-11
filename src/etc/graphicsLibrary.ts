export type GraphicLibraryItem = {
  id: string;
  label: string;
  path: string;
  type: 'png' | 'svg';
};

import { withBasePath } from '@/utils/basePath';

export const GRAPHICS_LIBRARY_ITEMS: readonly GraphicLibraryItem[] = [
  {
    id: 'bolt',
    label: 'Bolt',
    path: withBasePath('/graphics-library/bolt.svg'),
    type: 'svg',
  },
  {
    id: 'starburst',
    label: 'Starburst',
    path: withBasePath('/graphics-library/starburst.svg'),
    type: 'svg',
  },
  {
    id: 'crown',
    label: 'Crown',
    path: withBasePath('/graphics-library/crown.svg'),
    type: 'svg',
  },
  {
    id: 'flame',
    label: 'Flame',
    path: withBasePath('/graphics-library/flame.svg'),
    type: 'svg',
  },
  {
    id: 'skull',
    label: 'Skull',
    path: withBasePath('/graphics-library/skull.svg'),
    type: 'svg',
  },
  {
    id: 'brand-logo',
    label: 'Brand Logo',
    path: withBasePath('/logo.png'),
    type: 'png',
  },
] as const;
