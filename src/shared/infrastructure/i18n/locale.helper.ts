export type Locale = 'es' | 'en';

/**
 * Extracts the preferred locale from request headers.
 * Reads the Accept-Language header and maps it to 'en' or 'es'.
 * Defaults to 'es' (primary LATAM market).
 */
export function extractLocale(
  headers: Record<string, string | string[] | undefined>,
): Locale {
  const header = headers['accept-language'];
  const lang = Array.isArray(header) ? header[0] : (header ?? '');
  return lang.toLowerCase().startsWith('en') ? 'en' : 'es';
}
