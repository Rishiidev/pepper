import Dexie, { type EntityTable } from 'dexie';
import { PepperSession } from '../core/types/session';

export interface PepperSnapshot {
  id: string;
  timestamp: number;
  tabs: PepperSession['tabs'];
  windowId: number;
  reason: 'auto_backup' | 'crash_prevention' | 'manual';
}

export interface PepperCacheItem {
  key: string;
  value: unknown;
  expiresAt: number;
}

export interface PepperEmbedding {
  id: string;
  sessionId: string;
  vector: number[];
  textSnippet: string;
  createdAt: number;
}

class PepperDatabase extends Dexie {
  sessions!: EntityTable<PepperSession, 'id'>;
  snapshots!: EntityTable<PepperSnapshot, 'id'>;
  cache!: EntityTable<PepperCacheItem, 'key'>;
  embeddings!: EntityTable<PepperEmbedding, 'id'>;

  constructor() {
    super('PepperDatabaseV2');

    this.version(1).stores({
      sessions: 'id, name, createdAt, isFavorite, isPinned, projectName, *tags',
      snapshots: 'id, timestamp, windowId, reason',
      cache: 'key, expiresAt',
      embeddings: 'id, sessionId, createdAt',
    });
  }
}

export const db = new PepperDatabase();
