'use client';

import LockRoundedIcon from '@mui/icons-material/LockRounded';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { enqueueSnackbar } from 'notistack';
import React from 'react';

import { useAuth } from './AuthContext';

type Props = {
  description?: string;
  onAuthenticated?: () => void;
  onClose: () => void;
  open: boolean;
  title?: string;
};

export default function LoginDialog({
  description = 'Use your authorized studio credentials to unlock the Trucker Cap workflow and the rest of the app.',
  onAuthenticated,
  onClose,
  open,
  title = 'Studio Login',
}: Props) {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setPassword('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setIsSubmitting(true);
      setError(null);

      try {
        await login({ password, username });
        enqueueSnackbar('Login successful. Access unlocked.', {
          variant: 'success',
        });
        onAuthenticated?.();
      } catch (authError) {
        setError(
          authError instanceof Error
            ? authError.message
            : 'Could not log in with those credentials.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [login, onAuthenticated, password, username]
  );

  return (
    <Dialog
      open={open}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '30px',
          overflow: 'hidden',
          bgcolor: alpha('#ffffff', 0.98),
          boxShadow: '0 36px 120px rgba(15, 23, 42, 0.22)',
          border: `1px solid ${alpha('#d8e2ff', 0.9)}`,
        },
      }}
    >
      <DialogContent sx={{ px: { xs: 2.5, md: 3.5 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5} component="form" onSubmit={handleSubmit}>
          <Box
            sx={{
              width: 62,
              height: 62,
              borderRadius: '22px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha('#0058bc', 0.1),
              color: '#0058bc',
            }}
          >
            <LockRoundedIcon sx={{ fontSize: 30 }} />
          </Box>

          <Box>
            <Typography
              sx={{
                color: '#a43c12',
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
              }}
            >
              Restricted Access
            </Typography>
            <Typography
              sx={{
                mt: 1,
                fontFamily: '"Manrope", "Inter", sans-serif',
                fontSize: { xs: 30, md: 36 },
                fontWeight: 800,
                lineHeight: 0.98,
                letterSpacing: '-0.05em',
                color: '#111827',
              }}
            >
              {title}
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                color: '#4b5563',
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              {description}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus
            required
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={isSubmitting}
            fullWidth
          />
          <TextField
            required
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            fullWidth
          />

          <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.25}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onClose}
              disabled={isSubmitting}
              sx={{
                minHeight: 54,
                borderRadius: '18px',
                borderColor: alpha('#b8c5e3', 0.92),
                color: '#1f2937',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': {
                  borderColor: '#0058bc',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={isSubmitting || !username.trim() || !password}
              startIcon={
                isSubmitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : null
              }
              sx={{
                minHeight: 54,
                borderRadius: '18px',
                background: 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
                fontWeight: 800,
                textTransform: 'none',
                boxShadow: '0 16px 28px rgba(0, 88, 188, 0.18)',
                '&:hover': {
                  background:
                    'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
                },
              }}
            >
              {isSubmitting ? 'Signing in...' : 'Unlock app'}
            </Button>
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
