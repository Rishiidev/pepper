import { isSaveableUrl } from '../utils/url';

/** Lowercased hostnames, one per line or comma separated, with junk removed. */
export function parseBlocklist(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[\n,\s]+/)
        .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
        .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$|^localhost$/.test(d))
    ),
  ];
}

/** True when hostname equals a blocked domain or is a subdomain of one. */
export function isBlockedHost(hostname: string, blocklist: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return blocklist.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Only normal web pages on non-blocked domains are recorded. */
export function isTrackedUrl(url: string | undefined, blocklist: string[]): boolean {
  if (!url || !isSaveableUrl(url)) return false;
  try {
    return !isBlockedHost(new URL(url).hostname, blocklist);
  } catch {
    return false;
  }
}
