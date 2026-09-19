const UNSAVEABLE_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'chrome-untrusted://',
  'about:',
  'edge://',
  'brave://',
  'devtools://',
  'view-source:',
  'file://',
  'data:',
  'javascript:',
];

/** True for normal web URLs that Pepper may save and later reopen. */
export function isSaveableUrl(url?: string): boolean {
  if (!url) return false;
  return !UNSAVEABLE_PREFIXES.some((p) => url.startsWith(p));
}

/** Identity of a page for duplicate checks: host + path, no query, hash or trailing slash. */
export function cleanUrlKey(url: string): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname}`.replace(/\/$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}
