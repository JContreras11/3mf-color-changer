const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';

export const BASE_PATH =
  rawBasePath && rawBasePath !== '/'
    ? rawBasePath.startsWith('/')
      ? rawBasePath.replace(/\/$/, '')
      : `/${rawBasePath.replace(/\/$/, '')}`
    : '';

export function withBasePath(path: string): string {
  if (!path) {
    return BASE_PATH || '/';
  }

  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) {
    return path;
  }

  if (!BASE_PATH) {
    return path;
  }

  if (path === '/') {
    return BASE_PATH;
  }

  return path.startsWith('/') ? `${BASE_PATH}${path}` : `${BASE_PATH}/${path}`;
}
