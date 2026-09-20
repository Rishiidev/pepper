/** Order-independent key for a set of tab URLs. */
export function urlSetKey(urls: string[]): string {
  return [...urls].sort().join('\n');
}

/**
 * Compact indexed fingerprint of a tab set (two FNV-1a passes, 64 bits of hex).
 * Used to find candidate duplicates without loading every session; callers
 * confirm a hit against the real URLs because hashes can collide.
 */
export function hashUrlSet(urls: string[]): string {
  const key = urlSetKey(urls);
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ key.length;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
