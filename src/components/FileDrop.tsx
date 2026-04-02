'use client';

import type { SxProps } from '@mui/material';
import Box from '@mui/material/Box';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

type Props = {
  children?: React.ReactNode;
  onDrop: (files: File[]) => void;
  sx?: SxProps;
};

const ACCEPTED_TYPES = ['.3mf', 'application/vnd.ms-3mfdocument'] as const;

export default function FileDrop({ children, onDrop, sx }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const validateFiles = React.useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      const files = Array.from(fileList || []);

      if (!files.length) {
        return;
      }

      if (files.length > 1) {
        enqueueSnackbar('Please select a single 3MF file.', {
          variant: 'error',
        });
        return;
      }

      const [file] = files;
      const is3mf = file.name.toLowerCase().endsWith('.3mf');

      if (!is3mf) {
        enqueueSnackbar(`${file.name} - only .3mf files are supported.`, {
          variant: 'error',
        });
        return;
      }

      onDrop([file]);
    },
    [onDrop]
  );

  const handleOpenPicker = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const mergedSx = {
    cursor: 'pointer',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#aaa',
    p: 1,
    backgroundColor: isDragActive ? '#eee' : '#fff',
    ...sx,
  };

  return (
    <Box
      component="div"
      role="button"
      tabIndex={0}
      sx={mergedSx}
      onClick={handleOpenPicker}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();

        if (event.currentTarget === event.target) {
          setIsDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);
        validateFiles(event.dataTransfer?.files);
      }}
    >
      <input
        ref={inputRef}
        hidden
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(event) => {
          validateFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
      {children}
    </Box>
  );
}
