'use client';

import { AuthProvider } from '@/components/AuthContext';
import { EditorFileProvider } from '@/components/EditorFileContext';
import { ExportReviewProvider } from '@/components/ExportReviewContext';
import FloatingInstagramLogo from '@/components/FloatingInstagramLogo';
import JobNotifications from '@/components/JobNotifications';
import JobProvider from '@/components/JobProvider';
import JobSnackbar from '@/components/JobSnackbar';
import theme from '@/theme';
import handleUnhandledPromiseRejection from '@/utils/handleUnhandledPromiseRejection';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import React from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    window.addEventListener(
      'unhandledrejection',
      handleUnhandledPromiseRejection
    );

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
      <AuthProvider>
        <EditorFileProvider>
          <ExportReviewProvider>
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
                <FloatingInstagramLogo />
              </SnackbarProvider>
            </JobProvider>
          </ExportReviewProvider>
        </EditorFileProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
