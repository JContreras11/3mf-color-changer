// [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
// Este componente es momentáneo para asegurar la fidelidad en Bambu Studio.
// Referencia para reversión: Eliminar este archivo y las referencias en ExportReview.tsx.

import Box from '@mui/material/Box';
import React from 'react';

type Props = {
  src: string;
  alt: string;
  onLoad?: () => void;
};

export default function NativePreviewImage({ src, alt, onLoad }: Props) {
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onLoad={onLoad}
      sx={{
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        p: { xs: 2, md: 4 },
        filter: 'drop-shadow(0 20px 40px rgba(0, 0, 0, 0.4))',
        transform: 'scale(1.05)',
      }}
    />
  );
}
