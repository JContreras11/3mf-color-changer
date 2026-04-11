import type { NextConfig } from 'next';

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || '';
const basePath =
  rawBasePath && rawBasePath !== '/'
    ? rawBasePath.startsWith('/')
      ? rawBasePath.replace(/\/$/, '')
      : `/${rawBasePath.replace(/\/$/, '')}`
    : '';

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
