export function normalizeExamplePath(path: string) {
  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return trimmedPath;
  }

  if (/^(https?:)?\/\//i.test(trimmedPath)) {
    return trimmedPath;
  }

  return trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
}
