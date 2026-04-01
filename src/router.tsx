import React from 'react';
import { createHashRouter } from 'react-router-dom';

import Editor, { Settings } from './components/Editor';
import Home from './components/Home';

const router = createHashRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/editor',
    element: (
      <Editor
        onSettingsChange={(settings) => {
          if (localStorage) {
            localStorage.setItem('settings', JSON.stringify(settings));
          }
        }}
      />
    ),
    loader: () => {
      // Load settings from local storage
      if (localStorage) {
        const settings = JSON.parse(
          localStorage.getItem('settings') || '{}'
        ) as Settings & { mode?: string };

        // Migrate legacy/removed modes to the closest supported tools.
        if (settings.mode === 'triangle_neighbors') {
          settings.mode = 'triangle';
        } else if (settings.mode === 'add_text') {
          settings.mode = 'text';
        } else if (settings.mode === 'add_image_decal') {
          settings.mode = 'image';
        }

        return settings;
      }
      return null;
    },
  },
]);

export default router;
