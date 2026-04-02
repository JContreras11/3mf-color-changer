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
  | 'triangle'
  | 'select_color'
  | 'text'
  | 'image';

export type DesignPanel =
  | 'materials'
  | 'graphics'
  | 'objects'
  | 'text';

type Props = {
  activePanel: DesignPanel;
  disabled?: boolean;
  onPanelChange: (panel: DesignPanel) => void;
  sx?: SxProps;
};

const panelItems = [
  {
    id: 'materials',
    label: 'Materials',
    icon: PaletteOutlinedIcon,
    tooltip: 'Paint the cap, edit color details, or sample a color from the model.',
  },
  {
    id: 'graphics',
    label: 'Graphics',
    icon: ImageRoundedIcon,
    tooltip: 'Upload logos or images and place them on the cap.',
  },
  {
    id: 'objects',
    label: 'Objects',
    icon: ExtensionRoundedIcon,
    tooltip: 'Swap into curated 3MF accessory variations for this silhouette.',
  },
  {
    id: 'text',
    label: 'Text',
    icon: TextFieldsRoundedIcon,
    tooltip: 'Add editable text to the selected surface.',
  },
] as const satisfies readonly {
  icon: typeof PaletteOutlinedIcon;
  id: DesignPanel;
  label: string;
  tooltip: string;
}[];

export default function ModeSelector({
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
        const active = item.id === activePanel;
        const Icon = item.icon;

        return (
          <Tooltip
            key={item.id}
            title={item.tooltip}
            placement="right"
            disableInteractive
          >
            <ButtonBase
              disabled={disabled}
              onClick={() => onPanelChange(item.id)}
              sx={{
                borderRadius: '24px',
                px: 0.5,
                py: 1.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                transition:
                  'transform 180ms ease, background-color 180ms ease, opacity 180ms ease',
                opacity: disabled ? 0.5 : 1,
                '&:hover': {
                  transform: disabled ? 'none' : 'translateY(-1px)',
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
            </ButtonBase>
          </Tooltip>
        );
      })}
    </Box>
  );
}
