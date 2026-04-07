import GoogleAnalytics from '@/components/GoogleAnalytics';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { Roboto } from 'next/font/google';
import Script from 'next/script';
import { Suspense } from 'react';

import { GA_MEASUREMENT_ID } from '@/utils/googleAnalytics';

import Providers from './providers';
import './globals.css';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: 'Customize your caps',
  description: 'Customize and export printable 3MF cap models.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <body>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
