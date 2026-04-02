'use client';

import React from 'react';

type EditorFileContextValue = {
  clearUploadedFile: () => void;
  setUploadedFile: (file: File | null) => void;
  uploadedFile: File | null;
};

const EditorFileContext = React.createContext<EditorFileContextValue | null>(null);

export function EditorFileProvider({ children }: { children: React.ReactNode }) {
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);

  const value = React.useMemo<EditorFileContextValue>(
    () => ({
      clearUploadedFile: () => setUploadedFile(null),
      setUploadedFile,
      uploadedFile,
    }),
    [uploadedFile]
  );

  return (
    <EditorFileContext.Provider value={value}>
      {children}
    </EditorFileContext.Provider>
  );
}

export function useEditorFile() {
  const context = React.useContext(EditorFileContext);

  if (!context) {
    throw new Error('useEditorFile must be used inside EditorFileProvider.');
  }

  return context;
}
