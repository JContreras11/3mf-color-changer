import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';

const drawerWidth = 340;
const brandTitle = 'CustomCaps';
const steps = [
  { label: 'Base', paths: ['/'] },
  { label: 'Design', paths: ['/editor'] },
  { label: 'Add-ons', paths: [] },
  { label: 'Review', paths: [] },
] as const;

type Props = {
  menu?: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

export default function PermanentDrawer({ menu, title, children }: Props) {
  const location = useLocation();
  const activeStepIndex = steps.findIndex((step) =>
    step.paths.includes(location.pathname)
  );
  const toolbarSpacerSx = {
    minHeight: { xs: 110, sm: 76, md: 72 },
  };

  return (
    <Box component="div" sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: alpha('#f8f9fa', 0.86),
          color: '#111827',
          backdropFilter: 'blur(20px)',
          borderBottom: `1px solid ${alpha('#7d8697', 0.14)}`,
          boxShadow: 'none',
        }}
      >
        <Toolbar
          sx={{
            ...toolbarSpacerSx,
            px: { xs: 2, sm: 2.5, md: 4 },
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'center', sm: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.25, sm: 2 },
            py: { xs: 1.25, sm: 0.5 },
          }}
        >
          <Typography
            noWrap
            component={Link}
            sx={{
              textDecoration: 'none',
              boxShadow: 'none',
              color: '#0058bc',
              fontFamily: '"Manrope", "Inter", sans-serif',
              fontSize: { xs: 22, sm: 24, md: 30 },
              fontWeight: 800,
              letterSpacing: '-0.04em',
              flexShrink: 0,
            }}
            to="/"
          >
            {title || brandTitle}
          </Typography>

          <Stack
            direction="row"
            spacing={{ xs: 2, md: 4 }}
            sx={{
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {steps.map((step, index) => {
              const active = index === activeStepIndex;

              return (
                <Box
                  key={step.label}
                  sx={{
                    position: 'relative',
                    pb: 1.25,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: { xs: 15, md: 17 },
                      fontWeight: active ? 700 : 600,
                      color: active ? '#0058bc' : '#7d8697',
                    }}
                  >
                    {step.label}
                  </Typography>
                  {active && (
                    <Box
                      sx={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        mx: 'auto',
                        width: '100%',
                        height: 3,
                        borderRadius: 999,
                        bgcolor: '#0058bc',
                      }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>
        </Toolbar>
      </AppBar>
      {menu && (
        <Drawer
          variant="permanent"
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
            },
          }}
        >
          <Toolbar sx={toolbarSpacerSx} />
          <Box component="div" sx={{ overflow: 'auto' }}>
            {menu}
          </Box>
        </Drawer>
      )}
      <Box component="main" sx={{ flexGrow: 1, pt: 0 }}>
        <Toolbar sx={toolbarSpacerSx} />
        <Box
          component="div"
          sx={{
            width: `calc(100vw - ${menu ? drawerWidth : 0}px)`,
            height: {
              xs: 'calc(100vh - 110px)',
              sm: 'calc(100vh - 76px)',
              md: 'calc(100vh - 72px)',
            },
            overflow: 'auto',
            bgcolor: '#f8f9fa',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
