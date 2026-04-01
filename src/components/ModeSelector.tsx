import ColorizeIcon from '@mui/icons-material/Colorize';
import CreateIcon from '@mui/icons-material/Create';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FormatPaintIcon from '@mui/icons-material/FormatPaint';
import ImageIcon from '@mui/icons-material/Image';
import PaletteIcon from '@mui/icons-material/Palette';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import type { SxProps } from '@mui/material';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import IconButton from '@mui/material/IconButton';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import { HexColorPicker } from 'react-colorful';

import UseNewModelButton from './ModeSelector/UseNewModelButton';

export type Mode =
  | 'mesh'
  | 'triangle'
  | 'select_color'
  | 'text'
  | 'image';
type Props = {
  color: string;
  mode: Mode;
  onColorChange: (color: string) => void;
  onExport: () => void;
  onModeChange: (mode: Mode) => void;
  sx?: SxProps;
};

const defaultColors = [
  '#d53e4f',
  '#f46d43',
  '#fdae61',
  '#fee08b',
  '#e6f598',
  '#abdda4',
  '#66c2a5',
  '#3288bd',
  '#ffffff',
];

export default function ModeSelector({
  color,
  mode,
  onColorChange,
  onExport,
  onModeChange,
  sx,
}: Props) {
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [colorPickerAnchorEl, setColorPickerAnchorEl] =
    React.useState<HTMLButtonElement>();

  const handleModeClick = (newMode: Mode) => () => onModeChange(newMode);
  const handleColorChange = (newColor) => onColorChange(newColor);
  const handleExportClick = onExport;

  const style = {
    border: 1,
    borderColor: '#ccc',
    borderRadius: 2,
    borderStyle: 'solid',
    m: 0.25,
  };
  const selectedStyle = {
    ...style,
    border: 2,
    borderColor: 'primary.main',
  };

  return (
    <ButtonGroup
      orientation="vertical"
      aria-label="vertical outlined button group"
      sx={sx}
    >
      <Tooltip
        title="Select the mesh painting tool to paint whole objects."
        placement="right"
      >
        <IconButton
          onClick={handleModeClick('mesh')}
          sx={mode === 'mesh' ? selectedStyle : style}
        >
          <FormatPaintIcon />
        </IconButton>
      </Tooltip>

      <Tooltip
        title="Select the triangle painting tool to paint the smallest components of your model."
        placement="right"
      >
        <IconButton
          onClick={handleModeClick('triangle')}
          sx={mode === 'triangle' ? selectedStyle : style}
        >
          <CreateIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Select the painting color" placement="right">
        <IconButton
          sx={{
            ...style,
          }}
          onClick={(event) => {
            setColorPickerAnchorEl(event?.currentTarget);
            setShowColorPicker(!showColorPicker);
          }}
        >
          <PaletteIcon
            sx={{
              borderBottom: 6,
              borderBottomColor: color,
            }}
          />
        </IconButton>
      </Tooltip>

      <Tooltip title="Select the color from a model" placement="right">
        <IconButton
          onClick={handleModeClick('select_color')}
          sx={mode === 'select_color' ? selectedStyle : style}
        >
          <ColorizeIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add text on top of a solid" placement="right">
        <IconButton
          onClick={handleModeClick('text')}
          sx={mode === 'text' ? selectedStyle : style}
        >
          <TextFieldsIcon />
        </IconButton>
      </Tooltip>

      <Tooltip title="Add an image on top of a solid" placement="right">
        <IconButton
          onClick={handleModeClick('image')}
          sx={mode === 'image' ? selectedStyle : style}
        >
          <ImageIcon />
        </IconButton>
      </Tooltip>

      <UseNewModelButton buttonSx={{ ...style, mt: 5 }} />

      <Tooltip title="Export your changes in a 3MF file" placement="right">
        <IconButton onClick={handleExportClick} sx={style}>
          <FileDownloadIcon />
        </IconButton>
      </Tooltip>

      <Box component="div" sx={{ mt: 5 }} />
      {defaultColors.map((d) => (
        <Tooltip title="Set color" placement="right" key={d}>
          <IconButton
            onClick={() => handleColorChange(d)}
            sx={{ ...style, backgroundColor: d + ' !important', height: 40 }}
          ></IconButton>
        </Tooltip>
      ))}

      <Popover
        open={showColorPicker}
        anchorEl={colorPickerAnchorEl}
        onClose={() => setShowColorPicker(false)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            style: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
            },
          },
        }}
      >
        <Box component="div" sx={{ m: 2 }}>
          <HexColorPicker color={color} onChange={handleColorChange} />
        </Box>
      </Popover>
    </ButtonGroup>
  );
}
