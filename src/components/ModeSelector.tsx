import ExtensionRoundedIcon from '@mui/icons-material/ExtensionRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import TextFieldsRoundedIcon from '@mui/icons-material/TextFieldsRounded';
import type { SxProps } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import React from 'react';

export type Mode =
  | 'mesh'
  | 'text'
  | 'image';

export type DesignPanel =
  | 'materials'
  | 'graphics'
  | 'objects'
  | 'text';

export const COMING_SOON_PANELS: readonly DesignPanel[] = [
  'materials',
  'graphics',
  'text',
] as const;

type Props = {
  activePanel: DesignPanel;
  disabled?: boolean;
  onPanelChange: (panel: DesignPanel) => void;
  sx?: SxProps;
};

const panelItems = [
  {
    id: 'objects',
    label: 'Addons',
    icon: ExtensionRoundedIcon,
    tooltip: 'Swap into curated 3MF accessory variations for this silhouette.',
  },
  {
    id: 'materials',
    label: 'Materials',
    icon: PaletteOutlinedIcon,
    tooltip: 'Apply quick combos or paint the whole cap with your active color.',
    comingSoon: true,
  },
  {
    id: 'graphics',
    label: 'Graphics',
    icon: ImageRoundedIcon,
    tooltip: 'Use the quick SVG/PNG library or upload artwork and place it on the cap.',
    comingSoon: true,
  },
  {
    id: 'text',
    label: 'Text',
    icon: TextFieldsRoundedIcon,
    tooltip: 'Add editable text to the selected surface.',
    comingSoon: true,
  },
] as const satisfies readonly {
  comingSoon?: boolean;
  icon: typeof PaletteOutlinedIcon;
  id: DesignPanel;
  label: string;
  tooltip: string;
}[];

const ModeSelector = React.memo(function ModeSelector({
  activePanel,
  disabled = false,
  onPanelChange,
  sx,
}: Props) {
  return (
    <Box
      sx={{
        width: { xs: 82, md: 92 },
        p: { xs: 1.25, md: 1.5 },
        borderRadius: { xs: '28px', md: '32px' },
        bgcolor: alpha('#ffffff', 0.86),
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 64px rgba(0, 88, 188, 0.10)',
        border: `1px solid ${alpha('#d8e2ff', 0.72)}`,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 1.25, md: 1.5 },
        ...sx,
      }}
    >
      {panelItems.map((item) => {
        const itemDisabled = disabled || !!item.comingSoon;
        const active = item.id === activePanel && !itemDisabled;
        const Icon = item.icon;
        const tooltipTitle = item.comingSoon ? 'Coming soon' : item.tooltip;

        return (
          <Tooltip
            key={item.id}
            title={tooltipTitle}
            placement="right"
            disableInteractive
          >
            <Box component="span" sx={{ display: 'block' }}>
              <ButtonBase
                disabled={itemDisabled}
                onClick={() => onPanelChange(item.id)}
                sx={{
                  width: '100%',
                  borderRadius: '24px',
                  px: 0.5,
                  py: 1.25,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.8,
                  transition:
                    'transform 180ms ease, background-color 180ms ease, opacity 180ms ease',
                  opacity: itemDisabled ? 0.5 : 1,
                  '&:hover': {
                    transform: itemDisabled ? 'none' : 'translateY(-1px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 46, md: 52 },
                    height: { xs: 46, md: 52 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: active
                      ? 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)'
                      : alpha('#edf1f7', 0.95),
                    color: active ? '#ffffff' : '#414755',
                    boxShadow: active
                      ? '0 18px 32px rgba(0, 88, 188, 0.24)'
                      : 'inset 0 0 0 1px rgba(193, 198, 215, 0.28)',
                  }}
                >
                  <Icon sx={{ fontSize: { xs: 22, md: 24 } }} />
                </Box>
                <Typography
                  sx={{
                    fontSize: { xs: 9, md: 10 },
                    fontWeight: active ? 800 : 600,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: active ? '#0058bc' : alpha('#414755', 0.62),
                    lineHeight: 1.4,
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Typography>
                {item.comingSoon && (
                  <Typography
                    sx={{
                      fontSize: { xs: 7.5, md: 8 },
                      fontWeight: 800,
                      letterSpacing: '0.18em',
                      textTransform: 'uppercase',
                      color: alpha('#414755', 0.58),
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}
                  >
                    Coming soon
                  </Typography>
                )}
              </ButtonBase>
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
});

export default ModeSelector;
