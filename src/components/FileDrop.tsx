'use client';

import type { SxProps } from '@mui/material';
import Box from '@mui/material/Box';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

type Props = {
  children?: React.ReactNode;
  disabled?: boolean;
  onDisabledClick?: () => void;
  onDrop: (files: File[]) => void;
  sx?: SxProps;
};

const ACCEPTED_TYPES = ['.3mf', 'application/vnd.ms-3mfdocument'] as const;

export default function FileDrop({
  children,
  disabled = false,
  onDisabledClick,
  onDrop,
  sx,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);

  const validateFiles = React.useCallback(
    (fileList: FileList | File[] | null | undefined) => {
      const files = Array.from(fileList || []);

      if (!files.length || disabled) {
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
    [disabled, onDrop]
  );

  const handleOpenPicker = React.useCallback(() => {
    if (disabled) {
      onDisabledClick?.();
      return;
    }

    inputRef.current?.click();
  }, [disabled, onDisabledClick]);

  const mergedSx = {
    cursor: disabled ? 'not-allowed' : 'pointer',
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: '#aaa',
    p: 1,
    opacity: disabled ? 0.72 : 1,
    backgroundColor: isDragActive ? '#eee' : '#fff',
    ...sx,
  };

  return (
    <Box
      component="div"
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      sx={mergedSx}
      onClick={handleOpenPicker}
      onKeyDown={(event) => {
        if (disabled) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpenPicker();
        }
      }}
      onDragEnter={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        setIsDragActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        setIsDragActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();

        if (disabled) {
          return;
        }

        if (event.currentTarget === event.target) {
          setIsDragActive(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragActive(false);

        if (disabled) {
          onDisabledClick?.();
          return;
        }

        validateFiles(event.dataTransfer?.files);
      }}
    >
      <input
        ref={inputRef}
        hidden
        disabled={disabled}
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
