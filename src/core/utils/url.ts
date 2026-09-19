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
