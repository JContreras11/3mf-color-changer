'use client';

import type { ExportReviewData } from '@/utils/exportReview';
import React from 'react';

type ExportReviewContextValue = {
  clearReviewData: () => void;
  reviewData: ExportReviewData | null;
  setReviewData: (data: ExportReviewData | null) => void;
};

const ExportReviewContext =
  React.createContext<ExportReviewContextValue | null>(null);

export function ExportReviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [reviewData, setReviewData] = React.useState<ExportReviewData | null>(
    null
  );

  const value = React.useMemo<ExportReviewContextValue>(
    () => ({
      clearReviewData: () => setReviewData(null),
      reviewData,
      setReviewData,
    }),
    [reviewData]
  );

  return (
    <ExportReviewContext.Provider value={value}>
      {children}
    </ExportReviewContext.Provider>
  );
}

export function useExportReview() {
  const context = React.useContext(ExportReviewContext);

  if (!context) {
    throw new Error(
      'useExportReview must be used inside ExportReviewProvider.'
    );
  }

  return context;
}
