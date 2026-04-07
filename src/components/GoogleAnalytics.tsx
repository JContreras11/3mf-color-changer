'use client';

import { trackPageView } from '@/utils/googleAnalytics';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasTrackedInitialPage = useRef(false);
  const search = searchParams.toString();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    if (!hasTrackedInitialPage.current) {
      hasTrackedInitialPage.current = true;
      return;
    }

    trackPageView(search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);

  return null;
}
