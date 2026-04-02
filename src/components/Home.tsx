import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import FileDrop from './FileDrop';
import PermanentDrawer from './PermanentDrawer';

type CapOption = {
  description: string;
  eta: string;
  id: string;
  imagePath: string;
  path: string;
  subtitle: string;
  title: string;
};

const BRAND_TITLE = 'CustomCaps';
const DESIGN_COLORS = {
  accent: '#a43c12',
  background: '#f8f9fa',
  primary: '#0058bc',
  primaryContainer: '#0070eb',
  surface: '#f8f9fa',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f3f4f5',
  textBody: '#414755',
  textMuted: '#7d8697',
} as const;

export default function HomeRoute() {
  const navigate = useNavigate();
  const [selectedCapId, setSelectedCapId] = React.useState('trucker-cap');

  const capOptions = React.useMemo<CapOption[]>(
    () => [
      {
        id: 'trucker-cap',
        title: 'Trucker Cap',
        subtitle: 'Structured front, mesh airflow.',
        description:
          'Classic front panel ready for logos, text and bold multi-color graphics.',
        eta: '12–18 Hours',
        imagePath: '/caps/trucker.webp',
        path: 'examples/trucker_cap.3mf',
      },
      {
        id: 'future-cap',
        title: 'Future Cap',
        subtitle: 'Seamless, aerodynamic design.',
        description:
          'A smoother silhouette prepared for premium text placement and clean add-ons.',
        eta: '14–18 Hours',
        imagePath: '/caps/future.webp',
        path: 'examples/future_cap.3mf',
      },
      {
        id: 'bucket-hat',
        title: 'Bucket Hat',
        subtitle: 'Wide brim, parametric lattice.',
        description:
          'A wider printable canvas with wraparound customization and softer profiles.',
        eta: '16–22 Hours',
        imagePath: '/caps/bucket.webp',
        path: 'examples/bucket_hat.3mf',
      },
    ],
    []
  );

  const handleExampleSelect = (path: string) => {
    navigate('/editor?example=' + path);
  };

  const handleFileChange = (file: File) => {
    navigate('/editor', { state: { file } });
  };

  return (
    <PermanentDrawer title={BRAND_TITLE}>
      <Box
        component="section"
        sx={{
          px: { xs: 2, sm: 2.5, md: 4 },
          pt: { xs: 4, sm: 5, md: 6 },
          pb: { xs: 5, sm: 6, md: 8 },
        }}
        >
          <Stack
          alignItems="center"
          spacing={{ xs: 1.25, sm: 1.5, md: 2 }}
          sx={{ mb: { xs: 3.5, sm: 4.5, md: 7 } }}
        >
          <Typography
            sx={{
              color: DESIGN_COLORS.accent,
              fontSize: { xs: 13, sm: 14, md: 16 },
              fontWeight: 800,
              letterSpacing: { xs: '0.18em', sm: '0.22em', md: '0.28em' },
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Step 01 / 04
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Manrope", "Inter", sans-serif',
              fontSize: { xs: 30, sm: 40, md: 54, lg: 64 },
              fontWeight: 800,
              letterSpacing: '-0.05em',
              lineHeight: { xs: 0.96, md: 0.95 },
              textAlign: 'center',
              maxWidth: { xs: 340, sm: 520, md: 760, lg: 920 },
            }}
          >
            Choose your base silhouette.
          </Typography>
          <Typography
            sx={{
              color: DESIGN_COLORS.textBody,
              fontSize: { xs: 15, sm: 17, md: 20 },
              lineHeight: { xs: 1.5, md: 1.6 },
              textAlign: 'center',
              maxWidth: { xs: 340, sm: 580, md: 760 },
            }}
          >
            Select the canvas for your creation. Each silhouette is optimized
            for high-fidelity 3D printing, layered finishes and editorial-grade
            customization.
          </Typography>
        </Stack>

        <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
          {capOptions.map((option) => {
            const isSelected = option.id === selectedCapId;

            return (
              <Grid item xs={12} sm={6} lg={4} key={option.id}>
                <CapCard
                  cap={option}
                  selected={isSelected}
                  onActivate={() => setSelectedCapId(option.id)}
                  onOpen={() => handleExampleSelect(option.path)}
                />
              </Grid>
            );
          })}
        </Grid>

        <Box sx={{ mt: { xs: 3.5, sm: 4.5, md: 6 }, maxWidth: 560 }}>
          <FileDrop
            onDrop={(files) => handleFileChange(files[0])}
            sx={{
              border: 'none',
              borderRadius: { xs: '22px', md: '28px' },
              bgcolor: alpha(DESIGN_COLORS.surfaceLowest, 0.82),
              boxShadow: '0 24px 60px rgba(0, 88, 188, 0.08)',
              backdropFilter: 'blur(20px)',
              px: { xs: 2, sm: 2.5, md: 3.5 },
              py: { xs: 2, sm: 2.5, md: 3 },
            }}
          >
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={{ xs: 1.75, md: 2 }}
              alignItems={{ xs: 'stretch', md: 'center' }}
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={{ xs: 1.5, md: 2 }} alignItems="center">
                <Box
                  sx={{
                    width: { xs: 50, md: 60 },
                    height: { xs: 50, md: 60 },
                    borderRadius: { xs: '16px', md: '20px' },
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(DESIGN_COLORS.primary, 0.1),
                    color: DESIGN_COLORS.primary,
                  }}
                >
                  <CloudUploadRoundedIcon sx={{ fontSize: { xs: 24, md: 28 } }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontSize: { xs: 18, md: 22 },
                      fontWeight: 700,
                      fontFamily: '"Manrope", "Inter", sans-serif',
                    }}
                  >
                    Use your own 3MF template
                  </Typography>
                  <Typography
                    sx={{
                      color: DESIGN_COLORS.textBody,
                      fontSize: { xs: 14, md: 15 },
                      lineHeight: 1.6,
                      maxWidth: 360,
                    }}
                  >
                    Drag and drop a cap file or click here to open a local 3MF
                    without sending it to any server.
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  ...ctaButtonSx,
                  width: { xs: '100%', md: 'auto' },
                }}
              >
                Upload 3MF
              </Button>
            </Stack>
          </FileDrop>
        </Box>
      </Box>
    </PermanentDrawer>
  );
}

function CapCard({
  cap,
  selected,
  onActivate,
  onOpen,
}: {
  cap: CapOption;
  selected: boolean;
  onActivate: () => void;
  onOpen: () => void;
}) {
  return (
    <Box
      onClick={onActivate}
      sx={{
        height: '100%',
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: { xs: '26px', md: '32px' },
        bgcolor: DESIGN_COLORS.surfaceLowest,
        border: selected
          ? `2px solid ${DESIGN_COLORS.primary}`
          : `1px solid ${alpha(DESIGN_COLORS.textMuted, 0.08)}`,
        boxShadow: selected
          ? '0 26px 70px rgba(0, 88, 188, 0.10)'
          : '0 24px 60px rgba(15, 23, 42, 0.05)',
        transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 26px 70px rgba(0, 88, 188, 0.10)',
        },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          borderRadius: { xs: '22px', md: '28px' },
          overflow: 'hidden',
          bgcolor: DESIGN_COLORS.surface,
          minHeight: { xs: 220, sm: 260, md: 300 },
          px: { xs: 1.5, md: 2.5 },
          pt: { xs: 2, md: 3 },
          pb: { xs: 1.5, md: 2.5 },
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 12%, rgba(255,255,255,0.96) 0%, rgba(243,244,245,0.9) 56%, rgba(232,236,241,0.75) 100%)',
          }}
        />
        {selected && (
          <Chip
            label="Selected"
            sx={{
              position: 'absolute',
              top: { xs: 14, md: 20 },
              right: { xs: 12, md: 18 },
              bgcolor: DESIGN_COLORS.primary,
              color: '#fff',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontSize: 11,
              height: 28,
            }}
          />
        )}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <CapIllustration imagePath={cap.imagePath} title={cap.title} />
        </Box>
      </Box>

      <Typography
        sx={{
          mt: { xs: 2, md: 2.5 },
          fontFamily: '"Manrope", "Inter", sans-serif',
          fontSize: { xs: 24, sm: 28, md: 36 },
          fontWeight: 800,
          letterSpacing: '-0.05em',
          lineHeight: 1,
        }}
      >
        {cap.title}
      </Typography>
      <Typography
        sx={{
          mt: { xs: 0.75, md: 1 },
          color: DESIGN_COLORS.textBody,
          fontSize: { xs: 14.5, md: 17 },
          lineHeight: 1.5,
          minHeight: { xs: 'auto', sm: 44, md: 54 },
        }}
      >
        {cap.subtitle}
      </Typography>
      <Typography
        sx={{
          mt: { xs: 1.25, md: 1.5 },
          color: DESIGN_COLORS.textMuted,
          fontSize: { xs: 14, md: 15 },
          lineHeight: 1.65,
          minHeight: { xs: 'auto', sm: 70, md: 78 },
        }}
      >
        {cap.description}
      </Typography>

      {selected ? (
        <>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ mt: { xs: 2, md: 2.5 }, flexWrap: 'wrap' }}
          >
            <ModePill label="Rigid Back (PLA)" active />
            <ModePill label="Flexible Back (TPU)" />
          </Stack>

          <Button
            fullWidth
            variant="contained"
            endIcon={<ArrowForwardRoundedIcon />}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            sx={{
              ...ctaButtonSx,
              mt: { xs: 2.25, md: 2.75 },
              py: { xs: 1.2, md: 1.6 },
            }}
          >
            Next: Customize
          </Button>
        </>
      ) : (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'stretch', sm: 'center' }}
          justifyContent="space-between"
          spacing={{ xs: 1.5, sm: 2 }}
          sx={{ mt: { xs: 2, md: 2.75 } }}
        >
          <Box>
            <Typography
              sx={{
                color: DESIGN_COLORS.textMuted,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              Est. production
            </Typography>
            <Typography
              sx={{
                color: DESIGN_COLORS.primary,
                fontSize: { xs: 22, md: 26 },
                fontWeight: 700,
                letterSpacing: '-0.03em',
              }}
            >
              {cap.eta}
            </Typography>
          </Box>

          <Button
            variant="contained"
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
            sx={{
              minWidth: { xs: '100%', sm: 160, md: 188 },
              py: { xs: 1.15, md: 1.45 },
              px: { xs: 2, md: 3 },
              borderRadius: '999px',
              bgcolor: DESIGN_COLORS.surfaceLow,
              color: '#1f2937',
              boxShadow: 'none',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: { xs: 16, md: 18 },
              '&:hover': {
                bgcolor: alpha(DESIGN_COLORS.primary, 0.12),
                boxShadow: 'none',
              },
            }}
          >
            Select Base
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function ModePill({
  active,
  label,
}: {
  active?: boolean;
  label: string;
}) {
  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2.1 },
        py: { xs: 0.85, md: 1.1 },
        borderRadius: '999px',
        bgcolor: active ? alpha(DESIGN_COLORS.primary, 0.1) : DESIGN_COLORS.surfaceLow,
        color: active ? DESIGN_COLORS.primary : DESIGN_COLORS.textBody,
        fontSize: { xs: 13, md: 15 },
        fontWeight: 700,
      }}
    >
      {label}
    </Box>
  );
}

function CapIllustration({
  imagePath,
  title,
}: {
  imagePath: string;
  title: string;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        height: { xs: 180, sm: 210, md: 250 },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box
        component="img"
        src={imagePath}
        alt={title}
        loading="lazy"
        decoding="async"
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          userSelect: 'none',
          WebkitUserDrag: 'none',
          filter: 'drop-shadow(0 20px 26px rgba(15, 23, 42, 0.14))',
        }}
      />
    </Box>
  );
}

const ctaButtonSx = {
  borderRadius: '999px',
  px: { xs: 2.25, sm: 2.75, md: 3 },
  py: { xs: 1.05, sm: 1.2, md: 1.35 },
  background: `linear-gradient(135deg, ${DESIGN_COLORS.primary} 0%, ${DESIGN_COLORS.primaryContainer} 100%)`,
  color: '#fff',
  fontSize: { xs: 15, sm: 16, md: 18 },
  fontWeight: 700,
  textTransform: 'none',
  minHeight: { xs: 46, md: 54 },
  whiteSpace: 'nowrap',
  boxShadow: '0 18px 40px rgba(0, 88, 188, 0.14)',
  '&:hover': {
    background: `linear-gradient(135deg, ${DESIGN_COLORS.primary} 0%, ${DESIGN_COLORS.primaryContainer} 100%)`,
    boxShadow: '0 20px 44px rgba(0, 88, 188, 0.18)',
  },
} as const;
