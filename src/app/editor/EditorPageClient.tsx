'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';

const Editor = dynamic<{ examplePath?: string }>(
  () => import('@/components/Editor'),
  {
    ssr: false,
  }
);

export default function EditorPageClient() {
  const searchParams = useSearchParams();
  const examplePath = searchParams.get('example') || undefined;

  return <Editor examplePath={examplePath} />;
}
