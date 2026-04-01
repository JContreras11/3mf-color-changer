import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React from 'react';

import { Mode } from './ModeSelector';

type Props = {
  imageName?: string;
  mode: Mode;
  onImageSelect: (file: File) => void;
  onImageSizeChange: (value: number) => void;
  onImageRotationChange: (value: number) => void;
  onTextChange: (value: string) => void;
  onTextRotationChange: (value: number) => void;
  onTextSizeChange: (value: number) => void;
  text: string;
  imageRotation: number;
  imageSize: number;
  textRotation: number;
  textSize: number;
};

export default function OverlayBrushPanel({
  imageName,
  mode,
  onImageSelect,
  onImageSizeChange,
  onImageRotationChange,
  onTextChange,
  onTextRotationChange,
  onTextSizeChange,
  text,
  imageRotation,
  imageSize,
  textRotation,
  textSize,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  if (mode !== 'image' && mode !== 'text') {
    return null;
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'absolute',
        top: 24,
        right: 24,
        width: 360,
        maxWidth: 'calc(100vw - 48px)',
        p: 3,
        zIndex: 2,
        backgroundColor: 'rgba(33, 33, 33, 0.92)',
        color: 'white',
      }}
    >
      {mode === 'image' ? (
        <Stack spacing={3}>
          <Typography variant="h4" fontSize="2rem" fontWeight={700}>
            Image Brush
          </Typography>

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

          <Button
            variant="contained"
            onClick={() => inputRef.current?.click()}
            sx={{ py: 1.2 }}
          >
            {imageName ? 'Replace Image' : 'Select image...'}
          </Button>

          <Typography color="rgba(255,255,255,0.7)">
            {imageName || 'Choose an image and click a solid to place it.'}
          </Typography>

          <SliderField
            label={`Size: ${imageSize}`}
            min={5}
            max={120}
            step={1}
            value={imageSize}
            onChange={onImageSizeChange}
          />

          <SliderField
            label={`Rotate: ${imageRotation}°`}
            min={-180}
            max={180}
            step={1}
            value={imageRotation}
            onChange={onImageRotationChange}
          />
        </Stack>
      ) : (
        <Stack spacing={3}>
          <Typography variant="h4" fontSize="2rem" fontWeight={700}>
            Text Brush
          </Typography>

          <TextField
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            label="Text"
            variant="filled"
            size="small"
            fullWidth
            InputProps={{
              sx: {
                backgroundColor: 'white',
                borderRadius: 1,
              },
            }}
          />

          <Typography color="rgba(255,255,255,0.7)">
            Click a solid to place the text using the selected paint color.
          </Typography>

          <SliderField
            label={`Size: ${textSize}`}
            min={5}
            max={120}
            step={1}
            value={textSize}
            onChange={onTextSizeChange}
          />

          <SliderField
            label={`Rotate: ${textRotation}°`}
            min={-180}
            max={180}
            step={1}
            value={textRotation}
            onChange={onTextRotationChange}
          />
        </Stack>
      )}
    </Paper>
  );
}

type SliderFieldProps = {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
};

function SliderField({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: SliderFieldProps) {
  return (
    <Stack spacing={1}>
      <Typography>{label}</Typography>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(_, newValue) => onChange(newValue as number)}
        sx={{
          color: '#2196f3',
          '& .MuiSlider-rail': {
            color: 'rgba(255,255,255,0.4)',
          },
        }}
      />
    </Stack>
  );
}
