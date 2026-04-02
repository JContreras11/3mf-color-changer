'use client';

import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import React from 'react';

import { EditorFileProvider } from '@/components/EditorFileContext';
import JobNotifications from '@/components/JobNotifications';
import JobProvider from '@/components/JobProvider';
import JobSnackbar from '@/components/JobSnackbar';
import theme from '@/theme';
import handleUnhandledPromiseRejection from '@/utils/handleUnhandledPromiseRejection';

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    window.addEventListener('unhandledrejection', handleUnhandledPromiseRejection);

    return () => {
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledPromiseRejection
      );
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <EditorFileProvider>
        <JobProvider>
          <SnackbarProvider
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            Components={{
              job: JobSnackbar,
            }}
          >
            <JobNotifications />
            {children}
          </SnackbarProvider>
        </JobProvider>
      </EditorFileProvider>
    </ThemeProvider>
  );
}
