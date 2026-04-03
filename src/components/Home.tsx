'use client';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

import { useAuth } from './AuthContext';
import { useEditorFile } from './EditorFileContext';
import { useExportReview } from './ExportReviewContext';
import LoginDialog from './LoginDialog';
import PermanentDrawer from './PermanentDrawer';

type CapOption = {
  description: string;
  disabled?: boolean;
  disabledLabel?: string;
  eta: string;
  id: string;
  imagePath: string;
  path: string;
  subtitle: string;
  title: string;
};

const BRAND_TITLE = 'Customize your caps';
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
const DEFAULT_LOGIN_DESCRIPTION =
  'Use your authorized studio credentials to unlock the Trucker Cap workflow and the rest of the app.';

export default function HomeRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    logout,
    username,
  } = useAuth();
  const { clearUploadedFile } = useEditorFile();
  const { clearReviewData } = useExportReview();
  const [selectedCapId, setSelectedCapId] = React.useState('trucker-cap');
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const [loginDescription, setLoginDescription] = React.useState(
    DEFAULT_LOGIN_DESCRIPTION
  );
  const [loginTitle, setLoginTitle] = React.useState('Studio Login');
  const [pendingRouteAfterLogin, setPendingRouteAfterLogin] = React.useState<
    string | null
  >(null);
  const autoOpenedAuthGateRef = React.useRef(false);
  const authRequired = searchParams.get('auth') === 'required';
  const redirectAfterLogin = searchParams.get('next');

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
        disabled: true,
        disabledLabel: 'Disabled',
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
        disabled: true,
        disabledLabel: 'Disabled',
        eta: '16–22 Hours',
        imagePath: '/caps/bucket.webp',
        path: 'examples/bucket_hat.3mf',
      },
    ],
    []
  );

  const openLoginDialog = React.useCallback(
    ({
      description = DEFAULT_LOGIN_DESCRIPTION,
      route = null,
      title = 'Studio Login',
    }: {
      description?: string;
      route?: string | null;
      title?: string;
    }) => {
      setPendingRouteAfterLogin(route);
      setLoginTitle(title);
      setLoginDescription(description);
      setIsLoginOpen(true);
    },
    []
  );

  React.useEffect(() => {
    if (!authRequired) {
      autoOpenedAuthGateRef.current = false;
      return;
    }

    if (autoOpenedAuthGateRef.current || isAuthLoading || isAuthenticated) {
      return;
    }

    autoOpenedAuthGateRef.current = true;
    openLoginDialog({
      description:
        'You need to sign in before accessing the protected editor and export workspace.',
      route: redirectAfterLogin,
      title: 'Studio Login Required',
    });
  }, [
    authRequired,
    isAuthenticated,
    isAuthLoading,
    openLoginDialog,
    redirectAfterLogin,
  ]);

  const getEditorRoute = React.useCallback((path: string) => {
    return '/editor?example=' + encodeURIComponent(path);
  }, []);

  const handleExampleSelect = React.useCallback(
    (path: string) => {
      clearReviewData();
      clearUploadedFile();
      router.push(getEditorRoute(path));
    },
    [clearReviewData, clearUploadedFile, getEditorRoute, router]
  );

  const handleCapActivate = React.useCallback(
    (cap: CapOption) => {
      if (cap.disabled || isAuthLoading) {
        return;
      }

      setSelectedCapId(cap.id);

      if (!isAuthenticated) {
        openLoginDialog({
          description: `Sign in to unlock ${cap.title} and continue into the protected customization workspace.`,
          route: getEditorRoute(cap.path),
          title: 'Unlock Trucker Cap',
        });
      }
    },
    [getEditorRoute, isAuthLoading, isAuthenticated, openLoginDialog]
  );

  const handleCapOpen = React.useCallback(
    (cap: CapOption) => {
      if (cap.disabled || isAuthLoading) {
        return;
      }

      if (!isAuthenticated) {
        openLoginDialog({
          description: `Sign in to open ${cap.title} in the protected editor.`,
          route: getEditorRoute(cap.path),
          title: 'Studio Login',
        });
        return;
      }

      handleExampleSelect(cap.path);
    },
    [
      getEditorRoute,
      handleExampleSelect,
      isAuthLoading,
      isAuthenticated,
      openLoginDialog,
    ]
  );

  const handleLoginAuthenticated = React.useCallback(() => {
    setIsLoginOpen(false);

    if (pendingRouteAfterLogin) {
      const nextRoute = pendingRouteAfterLogin;
      setPendingRouteAfterLogin(null);
      router.push(nextRoute);
      return;
    }

    enqueueSnackbar('Access unlocked. Trucker Cap is now available.', {
      variant: 'success',
    });
  }, [pendingRouteAfterLogin, router]);

  const handleLogout = React.useCallback(async () => {
    await logout();
    clearUploadedFile();
    clearReviewData();
    setPendingRouteAfterLogin(null);
    setIsLoginOpen(false);
    enqueueSnackbar('Session closed. Login is required to use the app again.', {
      variant: 'info',
    });
    router.replace('/');
  }, [clearReviewData, clearUploadedFile, logout, router]);

  const headerAction = isAuthLoading ? (
    <Button
      disabled
      startIcon={<CircularProgress size={16} color="inherit" />}
      sx={headerGhostButtonSx}
    >
      Checking access
    </Button>
  ) : isAuthenticated ? (
    <Button
      onClick={handleLogout}
      startIcon={<LogoutRoundedIcon />}
      sx={headerGhostButtonSx}
    >
      {username ? `Logout · ${username}` : 'Logout'}
    </Button>
  ) : (
    <Button
      onClick={() =>
        openLoginDialog({
          description:
            'Sign in with your enabled studio credentials to access Trucker Cap and private uploads.',
        })
      }
      startIcon={<LockRoundedIcon />}
      sx={headerGhostButtonSx}
    >
      Studio Login
    </Button>
  );

  return (
    <>
      <PermanentDrawer title={BRAND_TITLE} action={headerAction}>
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
                fontFamily: '"Manrope", "Inter", sans-serif',
                fontSize: { xs: 30, sm: 40, md: 54, lg: 64 },
                fontWeight: 800,
                letterSpacing: '-0.05em',
                lineHeight: { xs: 0.96, md: 0.95 },
                textAlign: 'center',
                maxWidth: { xs: 340, sm: 520, md: 760, lg: 920 },
              }}
            >
              Choose your base
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
              Only the enabled Trucker Cap workflow is currently available. Sign
              in with studio credentials to unlock the editor, export review and
              private 3MF uploads.
            </Typography>
            <Chip
              icon={
                isAuthLoading ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <LockRoundedIcon />
                )
              }
              label={
                isAuthLoading
                  ? 'Checking studio access'
                  : isAuthenticated
                    ? `Access unlocked for ${username || 'studio user'}`
                    : 'Protected studio access required'
              }
              sx={{
                mt: 1,
                minHeight: 42,
                px: 1,
                borderRadius: '999px',
                bgcolor: isAuthenticated
                  ? alpha('#13a247', 0.1)
                  : alpha('#0058bc', 0.08),
                color: isAuthenticated ? '#1f5131' : '#0058bc',
                fontWeight: 700,
                '& .MuiChip-icon': {
                  color: 'inherit',
                },
              }}
            />
          </Stack>

          <Grid container spacing={{ xs: 2, sm: 2.5, md: 3 }}>
            {capOptions.map((option) => {
              const isSelected = option.id === selectedCapId;

              return (
                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={option.id}>
                  <CapCard
                    cap={option}
                    loadingAccess={isAuthLoading}
                    onActivate={() => handleCapActivate(option)}
                    onOpen={() => handleCapOpen(option)}
                    protectedLocked={
                      !option.disabled && !isAuthenticated && !isAuthLoading
                    }
                    selected={isSelected}
                  />
                </Grid>
              );
            })}
          </Grid>

          {/* <Box sx={{ mt: { xs: 3.5, sm: 4.5, md: 6 }, maxWidth: 560}}>
            <FileDrop
              disabled={!isAuthenticated || isAuthLoading}
              onDisabledClick={handleUploadLocked}
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
                <Stack
                  direction="row"
                  spacing={{ xs: 1.5, md: 2 }}
                  alignItems="center"
                >
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
                    <CloudUploadRoundedIcon
                      sx={{ fontSize: { xs: 24, md: 28 } }}
                    />
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
                      {isAuthenticated
                        ? 'Drag and drop a cap file or click here to open a local 3MF without sending it to any server.'
                        : 'Private 3MF uploads stay locked until you sign in with an enabled studio account.'}
                    </Typography>
                  </Box>
                </Stack>

                <Button
                  variant="contained"
                  disabled={!isAuthenticated || isAuthLoading}
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    ...ctaButtonSx,
                    width: { xs: '100%', md: 'auto' },
                  }}
                >
                  {isAuthenticated ? 'Upload 3MF' : 'Login required'}
                </Button>
              </Stack>
            </FileDrop>
          </Box> */}
        </Box>
      </PermanentDrawer>

      <LoginDialog
        description={loginDescription}
        onAuthenticated={handleLoginAuthenticated}
        onClose={() => setIsLoginOpen(false)}
        open={isLoginOpen}
        title={loginTitle}
      />
    </>
  );
}

function CapCard({
  cap,
  loadingAccess,
  onActivate,
  onOpen,
  protectedLocked,
  selected,
}: {
  cap: CapOption;
  loadingAccess: boolean;
  onActivate: () => void;
  onOpen: () => void;
  protectedLocked: boolean;
  selected: boolean;
}) {
  const disabled = !!cap.disabled;
  const accessGranted = !protectedLocked && !loadingAccess;
  const statusLabel = disabled
    ? cap.disabledLabel || 'Disabled'
    : protectedLocked
      ? 'Login required'
      : selected
        ? 'Selected'
        : null;
  const primaryButtonLabel = disabled
    ? 'Unavailable'
    : selected
      ? accessGranted
        ? 'Next: Customize'
        : loadingAccess
          ? 'Checking access...'
          : 'Unlock Trucker Cap'
      : accessGranted
        ? 'Select Base'
        : loadingAccess
          ? 'Checking access...'
          : 'Login to continue';

  const handleCardClick = () => {
    if (disabled) {
      return;
    }

    onActivate();
  };

  return (
    <Box
      onClick={handleCardClick}
      sx={{
        height: '100%',
        p: { xs: 2, sm: 2.5, md: 3 },
        borderRadius: { xs: '26px', md: '32px' },
        bgcolor: DESIGN_COLORS.surfaceLowest,
        border:
          selected && !disabled
            ? `2px solid ${DESIGN_COLORS.primary}`
            : `1px solid ${alpha(DESIGN_COLORS.textMuted, 0.08)}`,
        boxShadow:
          selected && !disabled
            ? '0 26px 70px rgba(0, 88, 188, 0.10)'
            : '0 24px 60px rgba(15, 23, 42, 0.05)',
        transition:
          'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.56 : 1,
        '&:hover': disabled
          ? undefined
          : {
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
        {statusLabel && (
          <Chip
            label={statusLabel}
            sx={{
              position: 'absolute',
              top: { xs: 14, md: 20 },
              right: { xs: 12, md: 18 },
              bgcolor: disabled
                ? alpha('#111827', 0.12)
                : protectedLocked
                  ? alpha('#0058bc', 0.12)
                  : DESIGN_COLORS.primary,
              color: disabled
                ? '#4b5563'
                : protectedLocked
                  ? DESIGN_COLORS.primary
                  : '#fff',
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
            disabled={disabled || loadingAccess}
            endIcon={
              loadingAccess ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <ArrowForwardRoundedIcon />
              )
            }
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) {
                return;
              }
              onOpen();
            }}
            sx={{
              ...ctaButtonSx,
              mt: { xs: 2.25, md: 2.75 },
              py: { xs: 1.2, md: 1.6 },
            }}
          >
            {primaryButtonLabel}
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
            disabled={disabled || loadingAccess}
            onClick={(event) => {
              event.stopPropagation();
              if (disabled) {
                return;
              }
              onOpen();
            }}
            sx={{
              minWidth: { xs: '100%', sm: 160, md: 188 },
              py: { xs: 1.15, md: 1.45 },
              px: { xs: 2, md: 3 },
              borderRadius: '999px',
              bgcolor: disabled
                ? alpha(DESIGN_COLORS.textMuted, 0.12)
                : DESIGN_COLORS.surfaceLow,
              color: disabled ? DESIGN_COLORS.textMuted : '#1f2937',
              boxShadow: 'none',
              fontWeight: 700,
              textTransform: 'none',
              fontSize: { xs: 16, md: 18 },
              '&:hover': disabled
                ? undefined
                : {
                    bgcolor: alpha(DESIGN_COLORS.primary, 0.12),
                    boxShadow: 'none',
                  },
            }}
          >
            {primaryButtonLabel}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function ModePill({ active, label }: { active?: boolean; label: string }) {
  return (
    <Box
      sx={{
        px: { xs: 1.5, md: 2.1 },
        py: { xs: 0.85, md: 1.1 },
        borderRadius: '999px',
        bgcolor: active
          ? alpha(DESIGN_COLORS.primary, 0.1)
          : DESIGN_COLORS.surfaceLow,
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

const headerGhostButtonSx = {
  borderRadius: '999px',
  minHeight: 46,
  px: { xs: 2.4, md: 3 },
  bgcolor: alpha('#ffffff', 0.82),
  border: `1px solid ${alpha('#cad4ea', 0.9)}`,
  color: '#1f2937',
  fontWeight: 700,
  textTransform: 'none',
  boxShadow: '0 12px 24px rgba(15, 23, 42, 0.05)',
  '&:hover': {
    bgcolor: alpha('#ffffff', 0.96),
  },
} as const;
