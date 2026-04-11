import fs from 'node:fs';
import path from 'node:path';
import type { NextConfig } from 'next';

function getAllowedDevOrigins() {
  const values = new Set<string>();
  const envValue = process.env.ALLOWED_DEV_ORIGINS || '';

  for (const part of envValue.split(',')) {
    const trimmed = part.trim();
    if (trimmed) {
      values.add(trimmed);
    }
  }

  const runtimeFile = path.join(process.cwd(), '.openclaw', 'dev-runtime', 'allowed-dev-origins.json');
  if (fs.existsSync(runtimeFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(runtimeFile, 'utf8'));
      const origins = Array.isArray(data?.origins) ? data.origins : [];
      for (const origin of origins) {
        if (typeof origin === 'string' && origin.trim()) {
          values.add(origin.trim());
        }
      }
    } catch {
      // ignore malformed runtime file
    }
  }

  return Array.from(values);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;
