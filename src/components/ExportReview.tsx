'use client';

import { useEditorFile } from '@/components/EditorFileContext';
import { useExportReview } from '@/components/ExportReviewContext';
import PermanentDrawer from '@/components/PermanentDrawer';
import StaticPreviewCanvas from '@/components/threeJs/StaticPreviewCanvas';
import { downloadExportBlob } from '@/jobs/exportFile';
import type { ExportReviewData } from '@/utils/exportReview';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

const BRAND_TITLE = 'MakeYourCaps.com';

export default function ExportReview() {
  const router = useRouter();
  const { clearUploadedFile } = useEditorFile();
  const { clearReviewData, reviewData } = useExportReview();
  const [isDownloadModalOpen, setIsDownloadModalOpen] = React.useState(false);
  const [hasAcceptedDisclaimer, setHasAcceptedDisclaimer] = React.useState(false);

  React.useEffect(() => {
    if (!reviewData) {
      setIsDownloadModalOpen(false);
      setHasAcceptedDisclaimer(false);
    }
  }, [reviewData]);

  const handleOpenDownloadModal = React.useCallback(() => {
    if (!reviewData) {
      return;
    }

    setHasAcceptedDisclaimer(false);
    setIsDownloadModalOpen(true);
  }, [reviewData]);

  const handleCloseDownloadModal = React.useCallback(() => {
    setIsDownloadModalOpen(false);
  }, []);

  const handleConfirmDownload = React.useCallback(() => {
    if (!reviewData || !hasAcceptedDisclaimer) {
      return;
    }

    downloadExportBlob(reviewData.blob, reviewData.downloadName);
    setIsDownloadModalOpen(false);
    enqueueSnackbar('Your 3MF is ready — download started.', {
      variant: 'success',
    });
  }, [hasAcceptedDisclaimer, reviewData]);

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
      ) : (
        <EmptyReviewState onRestart={handleRestart} />
      )}
      <DownloadDisclaimerModal
        accepted={hasAcceptedDisclaimer}
        open={isDownloadModalOpen}
        onAcceptedChange={setHasAcceptedDisclaimer}
        onClose={handleCloseDownloadModal}
        onConfirm={handleConfirmDownload}
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
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setIsPreviewReady(false);
  }, [reviewData.previewObject.uuid]);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  const metricItems = [
    {
      icon: <Inventory2RoundedIcon sx={{ fontSize: 24 }} />,
      label: 'Base model',
      value: reviewData.baseModelLabel,
      meta: reviewData.variantLabel || reviewData.sourceKindLabel,
    },
    {
      icon: <DescriptionRoundedIcon sx={{ fontSize: 24 }} />,
      label: 'Source file',
      value: reviewData.sourceFileName,
      meta: reviewData.downloadName,
    },
    {
      icon: <AutoAwesomeRoundedIcon sx={{ fontSize: 24 }} />,
      label: 'Applied edits',
      value:
        reviewData.overlayCount > 0
          ? `${reviewData.overlayCount} projected overlay${reviewData.overlayCount === 1 ? '' : 's'}`
          : 'Material-only customization',
      meta: `${formatNumber(reviewData.meshCount)} printable mesh${reviewData.meshCount === 1 ? '' : 'es'}`,
    },
    {
      icon: <CategoryRoundedIcon sx={{ fontSize: 24 }} />,
      label: 'Geometry',
      value: `${formatNumber(reviewData.triangleCount)} triangles`,
      meta: `${formatBytes(reviewData.blob.size)} export package`,
    },
  ] as const;

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
          border: `1px solid ${alpha('#d8e2ff', 0.82)}`,
          boxShadow: '0 30px 90px rgba(15, 23, 42, 0.08)',
          background:
            'radial-gradient(circle at top, rgba(255,255,255,0.98) 0%, rgba(244,246,249,0.96) 46%, rgba(233,238,244,0.92) 100%)',
        }}
        aria-busy={!isPreviewReady}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 24,
            right: 24,
            zIndex: 2,
            px: 2,
            py: 1,
            borderRadius: '999px',
            bgcolor: alpha('#ffffff', 0.88),
            color: '#4b5563',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            boxShadow: '0 12px 24px rgba(15, 23, 42, 0.06)',
          }}
        >
          Generated 3MF Isometric
        </Box>

        <Box
          sx={{
            height: '100%',
            minHeight: { xs: 460, lg: 0 },
            '& canvas': {
              outline: 'none',
            },
          }}
        >
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
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.70) 0%, rgba(248,250,253,0.86) 100%)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Stack
              spacing={2}
              alignItems="center"
              sx={{
                width: 'min(100%, 360px)',
                p: { xs: 2.5, md: 3 },
                borderRadius: '28px',
                bgcolor: alpha('#ffffff', 0.9),
                border: `1px solid ${alpha('#d8e2ff', 0.9)}`,
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.08)',
                textAlign: 'center',
              }}
            >
              <CircularProgress size={34} thickness={4.6} />
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
                  Loading generated 3MF
                </Typography>
                <Typography
                  sx={{
                    mt: 0.8,
                    color: '#4b5563',
                    fontSize: 14,
                    lineHeight: 1.65,
                  }}
                >
                  Preparing the left preview panel so you can inspect the final
                  isometric result.
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{
            position: 'absolute',
            left: { xs: 18, md: 24 },
            right: { xs: 18, md: 24 },
            bottom: { xs: 18, md: 24 },
            zIndex: 2,
          }}
        >
          {[
            `${formatBytes(reviewData.blob.size)} ready package`,
            `${formatNumber(reviewData.triangleCount)} triangles`,
            `${formatNumber(reviewData.meshCount)} printable meshes`,
          ].map((label) => (
            <Box
              key={label}
              sx={{
                px: 2,
                py: 1.1,
                borderRadius: '999px',
                bgcolor: alpha('#ffffff', 0.86),
                backdropFilter: 'blur(18px)',
                border: `1px solid ${alpha('#d7def0', 0.92)}`,
                boxShadow: '0 16px 30px rgba(15, 23, 42, 0.08)',
              }}
            >
              <Typography
                sx={{
                  color: '#4b5563',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </Typography>
            </Box>
          ))}
        </Stack>
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

        <Stack spacing={1.6} sx={{ mt: 3.5 }}>
          {metricItems.map((item) => (
            <SummaryItem
              key={item.label}
              icon={item.icon}
              label={item.label}
              meta={item.meta}
              value={item.value}
            />
          ))}
        </Stack>

        <Divider sx={{ my: 3, borderColor: alpha('#cdd5e7', 0.8) }} />

        <Stack spacing={1.2} sx={{ mb: 3 }}>
          <DetailRow
            label="Generated"
            value={hasMounted ? formatDate(reviewData.generatedAt) : '—'}
          />
          <DetailRow label="Output file" value={reviewData.downloadName} />
          <DetailRow
            label="Projected overlays"
            value={String(reviewData.overlayCount)}
          />
          <DetailRow
            label="Preview geometry"
            value={formatNumber(reviewData.meshCount)}
          />
        </Stack>

        <Stack spacing={1.5}>
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

        <Chip
          icon={<CheckCircleRoundedIcon />}
          label="Geometry verified for multi-material printing"
          sx={{
            mt: 3,
            width: '100%',
            justifyContent: 'flex-start',
            minHeight: 56,
            borderRadius: '20px',
            bgcolor: alpha('#f3f7f3', 0.95),
            color: '#1f5131',
            border: `1px solid ${alpha('#c8e5d0', 0.9)}`,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.01em',
            '& .MuiChip-icon': {
              color: '#13a247',
            },
            '& .MuiChip-label': {
              display: 'block',
              whiteSpace: 'normal',
              paddingY: 1.25,
            },
          }}
        />
      </Box>
    </Box>
  );
}

function EmptyReviewState({ onRestart }: { onRestart: () => void }) {
  return (
    <Box
      component="section"
      sx={{
        height: '100%',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          width: 'min(560px, 100%)',
          px: { xs: 3, md: 5 },
          py: { xs: 4, md: 5 },
          borderRadius: { xs: '28px', md: '32px' },
          bgcolor: alpha('#ffffff', 0.94),
          border: `1px solid ${alpha('#dfe7fb', 0.9)}`,
          boxShadow: '0 28px 80px rgba(15, 23, 42, 0.08)',
          textAlign: 'center',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontSize: { xs: 30, md: 40 },
            fontWeight: 800,
            lineHeight: 0.98,
            letterSpacing: '-0.05em',
            color: '#111827',
          }}
        >
          No generated export yet.
        </Typography>
        <Typography
          sx={{
            mt: 1.75,
            color: '#4b5563',
            fontSize: { xs: 15, md: 16 },
            lineHeight: 1.7,
          }}
        >
          Return to the base step, open a model and generate its final 3MF to
          unlock this review screen.
        </Typography>
        <Button
          onClick={onRestart}
          startIcon={<RestartAltRoundedIcon />}
          sx={{
            ...panelPrimaryButtonSx,
            mt: 3,
          }}
        >
          Start a new design
        </Button>
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
      <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: { md: 560 } }}>
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
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={accepted}
                    onChange={(event) => onAcceptedChange(event.target.checked)}
                    sx={{
                      alignSelf: 'flex-start',
                      mt: 0.15,
                      color: alpha('#0058bc', 0.54),
                      '&.Mui-checked': {
                        color: '#0058bc',
                      },
                    }}
                  />
                }
                sx={{
                  alignItems: 'flex-start',
                  m: 0,
                  '& .MuiFormControlLabel-label': {
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: '#334155',
                  },
                }}
                label="By using MakeYourCaps, you acknowledge that the generated digital files (such as 3MF) are intended for personal use only and must not be shared, redistributed, or sold in any form."
              />

              <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
                We are currently working on improving compatibility of saved 3MF
                configurations with Bambu Studio, including pre-configured
                supports and pre-painted add-ons.
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
                  <Box component="li">Enabling tree supports starting at 40°</Box>
                </Stack>
              </Box>

              <Typography sx={{ fontSize: 14, lineHeight: 1.6 }}>
                We’re continuously improving the experience to make it smoother
                and more reliable.
              </Typography>
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
      </Stack>
    </Dialog>
  );
}

function SummaryItem({
  icon,
  label,
  meta,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  value: string;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          flexShrink: 0,
          width: 52,
          height: 52,
          borderRadius: '18px',
          display: 'grid',
          placeItems: 'center',
          bgcolor: alpha('#0058bc', 0.08),
          color: '#0058bc',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: '#7d8697',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            color: '#111827',
            fontSize: { xs: 18, md: 21 },
            fontWeight: 700,
            lineHeight: 1.25,
            wordBreak: 'break-word',
          }}
        >
          {value}
        </Typography>
        <Typography
          sx={{
            color: '#4b5563',
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: 'break-word',
          }}
        >
          {meta}
        </Typography>
      </Box>
    </Stack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={2} justifyContent="space-between">
      <Typography
        sx={{
          color: '#7d8697',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          color: '#111827',
          fontSize: 14,
          fontWeight: 700,
          textAlign: 'right',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </Typography>
    </Stack>
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

function formatBytes(size: number) {
  if (size === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    Math.floor(Math.log(size) / Math.log(1024)),
    units.length - 1
  );
  const value = size / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}
