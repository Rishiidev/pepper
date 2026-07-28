import { db } from '../db';
import { PepperSession } from '../../core/types/session';

export class SessionRepository {
  async getAll(): Promise<PepperSession[]> {
    return await db.sessions.orderBy('createdAt').reverse().toArray();
  }

  async getById(id: string): Promise<PepperSession | undefined> {
    return await db.sessions.get(id);
  }

  async save(session: PepperSession): Promise<string> {
    await db.sessions.put(session);
    return session.id;
  }

  async update(id: string, updates: Partial<PepperSession>): Promise<void> {
    await db.sessions.update(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  }

  async delete(id: string): Promise<void> {
    await db.sessions.delete(id);
  }

  async clearAll(): Promise<void> {
    await db.sessions.clear();
  }

  async count(): Promise<number> {
    return await db.sessions.count();
  }
}

export const sessionRepo = new SessionRepository();
