import { BASE_PATH, withBasePath } from '@/utils/basePath';

export function normalizeExamplePath(path: string) {
const trimmedPath = path.trim();

if (!trimmedPath) {
return trimmedPath;
}

if (/^(https?:)?\/\//i.test(trimmedPath)) {
return trimmedPath;
}

const normalized = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;

if (BASE_PATH && (normalized === BASE_PATH || normalized.startsWith(`${BASE_PATH}/`))) {
return normalized;
}

return withBasePath(normalized);
}
