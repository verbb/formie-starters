function normalizeBasePath(baseUrl: string): string {
  if (!baseUrl || baseUrl === '/') {
    return '';
  }

  try {
    return new URL(baseUrl, 'https://example.test').pathname.replace(/\/+$/, '');
  } catch {
    return baseUrl.replace(/\/+$/, '');
  }
}

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL);

export function stripAppBasePath(pathname: string): string {
  const normalizedPathname = pathname || '/';

  if (!APP_BASE_PATH) {
    return normalizedPathname;
  }

  if (normalizedPathname === APP_BASE_PATH) {
    return '/';
  }

  if (normalizedPathname.startsWith(`${APP_BASE_PATH}/`)) {
    return normalizedPathname.slice(APP_BASE_PATH.length) || '/';
  }

  return normalizedPathname;
}

export function toAppHref(url: string): string {
  const [pathWithQuery, hash = ''] = url.split('#', 2);
  const [path = '/', query = ''] = pathWithQuery.split('?', 2);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const prefixedPath = `${APP_BASE_PATH}${normalizedPath}` || '/';
  const queryString = query ? `?${query}` : '';
  const hashString = hash ? `#${hash}` : '';

  return `${prefixedPath}${queryString}${hashString}`;
}
