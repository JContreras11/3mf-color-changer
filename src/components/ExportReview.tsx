'use client';

import { useEditorFile } from '@/components/EditorFileContext';
import { useExportReview } from '@/components/ExportReviewContext';
import PermanentDrawer from '@/components/PermanentDrawer';
import StaticPreviewCanvas from '@/components/threeJs/StaticPreviewCanvas';
import { downloadExportBlob } from '@/jobs/exportFile';
import type { ExportReviewData } from '@/utils/exportReview';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

// [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
// Referencia para reversión: Remove these imports.
import NativeExportModal from '@/components/NativeExportModal';
import { useDynamicExport } from '@/utils/exportConfig';
import { downloadOriginal3mf } from '@/utils/nativeExportBridge';

const BRAND_TITLE = 'MakeYourCaps.com';

export default function ExportReview() {
  const router = useRouter();
  const { clearUploadedFile } = useEditorFile();
  const { clearReviewData, reviewData } = useExportReview();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = React.useState(false);

  // [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
  // State for the native export bridge modal.
  // Referencia para reversión: Remove these three states and the NativeExportModal below.
  const [isNativeModalOpen, setIsNativeModalOpen] = React.useState(false);
  const [isNativeDownloading, setIsNativeDownloading] = React.useState(false);

  React.useEffect(() => {
    if (!reviewData) {
      setIsDownloadModalOpen(false);
      setHasAcceptedDisclaimer(false);
      // [TEMPORAL] bridge cleanup
      setIsNativeModalOpen(false);
      setIsNativeDownloading(false);
      router.push('/');
    }
  }, [reviewData, router]);

  const handleOpenDownloadModal = React.useCallback(() => {
    if (!reviewData) {
      return;
    }

    // [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
    // When bridge mode is active and a native path exists, open the
    // project-name modal instead of the disclaimer modal.
    // Referencia para reversión: Remove this conditional block.
    if (!useDynamicExport && reviewData.nativeBridgePath) {
      setIsNativeModalOpen(true);
      return;
    }

    setHasAcceptedDisclaimer(false);
    setIsDownloadModalOpen(true);
  }, [reviewData]);

  const handleCloseDownloadModal = React.useCallback(() => {
    setIsDownloadModalOpen(false);
  }, []);

  const handleConfirmDownload = React.useCallback(async () => {
    if (!reviewData || !hasAcceptedDisclaimer) {
      return;
    }

    downloadExportBlob(reviewData.blob, reviewData.downloadName);
    setIsDownloadModalOpen(false);
    enqueueSnackbar('Your 3MF is ready — download started.', {
      variant: 'success',
    });
  }, [hasAcceptedDisclaimer, reviewData]);

  // [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF)
  // Downloads the original .3mf file with user-supplied project name.
  // Referencia para reversión: Remove this entire handler.
  const handleNativeDownload = React.useCallback(
    async (projectName: string) => {
      if (!reviewData?.blob) {
        return;
      }

      setIsNativeDownloading(true);

      try {
        await downloadOriginal3mf(reviewData.blob, projectName);
        setIsNativeModalOpen(false);
        enqueueSnackbar(
          'Your original Bambu Studio .3MF is ready — download started.',
          { variant: 'success' }
        );
      } catch (error) {
        enqueueSnackbar(
          error instanceof Error ? error.message : String(error),
          { variant: 'error' }
        );
      } finally {
        setIsNativeDownloading(false);
      }
    },
    [reviewData]
  );

  const handleRestart = React.useCallback(() => {
    clearReviewData();
    clearUploadedFile();
    router.push('/');
  }, [clearReviewData, clearUploadedFile, router]);

  const exportAction = (
    <Button
      disabled={!reviewData}
      onClick={handleOpenDownloadModal}
      startIcon={<DownloadRoundedIcon />}
      sx={headerActionSx}
    >
      Download .3MF
    </Button>
  );

  return (
    <PermanentDrawer title={BRAND_TITLE} action={exportAction}>
      {reviewData ? (
        <ReviewLayout
          reviewData={reviewData}
          onDownload={handleOpenDownloadModal}
          onRestart={handleRestart}
        />
      ) : null}
      <DownloadDisclaimerModal
        accepted={hasAcceptedDisclaimer}
        open={isDownloadModalOpen}
        onAcceptedChange={setHasAcceptedDisclaimer}
        onClose={handleCloseDownloadModal}
        onConfirm={handleConfirmDownload}
      />
      {/* [TEMPORAL] - Modo de Compatibilidad Nativa (Original .3MF) */}
      {/* Referencia para reversión: Remove this NativeExportModal block. */}
      <NativeExportModal
        isDownloading={isNativeDownloading}
        open={isNativeModalOpen}
        onClose={() => setIsNativeModalOpen(false)}
        onDownload={handleNativeDownload}
      />
    </PermanentDrawer>
  );
}

function ReviewLayout({
  reviewData,
  onDownload,
  onRestart,
}: {
  reviewData: ExportReviewData;
  onDownload: () => void;
  onRestart: () => void;
}) {
  const [isPreviewReady, setIsPreviewReady] = React.useState(false);

  React.useEffect(() => {
    setIsPreviewReady(false);
  }, [reviewData.previewObject.uuid]);

  return (
    <Box
      component="section"
      sx={{
        height: '100%',
        p: { xs: 2, md: 3 },
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: 'minmax(0, 1fr) 400px',
          xl: 'minmax(0, 1fr) 430px',
        },
        gap: { xs: 2, md: 3 },
        overflow: 'auto',
      }}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 460, lg: 0 },
          overflow: 'hidden',
          borderRadius: { xs: '32px', md: '40px' },
          border: 'none',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.35)',
          background: '#bdbdbd',
        }}
        aria-busy={!isPreviewReady}
      >
        {/* Eliminado: 3MF Preview Badge */}

        <Box
          sx={{
            height: '100%',
            minHeight: { xs: 460, lg: 0 },
            '& canvas': {
              outline: 'none',
            },
            }}
        >
          {/* Usamos el Canvas real para que refleje los colores exactos */}
          <StaticPreviewCanvas
            geometry={reviewData.previewObject}
            onReady={() => setIsPreviewReady(true)}
          />
        </Box>

        {!isPreviewReady && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 3,
              display: 'grid',
              placeItems: 'center',
              px: 3,
              background: alpha('#f8fafc', 0.4),
              backdropFilter: 'blur(18px)',
            }}
          >
            <Stack
              spacing={2}
              alignItems="center"
              sx={{
                width: 'min(100%, 360px)',
                p: { xs: 2.5, md: 3 },
                borderRadius: '28px',
                bgcolor: alpha('#ffffff', 0.75),
                border: 'none',
                boxShadow: '0 32px 80px rgba(0, 0, 0, 0.14)',
                textAlign: 'center',
              }}
            >
              <CircularProgress size={34} thickness={4.6} sx={{ color: '#0058bc' }} />
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Manrope", "Inter", sans-serif',
                    fontWeight: 800,
                    fontSize: { xs: 16, md: 18 },
                    color: '#111827',
                    letterSpacing: '-0.03em',
                  }}
                >
                  Loading 3MF preview
                </Typography>
                <Typography
                  sx={{
                    mt: 0.8,
                    color: '#4b5563',
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  Preparing the preview panel so you can inspect the final
                  isometric result.
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Eliminado: Bloque de métricas técnicas (pills inferiores) */}
      </Box>

      <Box
        sx={{
          minWidth: 0,
          borderRadius: { xs: '28px', md: '36px' },
          bgcolor: alpha('#ffffff', 0.92),
          border: `1px solid ${alpha('#dfe7fb', 0.88)}`,
          boxShadow: '0 28px 70px rgba(15, 23, 42, 0.07)',
          px: { xs: 2.5, md: 4 },
          py: { xs: 2.5, md: 4 },
          alignSelf: { lg: 'start' },
        }}
      >
        <Typography
          sx={{
            color: '#a43c12',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
          }}
        >
          Configuration finalized
        </Typography>
        <Typography
          sx={{
            mt: 1.2,
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontSize: { xs: 34, md: 44 },
            lineHeight: 0.96,
            letterSpacing: '-0.05em',
            fontWeight: 800,
            color: '#111827',
          }}
        >
          Export Review
        </Typography>
        <Typography
          sx={{
            mt: 1.5,
            color: '#4b5563',
            fontSize: { xs: 15, md: 16 },
            lineHeight: 1.7,
          }}
        >
          Your cap has been baked into a ready-to-print 3MF package. Review the
          geometry snapshot, confirm the final details and download the file
          when you are ready.
        </Typography>

        <Stack spacing={1.5} sx={{ mt: 3 }}>
          <Button
            onClick={onDownload}
            startIcon={<DownloadRoundedIcon />}
            sx={panelPrimaryButtonSx}
          >
            Download .3MF
          </Button>
          <Button
            onClick={onRestart}
            startIcon={<RestartAltRoundedIcon />}
            sx={panelSecondaryButtonSx}
          >
            Start over
          </Button>
        </Stack>

      </Box>
    </Box>
  );
}

function DownloadDisclaimerModal({
  accepted,
  open,
  onAcceptedChange,
  onClose,
  onConfirm,
}: {
  accepted: boolean;
  open: boolean;
  onAcceptedChange: (value: boolean) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
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
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Box>
            <Typography
              sx={{
                color: '#a43c12',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
              }}
            >
              Important Notice
            </Typography>
            <Typography
              sx={{
                mt: 0.9,
                fontFamily: '"Manrope", "Inter", sans-serif',
                fontSize: { xs: 28, md: 34 },
                lineHeight: 1,
                letterSpacing: '-0.05em',
                fontWeight: 800,
                color: '#111827',
              }}
            >
              Please confirm before downloading
            </Typography>

            <Stack spacing={1.5} sx={{ mt: 2, color: '#4b5563' }}>
              <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
                This exporter keeps the original 3MF package structure when no
                projected overlays are added, preserving existing metadata and
                slicer assets.
              </Typography>

              <Box>
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#111827',
                    mb: 0.8,
                  }}
                >
                  In the meantime, we recommend:
                </Typography>
                <Stack
                  component="ul"
                  spacing={1}
                  sx={{
                    m: 0,
                    pl: 2.6,
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#334155',
                  }}
                >
                  <Box component="li">
                    Reducing the color matcher to 4–16 colors (depending on your
                    printer or preference)
                  </Box>
                  <Box component="li">
                    Keeping cap and add-on as separate parts inside Bambu Studio
                  </Box>
                  <Box component="li">Enabling tree supports starting at 40°</Box>
                </Stack>
              </Box>

              <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
                We’re continuously improving the experience to make it smoother
                and more reliable.
              </Typography>


              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.2,
                }}
              >
                <Checkbox
                  size="small"
                  checked={accepted}
                  onChange={(event) => onAcceptedChange(event.target.checked)}
                  inputProps={{
                    'aria-label': 'Acknowledge personal-use-only export terms',
                  }}
                  sx={{
                    mt: 0.15,
                    p: 0.25,
                    color: alpha('#0058bc', 0.54),
                    '&.Mui-checked': {
                      color: '#0058bc',
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#334155',
                  }}
                >
                  By using MakeYourCaps, you acknowledge that the generated
                  digital files (such as 3MF) are intended for personal use
                  only and must not be shared, redistributed, or sold in any
                  form.
                </Typography>
              </Box>

            </Stack>
          </Box>

          <Stack
            direction={{ xs: 'column-reverse', sm: 'row' }}
            spacing={1.4}
            justifyContent="flex-end"
          >
            <Button onClick={onClose} sx={modalSecondaryButtonSx}>
              Cancel
            </Button>
            <Button
              disabled={!accepted}
              onClick={onConfirm}
              startIcon={<DownloadRoundedIcon />}
              sx={modalPrimaryButtonSx}
            >
              Download .3MF
            </Button>
          </Stack>
      </Box>
    </Dialog>
  );
}

const headerActionSx = {
  px: { xs: 2.75, md: 3.5 },
  py: 1.35,
  borderRadius: '999px',
  background: 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
  color: '#ffffff',
  fontFamily: '"Manrope", "Inter", sans-serif',
  fontSize: { xs: 14, md: 15 },
  fontWeight: 800,
  letterSpacing: '-0.02em',
  textTransform: 'none',
  boxShadow: '0 16px 28px rgba(0, 88, 188, 0.22)',
  '&:hover': {
    background: 'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
  },
};

const panelPrimaryButtonSx = {
  minHeight: 62,
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
};

const panelSecondaryButtonSx = {
  minHeight: 58,
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

const modalPrimaryButtonSx = {
  ...panelPrimaryButtonSx,
  minHeight: 58,
  px: 3,
  '&.Mui-disabled': {
    color: alpha('#ffffff', 0.78),
    background: alpha('#8fb3e6', 0.92),
  },
};

const modalSecondaryButtonSx = {
  ...panelSecondaryButtonSx,
  minHeight: 58,
  px: 3,
};

