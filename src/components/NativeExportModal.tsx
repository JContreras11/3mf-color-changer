// [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
// Este componente es momentáneo para asegurar la fidelidad en Bambu Studio.
// Referencia para reversión: Eliminar este archivo y las referencias en ExportReview.tsx.

'use client';

import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CapstoneIcon from '@mui/icons-material/SportsBaseballRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import React from 'react';

type Props = {
  isDownloading: boolean;
  open: boolean;
  onClose: () => void;
  onDownload: (projectName: string) => void;
};

export default function NativeExportModal({
  isDownloading,
  open,
  onClose,
  onDownload,
}: Props) {
  const [projectName, setProjectName] = React.useState('');
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] =
    React.useState(false);

  React.useEffect(() => {
    if (open) {
      setProjectName('');
      setHasAcceptedDisclaimer(false);
    }
  }, [open]);

  const canDownload =
    projectName.trim().length > 0 && hasAcceptedDisclaimer && !isDownloading;

  const handleSubmit = React.useCallback(() => {
    if (!canDownload) {
      return;
    }

    onDownload(projectName.trim());
  }, [canDownload, onDownload, projectName]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && canDownload) {
        handleSubmit();
      }
    },
    [canDownload, handleSubmit]
  );

  return (
    <Dialog
      open={open}
      onClose={isDownloading ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      slotProps={{
        paper: {
          sx: {
            borderRadius: { xs: '28px', md: '34px' },
            overflow: 'hidden',
            bgcolor: alpha('#fdfefe', 0.98),
            boxShadow: '0 30px 90px rgba(15, 23, 42, 0.18)',
            border: `1px solid ${alpha('#d9e4fb', 0.92)}`,
          },
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ minHeight: { md: 560 } }}
      >
        {/* ── Left panel: Visual preview ─────────────────────────────── */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: '100%', md: '50%' },
            minHeight: { xs: 280, sm: 340, md: 'auto' },
            p: { xs: 2.5, md: 2.75 },
            background:
              'radial-gradient(circle at top left, rgba(15,111,227,0.18) 0%, rgba(255,255,255,0.94) 46%, rgba(237,244,255,0.94) 100%)',
            borderRight: {
              md: `1px solid ${alpha('#d9e4fb', 0.92)}`,
            },
            borderBottom: {
              xs: `1px solid ${alpha('#d9e4fb', 0.92)}`,
              md: 'none',
            },
          }}
        >
          <Box
            sx={{
              display: 'inline-flex',
              px: 1.5,
              py: 0.8,
              borderRadius: '999px',
              bgcolor: alpha('#ffffff', 0.84),
              color: '#0058bc',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              boxShadow: '0 12px 28px rgba(0, 88, 188, 0.12)',
            }}
          >
            Setup help
          </Box>

          <Box
            sx={{
              mt: 1.6,
              borderRadius: '24px',
              overflow: 'hidden',
              border: `1px solid ${alpha('#d8e2ff', 0.92)}`,
              boxShadow: '0 22px 50px rgba(15, 23, 42, 0.1)',
              bgcolor: '#ffffff',
            }}
          >
            <Box
              component="img"
              src="/help.gif"
              alt="Bambu Studio setup recommendations preview"
              sx={{
                display: 'block',
                width: '100%',
                height: '100%',
                minHeight: { xs: 220, md: 540 },
                objectFit: 'cover',
              }}
            />
          </Box>
        </Box>

        {/* ── Right panel: Project name + disclaimer ─────────────────── */}
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
          <Box>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.8,
                px: 1.5,
                py: 0.6,
                borderRadius: '999px',
                bgcolor: alpha('#0058bc', 0.08),
                color: '#0058bc',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              <CapstoneIcon sx={{ fontSize: 16 }} />
              Make your caps
            </Box>

            <Typography
              sx={{
                mt: 1.2,
                fontFamily: '"Manrope", "Inter", sans-serif',
                fontSize: { xs: 28, md: 34 },
                lineHeight: 1,
                letterSpacing: '-0.05em',
                fontWeight: 800,
                color: '#111827',
              }}
            >
              Name your project
            </Typography>

            <Typography
              sx={{
                mt: 1.2,
                color: '#4b5563',
                fontSize: { xs: 14, md: 15 },
                lineHeight: 1.65,
              }}
            >
              This will download the original Bambu Studio–ready .3MF file with
              all slicer configurations intact — supports, bed layout, and
              filament assignments are fully preserved.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              label="Project Name"
              placeholder="e.g. My Trucker Cap — Summer Edition"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isDownloading}
              sx={{
                mt: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '18px',
                  minHeight: 68,
                  fontFamily: '"Manrope", "Inter", sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  '& fieldset': {
                    borderColor: alpha('#b8c5e3', 0.7),
                    borderWidth: 1.5,
                  },
                  '&:hover fieldset': {
                    borderColor: alpha('#0058bc', 0.4),
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#0058bc',
                    borderWidth: 2,
                  },
                },
                '& .MuiInputBase-input': {
                   paddingY: 2.2,
                },
                '& .MuiInputLabel-root': {
                  fontFamily: '"Manrope", "Inter", sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                },
              }}
            />

            <Stack spacing={1.5} sx={{ mt: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={hasAcceptedDisclaimer}
                    onChange={(event) =>
                      setHasAcceptedDisclaimer(event.target.checked)
                    }
                    disabled={isDownloading}
                    sx={{
                      p: 0.5,
                      mr: 0.5,
                      color: alpha('#0058bc', 0.54),
                      '&.Mui-checked': {
                        color: '#0058bc',
                      },
                    }}
                  />
                }
                label={
                  <Typography
                    sx={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: '#334155',
                      userSelect: 'none',
                    }}
                  >
                    By using MakeYourCaps, you acknowledge that the generated
                    digital files (such as 3MF) are intended for personal use
                    only and must not be shared, redistributed, or sold in any
                    form.
                  </Typography>
                }
                sx={{
                  alignItems: 'flex-start',
                  ml: -0.5,
                  mr: 0,
                }}
              />
            </Stack>
          </Box>

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.4}
            justifyContent="flex-end"
          >
            <Button
              onClick={onClose}
              disabled={isDownloading}
              sx={modalSecondaryButtonSx}
            >
              Cancel
            </Button>
            <Button
              disabled={!canDownload}
              onClick={handleSubmit}
              startIcon={
                isDownloading ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <DownloadRoundedIcon />
                )
              }
              sx={modalPrimaryButtonSx}
            >
              {isDownloading ? 'Preparing…' : 'Download .3MF'}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Style tokens (mirror ExportReview's button styles for visual consistency)
// ─────────────────────────────────────────────────────────────────────────────

const modalPrimaryButtonSx = {
  minHeight: 58,
  px: 3,
  borderRadius: '22px',
  background: 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
  color: '#ffffff',
  fontFamily: '"Manrope", "Inter", sans-serif',
  fontSize: { xs: 16, md: 18 },
  fontWeight: 800,
  letterSpacing: '-0.03em',
  textTransform: 'none',
  boxShadow: '0 16px 28px rgba(0, 88, 188, 0.18)',
  '&:hover': {
    background: 'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
  },
  '&.Mui-disabled': {
    color: alpha('#ffffff', 0.78),
    background: alpha('#8fb3e6', 0.92),
  },
};

const modalSecondaryButtonSx = {
  minHeight: 58,
  px: 3,
  borderRadius: '22px',
  border: `1px solid ${alpha('#b8c5e3', 0.9)}`,
  background: alpha('#ffffff', 0.82),
  color: '#1f2937',
  fontFamily: '"Manrope", "Inter", sans-serif',
  fontSize: { xs: 15, md: 17 },
  fontWeight: 700,
  letterSpacing: '-0.02em',
  textTransform: 'none',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.04)',
  '&:hover': {
    background: alpha('#ffffff', 0.98),
    borderColor: alpha('#8ea7d9', 0.95),
  },
};
