import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import ColorizeRoundedIcon from '@mui/icons-material/ColorizeRounded';
import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import GestureRoundedIcon from '@mui/icons-material/GestureRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import React from 'react';
import { HexColorPicker } from 'react-colorful';

import type { AddonArtwork, AddonOption } from '../etc/designCatalog';
import { DesignPanel, Mode } from './ModeSelector';

type Props = {
  activePanel: DesignPanel;
  addonOptions: AddonOption[];
  addonPanelDescription: string;
  addonsEnabled: boolean;
  color: string;
  disabled?: boolean;
  imageName?: string;
  imageRotation: number;
  imageSize: number;
  mode: Mode;
  onAddonSelect: (option: AddonOption) => void;
  onApplyGraphics: () => void;
  onApplyText: () => void;
  onColorChange: (color: string) => void;
  onImageRotationChange: (value: number) => void;
  onImageSelect: (file: File) => void;
  onImageSizeChange: (value: number) => void;
  onModeChange: (mode: Mode) => void;
  onResetGraphics: () => void;
  onResetMaterials: () => void;
  onResetText: () => void;
  onTextChange: (value: string) => void;
  onTextRotationChange: (value: number) => void;
  onTextSizeChange: (value: number) => void;
  selectedAddonId?: string | null;
  text: string;
  textRotation: number;
  textSize: number;
};

const paletteColors = [
  '#d53e4f',
  '#f46d43',
  '#fdae61',
  '#fee08b',
  '#e6f598',
  '#abdda4',
  '#66c2a5',
  '#3288bd',
  '#ffffff',
] as const;

const panelCopy: Record<
  DesignPanel,
  { eyebrow?: string; subtitle: string; title: string }
> = {
  materials: {
    eyebrow: 'Material Studio',
    title: 'Surface & Color',
    subtitle: 'Choose how you paint the cap and refine its active color.',
  },
  graphics: {
    title: 'Image/Logo Settings',
    subtitle: 'Upload and refine your graphic placement before projecting it.',
  },
  objects: {
    eyebrow: 'Atelier Tools',
    title: '3D Accessories',
    subtitle: 'Attach curated geometry variations directly from prepared 3MF files.',
  },
  text: {
    title: 'Text Settings',
    subtitle: 'Compose type, size it, then click a surface to place it.',
  },
};

export default function OverlayBrushPanel({
  activePanel,
  addonOptions,
  addonPanelDescription,
  addonsEnabled,
  color,
  disabled = false,
  imageName,
  imageRotation,
  imageSize,
  mode,
  onAddonSelect,
  onApplyGraphics,
  onApplyText,
  onColorChange,
  onImageRotationChange,
  onImageSelect,
  onImageSizeChange,
  onModeChange,
  onResetGraphics,
  onResetMaterials,
  onResetText,
  onTextChange,
  onTextRotationChange,
  onTextSizeChange,
  selectedAddonId,
  text,
  textRotation,
  textSize,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const copy = panelCopy[activePanel];

  const openImagePicker = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: '100%',
        width: '100%',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        p: { xs: 2.5, md: 3.5 },
        borderRadius: { xs: '32px', md: '36px' },
        bgcolor: alpha('#ffffff', 0.88),
        border: `1px solid ${alpha('#d8e2ff', 0.8)}`,
        boxShadow: '0 28px 80px rgba(15, 23, 42, 0.08)',
        backdropFilter: 'blur(20px)',
        opacity: disabled ? 0.62 : 1,
        transition: 'opacity 180ms ease',
        overflow: 'hidden',
      }}
    >
      <Stack spacing={1} sx={{ mb: 3 }}>
        {copy.eyebrow && (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: '#c96e2b',
              }}
            />
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color: '#414755',
              }}
            >
              {copy.eyebrow}
            </Typography>
          </Stack>
        )}
        <Typography
          sx={{
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontSize: { xs: 28, md: 32 },
            fontWeight: 800,
            letterSpacing: '-0.04em',
            color: '#111827',
            lineHeight: 1.04,
          }}
        >
          {copy.title}
        </Typography>
        <Typography
          sx={{
            color: '#4b5563',
            fontSize: 15,
            lineHeight: 1.65,
            maxWidth: 360,
          }}
        >
          {activePanel === 'objects' ? addonPanelDescription : copy.subtitle}
        </Typography>
      </Stack>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          pr: 0.5,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onImageSelect(file);
            }

            event.target.value = '';
          }}
        />

        {activePanel === 'materials' && (
          <Stack spacing={3}>
            <ModeOptionGroup mode={mode} onModeChange={onModeChange} />

            <Box
              sx={{
                p: 2,
                borderRadius: '24px',
                bgcolor: alpha('#f3f4f5', 0.92),
                border: `1px solid ${alpha('#c1c6d7', 0.4)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  mb: 2,
                }}
              >
                Active Color
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '18px',
                    bgcolor: color,
                    border: `3px solid ${alpha('#ffffff', 0.92)}`,
                    boxShadow: '0 16px 24px rgba(15, 23, 42, 0.12)',
                  }}
                />
                <Box>
                  <Typography
                    sx={{
                      fontFamily: '"Manrope", "Inter", sans-serif',
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    Atelier Color
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: 13 }}>
                    {color.toUpperCase()}
                  </Typography>
                </Box>
              </Stack>

              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 1.25,
                }}
              >
                {paletteColors.map((swatch) => {
                  const selected = swatch.toLowerCase() === color.toLowerCase();

                  return (
                    <ButtonBase
                      key={swatch}
                      disabled={disabled}
                      onClick={() => onColorChange(swatch)}
                      sx={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: '18px',
                        bgcolor: swatch,
                        border: selected
                          ? '3px solid #0058bc'
                          : `1px solid ${alpha('#c1c6d7', swatch === '#ffffff' ? 0.9 : 0.18)}`,
                        boxShadow: selected
                          ? '0 0 0 4px rgba(0, 88, 188, 0.10)'
                          : 'none',
                      }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                p: 2.25,
                borderRadius: '24px',
                bgcolor: alpha('#eef3ff', 0.72),
                border: `1px solid ${alpha('#d8e2ff', 0.92)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  mb: 2,
                }}
              >
                Custom Mixer
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <HexColorPicker color={color} onChange={onColorChange} />
              </Box>
            </Box>

            <InfoCard
              icon={<FormatColorFillRoundedIcon sx={{ fontSize: 20 }} />}
              title="Direct painting"
              description="Use Whole Cap for broad fills, Detail for precise zones, and Pick to sample an existing tone from the model."
            />
          </Stack>
        )}

        {activePanel === 'graphics' && (
          <Stack spacing={3}>
            <ButtonBase
              disabled={disabled}
              onClick={openImagePicker}
              sx={{
                width: '100%',
                borderRadius: '28px',
                border: `2px dashed ${alpha('#9fb6e3', 0.72)}`,
                bgcolor: alpha('#f8f9fa', 0.72),
                p: { xs: 3, md: 4 },
                textAlign: 'center',
                transition:
                  'transform 180ms ease, border-color 180ms ease, background-color 180ms ease',
                '&:hover': {
                  transform: disabled ? 'none' : 'translateY(-1px)',
                  borderColor: disabled ? alpha('#9fb6e3', 0.72) : '#0058bc',
                  bgcolor: disabled ? alpha('#f8f9fa', 0.72) : alpha('#edf4ff', 0.92),
                },
              }}
            >
              <Stack spacing={1.75} alignItems="center" sx={{ width: '100%' }}>
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha('#0058bc', 0.1),
                    color: '#0058bc',
                  }}
                >
                  <CloudUploadRoundedIcon sx={{ fontSize: 36 }} />
                </Box>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: '"Manrope", "Inter", sans-serif',
                      fontWeight: 700,
                      color: '#111827',
                    }}
                  >
                    {imageName ? 'Replace your graphic' : 'Drop your logo here'}
                  </Typography>
                  <Typography sx={{ color: '#6b7280', fontSize: 13, mt: 0.75 }}>
                    {imageName || 'SVG, PNG, or JPG — prepared locally in your browser.'}
                  </Typography>
                </Box>
              </Stack>
            </ButtonBase>

            <InfoCard
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />}
              title={imageName || 'No graphic selected yet'}
              description={
                imageName
                  ? 'The uploaded image is ready. Click the cap surface to project it.'
                  : 'Upload a logo or artwork, then click the cap to position it.'
              }
            />

            <SliderField
              label="Scale"
              badge={`${imageSize}%`}
              min={5}
              max={120}
              step={1}
              value={imageSize}
              disabled={disabled}
              onChange={onImageSizeChange}
            />

            <SliderField
              label="Rotation"
              badge={`${imageRotation}°`}
              min={-180}
              max={180}
              step={1}
              value={imageRotation}
              disabled={disabled}
              onChange={onImageRotationChange}
            />
          </Stack>
        )}

        {activePanel === 'objects' && (
          <Stack spacing={3}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 2,
              }}
            >
              {addonOptions.map((option) => {
                const selected = option.id === selectedAddonId;
                const optionDisabled = disabled || !addonsEnabled;

                return (
                  <ButtonBase
                    key={option.id}
                    disabled={optionDisabled}
                    onClick={() => onAddonSelect(option)}
                    sx={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      borderRadius: '30px',
                      p: 2,
                      bgcolor: alpha('#ffffff', 0.92),
                      border: selected
                        ? '2px solid #0058bc'
                        : `1px solid ${alpha('#c1c6d7', 0.45)}`,
                      boxShadow: selected
                        ? '0 18px 36px rgba(0, 88, 188, 0.12)'
                        : '0 12px 30px rgba(15, 23, 42, 0.04)',
                      transition:
                        'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease',
                      opacity: optionDisabled ? 0.48 : 1,
                      '&:hover': {
                        transform: optionDisabled ? 'none' : 'translateY(-2px)',
                        boxShadow: optionDisabled
                          ? '0 12px 30px rgba(15, 23, 42, 0.04)'
                          : '0 18px 40px rgba(15, 23, 42, 0.08)',
                      },
                    }}
                  >
                    <Box sx={{ position: 'relative', mb: 2 }}>
                      <AddonPreview artwork={option.artwork} />
                      {selected && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: '#0058bc',
                            color: '#ffffff',
                            boxShadow: '0 18px 30px rgba(0, 88, 188, 0.28)',
                          }}
                        >
                          <CheckRoundedIcon />
                        </Box>
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: '"Manrope", "Inter", sans-serif',
                        fontSize: { xs: 18, md: 19 },
                        fontWeight: 800,
                        letterSpacing: '-0.04em',
                        color: '#111827',
                        mb: 0.75,
                      }}
                    >
                      {option.title}
                    </Typography>
                    <Typography
                      sx={{
                        color: '#4b5563',
                        fontSize: 14,
                        lineHeight: 1.55,
                      }}
                    >
                      {option.subtitle}
                    </Typography>
                  </ButtonBase>
                );
              })}
            </Box>

            <InfoCard
              icon={<AutoAwesomeRoundedIcon sx={{ fontSize: 20 }} />}
              title="Accessory variations"
              description={addonPanelDescription}
            />
          </Stack>
        )}

        {activePanel === 'text' && (
          <Stack spacing={3}>
            <TextField
              disabled={disabled}
              value={text}
              onChange={(event) => onTextChange(event.target.value)}
              label="Text"
              variant="filled"
              fullWidth
              InputProps={{
                sx: {
                  bgcolor: alpha('#f8f9fa', 0.94),
                  borderRadius: '18px',
                },
              }}
            />

            <InfoCard
              icon={<GestureRoundedIcon sx={{ fontSize: 20 }} />}
              title="Placement flow"
              description="Type your message, keep the current atelier color, then click a solid on the cap to project it."
            />

            <SliderField
              label="Scale"
              badge={`${textSize}%`}
              min={5}
              max={120}
              step={1}
              value={textSize}
              disabled={disabled}
              onChange={onTextSizeChange}
            />

            <SliderField
              label="Rotation"
              badge={`${textRotation}°`}
              min={-180}
              max={180}
              step={1}
              value={textRotation}
              disabled={disabled}
              onChange={onTextRotationChange}
            />

            <Box
              sx={{
                p: 2,
                borderRadius: '24px',
                bgcolor: alpha('#f3f4f5', 0.92),
                border: `1px solid ${alpha('#c1c6d7', 0.42)}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: '0.24em',
                  textTransform: 'uppercase',
                  color: '#6b7280',
                  mb: 1.25,
                }}
              >
                Current text color
              </Typography>
              <Stack direction="row" spacing={1.25} alignItems="center">
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '14px',
                    bgcolor: color,
                    border: `2px solid ${alpha('#ffffff', 0.92)}`,
                  }}
                />
                <Typography sx={{ fontWeight: 700, color: '#111827' }}>
                  {color.toUpperCase()}
                </Typography>
              </Stack>
            </Box>
          </Stack>
        )}
      </Box>

      {activePanel === 'materials' && (
        <PanelActions
          primaryLabel="Paint Whole Cap"
          onPrimary={() => onModeChange('mesh')}
          secondaryLabel="Reset Palette"
          onSecondary={onResetMaterials}
          disabled={disabled}
        />
      )}

      {activePanel === 'graphics' && (
        <PanelActions
          primaryLabel={imageName ? 'Apply Design' : 'Upload Graphic'}
          onPrimary={imageName ? onApplyGraphics : openImagePicker}
          secondaryLabel="Reset"
          onSecondary={onResetGraphics}
          disabled={disabled}
        />
      )}

      {activePanel === 'text' && (
        <PanelActions
          primaryLabel="Apply Text"
          onPrimary={onApplyText}
          secondaryLabel="Reset"
          onSecondary={onResetText}
          disabled={disabled}
        />
      )}
    </Paper>
  );
}

function ModeOptionGroup({
  mode,
  onModeChange,
}: {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}) {
  const options: { description: string; icon: React.ReactNode; label: string; value: Mode }[] = [
    {
      value: 'mesh',
      label: 'Whole Cap',
      description: 'Paint entire solids in one click.',
      icon: <FormatColorFillRoundedIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: 'triangle',
      label: 'Detail',
      description: 'Brush smaller surface regions.',
      icon: <GestureRoundedIcon sx={{ fontSize: 18 }} />,
    },
    {
      value: 'select_color',
      label: 'Pick',
      description: 'Sample a color directly from the model.',
      icon: <ColorizeRoundedIcon sx={{ fontSize: 18 }} />,
    },
  ];

  return (
    <Stack spacing={1.25}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: '#6b7280',
        }}
      >
        Painting Mode
      </Typography>
      {options.map((option) => {
        const active = option.value === mode;

        return (
          <ButtonBase
            key={option.value}
            onClick={() => onModeChange(option.value)}
            sx={{
              width: '100%',
              p: 2,
              borderRadius: '22px',
              textAlign: 'left',
              justifyContent: 'flex-start',
              bgcolor: active ? alpha('#edf4ff', 0.95) : alpha('#f8f9fa', 0.82),
              border: active
                ? '1px solid rgba(0, 88, 188, 0.30)'
                : '1px solid rgba(193, 198, 215, 0.35)',
              boxShadow: active
                ? '0 12px 24px rgba(0, 88, 188, 0.08)'
                : 'none',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '14px',
                  display: 'grid',
                  placeItems: 'center',
                  background: active
                    ? 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)'
                    : alpha('#eef1f6', 0.92),
                  color: active ? '#ffffff' : '#414755',
                }}
              >
                {option.icon}
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Manrope", "Inter", sans-serif',
                    fontWeight: 700,
                    color: '#111827',
                  }}
                >
                  {option.label}
                </Typography>
                <Typography sx={{ color: '#6b7280', fontSize: 13 }}>
                  {option.description}
                </Typography>
              </Box>
            </Stack>
          </ButtonBase>
        );
      })}
    </Stack>
  );
}

function SliderField({
  badge,
  disabled = false,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  badge: string;
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
}) {
  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#374151',
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            px: 1.5,
            py: 0.75,
            borderRadius: '999px',
            bgcolor: alpha('#edf4ff', 0.92),
            color: '#0058bc',
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {badge}
        </Box>
      </Stack>
      <Slider
        disabled={disabled}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, newValue) => onChange(newValue as number)}
        sx={{
          color: '#0058bc',
          px: 0,
          '& .MuiSlider-rail': {
            color: alpha('#d1d5db', 0.85),
            opacity: 1,
          },
          '& .MuiSlider-track': {
            border: 'none',
          },
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
            boxShadow: '0 12px 24px rgba(0, 88, 188, 0.18)',
          },
        }}
      />
    </Stack>
  );
}

function PanelActions({
  disabled = false,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
}: {
  disabled?: boolean;
  onPrimary: () => void;
  onSecondary: () => void;
  primaryLabel: string;
  secondaryLabel: string;
}) {
  return (
    <>
      <Divider sx={{ my: 2, borderColor: alpha('#c1c6d7', 0.45) }} />
      <Stack direction="row" spacing={1.5}>
        <Button
          disabled={disabled}
          onClick={onSecondary}
          startIcon={<RestartAltRoundedIcon />}
          sx={{
            flex: 1,
            borderRadius: '20px',
            px: 2.5,
            py: 1.6,
            bgcolor: alpha('#f3f4f5', 0.96),
            color: '#374151',
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontWeight: 700,
            textTransform: 'none',
          }}
        >
          {secondaryLabel}
        </Button>
        <Button
          disabled={disabled}
          onClick={onPrimary}
          sx={{
            flex: 1.45,
            borderRadius: '20px',
            px: 2.5,
            py: 1.6,
            background: 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
            color: '#ffffff',
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontWeight: 800,
            textTransform: 'none',
            boxShadow: '0 18px 32px rgba(0, 88, 188, 0.22)',
            '&:hover': {
              background: 'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
            },
          }}
        >
          {primaryLabel}
        </Button>
      </Stack>
    </>
  );
}

function InfoCard({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '24px',
        bgcolor: alpha('#f8f9fa', 0.92),
        border: `1px solid ${alpha('#d8e2ff', 0.78)}`,
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '14px',
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha('#0058bc', 0.08),
            color: '#0058bc',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Manrope", "Inter", sans-serif',
              fontWeight: 700,
              color: '#111827',
              mb: 0.5,
            }}
          >
            {title}
          </Typography>
          <Typography sx={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6 }}>
            {description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function AddonPreview({ artwork }: { artwork: AddonArtwork }) {
  const id = React.useId().replace(/:/g, '');
  const shadowId = `${id}-shadow`;
  const brimId = `${id}-brim`;
  const crownId = `${id}-crown`;
  const sideId = `${id}-side`;
  const hornTone = artwork === 'deer_gold'
    ? ['#d9984a', '#6b3a15']
    : artwork === 'deer_natural'
      ? ['#b98b5f', '#705238']
      : ['#efd3a1', '#7a4a25'];

  return (
    <Box
      sx={{
        aspectRatio: '1 / 0.86',
        borderRadius: '26px',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at 20% 0%, rgba(255,255,255,0.96) 0%, rgba(245,247,252,0.96) 100%)',
        border: `1px solid ${alpha('#e5e7eb', 0.82)}`,
      }}
    >
      <svg
        viewBox="0 0 240 180"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id={shadowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(31,41,55,0.24)" />
            <stop offset="100%" stopColor="rgba(31,41,55,0)" />
          </radialGradient>
          <linearGradient id={brimId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff5a57" />
            <stop offset="100%" stopColor="#d0121b" />
          </linearGradient>
          <linearGradient id={crownId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f3f4f6" />
          </linearGradient>
          <linearGradient id={sideId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3067ea" />
            <stop offset="100%" stopColor="#0c44c9" />
          </linearGradient>
        </defs>

        <ellipse cx="120" cy="146" rx="78" ry="24" fill={`url(#${shadowId})`} />

        {(artwork === 'deer_gold' || artwork === 'deer_natural') && (
          <>
            <Antler x={78} flip={false} tones={hornTone} />
            <Antler x={162} flip={true} tones={hornTone} />
          </>
        )}

        {artwork === 'viking' && (
          <>
            <Horn x={78} flip={false} tones={hornTone} />
            <Horn x={162} flip={true} tones={hornTone} />
          </>
        )}

        <path
          d="M60 112 C82 97 158 97 180 112 C170 142 72 142 60 112 Z"
          fill={`url(#${brimId})`}
        />
        <path
          d="M72 118 C76 76 93 42 120 42 C147 42 164 76 168 118 C152 111 133 107 120 107 C107 107 88 111 72 118 Z"
          fill={`url(#${crownId})`}
        />
        <path
          d="M133 46 C151 55 164 79 168 118 C160 114 153 112 146 111 C143 82 137 60 126 45 Z"
          fill={`url(#${sideId})`}
        />
        <path
          d="M119 43 C120 39 126 39 127 43 C127 47 126 51 123 52 C120 51 119 47 119 43 Z"
          fill="#c7803c"
        />
        <path
          d="M92 84 C102 70 113 62 120 62 C127 62 139 70 148 84"
          fill="none"
          stroke="rgba(107,114,128,0.14)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </Box>
  );
}

function Antler({
  flip,
  tones,
  x,
}: {
  flip: boolean;
  tones: string[];
  x: number;
}) {
  const transform = flip ? `translate(${x} 22) scale(-1 1)` : `translate(${x} 22)`;

  return (
    <g transform={transform}>
      <path
        d="M0 60 C-8 46 -10 30 -4 14 C2 0 10 4 10 18 C10 31 8 46 4 60"
        fill="none"
        stroke={tones[1]}
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M1 40 C-10 34 -16 22 -18 12"
        fill="none"
        stroke={tones[1]}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M6 28 C18 24 24 14 28 2"
        fill="none"
        stroke={tones[0]}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M4 52 C18 50 28 42 34 28"
        fill="none"
        stroke={tones[0]}
        strokeWidth="6"
        strokeLinecap="round"
      />
    </g>
  );
}

function Horn({
  flip,
  tones,
  x,
}: {
  flip: boolean;
  tones: string[];
  x: number;
}) {
  const direction = flip ? -1 : 1;

  return (
    <g transform={`translate(${x} 34) scale(${direction} 1)`}>
      <path
        d="M0 58 C-18 44 -24 18 -10 4 C6 -10 30 6 27 28 C26 43 18 54 0 58 Z"
        fill={tones[0]}
        stroke={tones[1]}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 50 C18 44 22 34 22 24"
        fill="none"
        stroke={tones[1]}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </g>
  );
}
