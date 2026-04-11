import { withBasePath } from '@/utils/basePath';

export function normalizeExamplePath(path: string) {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return trimmedPath;
  }

  if (/^(https?:)?\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  const normalized = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

  return withBasePath(normalized);
}
