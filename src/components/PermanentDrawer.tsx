'use client';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import NextLink from './NextLink';
import { withBasePath } from '@/utils/basePath';

const drawerWidth = 340;
const brandTitle = 'MakeYourCaps.com';
const steps: ReadonlyArray<{ label: string; paths: readonly string[] }> = [
  { label: 'Base', paths: ['/'] },
  { label: 'Design', paths: ['/editor'] },
  { label: 'Export', paths: ['/export'] },
];

type Props = {
  action?: React.ReactNode;
  menu?: React.ReactNode;
  title: string;
  children: React.ReactNode;
};

export default function PermanentDrawer({
  action,
  menu,
  title,
  children,
}: Props) {
  const pathname = usePathname();
  const activeStepIndex = steps.findIndex((step) =>
    step.paths.includes(pathname)
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
          <Box
            sx={{
              display: 'flex',
              width: { xs: '100%', sm: 320, md: 380 },
              justifyContent: { xs: 'center', sm: 'flex-start' },
              flexShrink: 0,
              minWidth: 0,
            }}
          >
            <Box
              component={NextLink}
              sx={{
                textDecoration: 'none',
                boxShadow: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: { xs: 1, md: 1.2 },
                minWidth: 0,
              }}
              href='/'
            >
              <Box
                component="img"
                src={withBasePath('/logo.png')}
                alt="MakeYourCaps.com logo"
                sx={{
                  width: { xs: 36, sm: 40, md: 46 },
                  height: { xs: 26, sm: 29, md: 34 },
                  objectFit: 'contain',
                  flexShrink: 0,
                }}
              />
              <Typography
                noWrap
                sx={{
                  textDecoration: 'none',
                  color: '#123b8a',
                  fontFamily: '"Manrope", "Inter", sans-serif',
                  fontSize: { xs: 24, sm: 24, md: 28 },
                  fontWeight: 800,
                  letterSpacing: '-0.045em',
                  lineHeight: 1,
                  minWidth: 0,
                }}
              >
                {title || brandTitle}
              </Typography>
            </Box>
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 2, md: 4 }}
            sx={{
              flex: 1,
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
          <Box
            sx={{
              display: 'flex',
              width: { xs: '100%', sm: 220, md: 240 },
              justifyContent: { xs: 'center', sm: 'flex-end' },
              flexShrink: 0,
              minHeight: 1,
            }}
          >
            {action || <Box sx={{ width: { sm: 1 } }} />}
          </Box>
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
