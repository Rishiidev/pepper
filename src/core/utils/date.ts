/** YYYY-MM-DD in the user's own time zone. Bucketing by UTC files late-evening or after-midnight work under the wrong day. */
export function localDateStr(input: number | Date): string {
  const d = typeof input === 'number' ? new Date(input) : input;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
