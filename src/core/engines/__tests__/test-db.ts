import 'fake-indexeddb/auto';
import { db } from '../../../storage/db';

/** Empties every table between tests. */
export async function resetDb(): Promise<void> {
  await Promise.all(db.tables.map((t) => t.clear()));
}

export function mkTab(url: string, index = 0) {
  return { url, title: url, favIconUrl: '', index, pinned: false };
}
