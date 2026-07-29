import Dexie, { type EntityTable } from 'dexie';
import { PepperSession } from '../core/types/session';
import { FocusSession, DailyJournal } from '../core/types/focus-session';

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

export interface PepperProjectEntity {
  id: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

class PepperDatabase extends Dexie {
  sessions!: EntityTable<PepperSession, 'id'>;
  snapshots!: EntityTable<PepperSnapshot, 'id'>;
  cache!: EntityTable<PepperCacheItem, 'key'>;
  embeddings!: EntityTable<PepperEmbedding, 'id'>;
  projects!: EntityTable<PepperProjectEntity, 'id'>;
  focusSessions!: EntityTable<FocusSession, 'id'>;
  journals!: EntityTable<DailyJournal, 'id'>;

  constructor() {
    super('PepperDatabaseV2');

    this.version(1).stores({
      sessions: 'id, name, createdAt, isFavorite, isPinned, projectName, *tags',
      snapshots: 'id, timestamp, windowId, reason',
      cache: 'key, expiresAt',
      embeddings: 'id, sessionId, createdAt',
    });

    this.version(2).stores({
      sessions: 'id, name, createdAt, isFavorite, isPinned, projectName, *tags',
      snapshots: 'id, timestamp, windowId, reason',
      cache: 'key, expiresAt',
      embeddings: 'id, sessionId, createdAt',
      projects: 'id, name, createdAt',
    });

    this.version(3).stores({
      sessions: 'id, name, createdAt, isFavorite, isPinned, projectName, *tags',
      snapshots: 'id, timestamp, windowId, reason',
      cache: 'key, expiresAt',
      embeddings: 'id, sessionId, createdAt',
      projects: 'id, name, createdAt',
      focusSessions: 'id, sessionId, startedAt, mode, status, projectName',
      journals: 'id, dateStr, momentumScore',
    });
  }
}

export const db = new PepperDatabase();
