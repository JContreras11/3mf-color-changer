import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded';
import BlurOnRoundedIcon from '@mui/icons-material/BlurOnRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import React from 'react';

import type { FilamentImageOptions } from '../utils/threejs/processImageForFilaments';
import {
  estimateFilamentPalette,
  getDefaultFilamentImageOptions,
} from '../utils/threejs/processImageForFilaments';

type Props = {
  fileName: string;
  onCancel: () => void;
  onConfirm: (options: FilamentImageOptions) => void;
  open: boolean;
  sourceCanvas: HTMLCanvasElement | null;
  submitting?: boolean;
};

export default function ImagePreparationDialog({
  fileName,
  onCancel,
  onConfirm,
  open,
  sourceCanvas,
  submitting = false,
}: Props) {
  const [options, setOptions] = React.useState<FilamentImageOptions>(
    getDefaultFilamentImageOptions()
  );

  React.useEffect(() => {
    if (!open) {
      setOptions(getDefaultFilamentImageOptions());
    }
  }, [open]);

  const sourcePreview = React.useMemo(() => {
    if (!sourceCanvas) {
      return null;
    }

    return sourceCanvas.toDataURL('image/png');
  }, [sourceCanvas]);

  const estimatedPalette = React.useMemo(() => {
    if (!sourceCanvas || !open) {
      return [];
    }

    return estimateFilamentPalette(sourceCanvas, options);
  }, [open, options, sourceCanvas]);

  return (
    <Dialog
      fullWidth
      maxWidth="lg"
      onClose={submitting ? undefined : onCancel}
      open={open}
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '26px', md: '34px' },
            overflow: 'hidden',
            bgcolor: alpha('#fdfefe', 0.98),
            border: `1px solid ${alpha('#d9e4fb', 0.92)}`,
          },
        },
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }}>
        <Box
          sx={{
            width: { xs: '100%', md: '50%' },
            p: { xs: 2.5, md: 3 },
            borderRight: { md: `1px solid ${alpha('#d9e4fb', 0.92)}` },
            borderBottom: {
              xs: `1px solid ${alpha('#d9e4fb', 0.92)}`,
              md: 'none',
            },
            background:
              'radial-gradient(circle at top left, rgba(15,111,227,0.13) 0%, rgba(255,255,255,0.92) 48%, rgba(237,244,255,0.94) 100%)',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <CloudUploadRoundedIcon sx={{ color: '#0058bc' }} />
            <Typography
              sx={{
                color: '#0058bc',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
              }}
            >
              Graphic mapping
            </Typography>
          </Stack>
          <Typography
            sx={{
              mt: 1,
              color: '#111827',
              fontFamily: '"Manrope", "Inter", sans-serif',
              fontSize: { xs: 24, md: 30 },
              fontWeight: 800,
              letterSpacing: '-0.04em',
            }}
          >
            Optimize for filament printing
          </Typography>
          <Typography
            sx={{
              mt: 1,
              color: '#4b5563',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {fileName}
          </Typography>

          <Box
            sx={{
              mt: 2,
              borderRadius: '22px',
              overflow: 'hidden',
              border: `1px solid ${alpha('#d8e2ff', 0.9)}`,
              bgcolor: '#fff',
              minHeight: { xs: 220, md: 320 },
              display: 'grid',
              placeItems: 'center',
              p: 1.5,
            }}
          >
            {sourcePreview ? (
              <Box
                component="img"
                src={sourcePreview}
                alt="Uploaded graphic preview"
                sx={{
                  maxWidth: '100%',
                  maxHeight: { xs: 220, md: 320 },
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            ) : (
              <Typography sx={{ color: '#6b7280', fontSize: 14 }}>
                No preview available.
              </Typography>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            width: { xs: '100%', md: '50%' },
            p: { xs: 2.5, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack spacing={2.5}>
            <Stack spacing={1.2}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <PaletteRoundedIcon sx={{ color: '#0058bc', fontSize: 20 }} />
                  <Typography sx={{ color: '#111827', fontWeight: 700 }}>
                    Color reducer (filaments)
                  </Typography>
                </Stack>
                <ChipLabel value={`${options.maxColors} colors`} />
              </Stack>
              <Slider
                disabled={submitting}
                max={24}
                min={2}
                step={1}
                value={options.maxColors}
                onChange={(_, value) =>
                  setOptions((current) => ({
                    ...current,
                    maxColors: value as number,
                  }))
                }
              />
              <Typography sx={{ color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>
                Use fewer colors to simplify filament swaps and multi-material
                setups.
              </Typography>
            </Stack>

            <Stack spacing={1.2}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <BlurOnRoundedIcon sx={{ color: '#0058bc', fontSize: 20 }} />
                  <Typography sx={{ color: '#111827', fontWeight: 700 }}>
                    Background remover
                  </Typography>
                </Stack>
                <Switch
                  checked={options.removeBackground}
                  disabled={submitting}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      removeBackground: event.target.checked,
                    }))
                  }
                />
              </Stack>

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography sx={{ color: '#6b7280', fontSize: 13 }}>
                  Sensitivity
                </Typography>
                <ChipLabel value={`${options.backgroundThreshold}`} />
              </Stack>
              <Slider
                disabled={submitting || !options.removeBackground}
                max={120}
                min={10}
                step={1}
                value={options.backgroundThreshold}
                onChange={(_, value) =>
                  setOptions((current) => ({
                    ...current,
                    backgroundThreshold: value as number,
                  }))
                }
              />
            </Stack>

            <Box
              sx={{
                p: 1.6,
                borderRadius: '20px',
                bgcolor: alpha('#f8f9fa', 0.94),
                border: `1px solid ${alpha('#d8e2ff', 0.74)}`,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <AutoFixHighRoundedIcon sx={{ color: '#0058bc', fontSize: 18 }} />
                <Typography sx={{ color: '#111827', fontSize: 13, fontWeight: 700 }}>
                  Estimated mapped palette
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {estimatedPalette.map((hex) => (
                  <Box
                    key={hex}
                    sx={{
                      px: 1.1,
                      py: 0.65,
                      borderRadius: '999px',
                      bgcolor: '#fff',
                      border: `1px solid ${alpha('#c1c6d7', 0.62)}`,
                      display: 'inline-flex',
                      gap: 0.7,
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor: hex,
                        border: `1px solid ${alpha('#111827', 0.2)}`,
                      }}
                    />
                    <Typography
                      sx={{ fontSize: 11, fontWeight: 700, color: '#374151' }}
                    >
                      {hex}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.4}
            justifyContent="flex-end"
          >
            <Button disabled={submitting} onClick={onCancel} sx={secondaryButtonSx}>
              Cancel
            </Button>
            <Button
              disabled={!sourceCanvas || submitting}
              onClick={() => onConfirm(options)}
              startIcon={<DownloadRoundedIcon />}
              sx={primaryButtonSx}
            >
              {submitting ? 'Applying…' : 'Apply & Continue'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Dialog>
  );
}

function ChipLabel({ value }: { value: string }) {
  return (
    <Box
      sx={{
        px: 1.3,
        py: 0.55,
        borderRadius: '999px',
        bgcolor: alpha('#edf4ff', 0.92),
        color: '#0058bc',
        fontWeight: 800,
        fontSize: 12,
      }}
    >
      {value}
    </Box>
  );
}

const primaryButtonSx = {
  minHeight: 48,
  borderRadius: '16px',
  px: 2.25,
  background: 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
  color: '#ffffff',
  fontWeight: 800,
  textTransform: 'none',
  '&:hover': {
    background: 'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
  },
};

const secondaryButtonSx = {
  minHeight: 48,
  borderRadius: '16px',
  px: 2.25,
  textTransform: 'none',
  color: '#374151',
  border: `1px solid ${alpha('#c1c6d7', 0.65)}`,
  bgcolor: '#fff',
};
