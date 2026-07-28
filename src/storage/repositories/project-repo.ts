import { db, PepperProjectEntity } from '../db';

export class ProjectRepository {
  async getAll(): Promise<PepperProjectEntity[]> {
    try {
      return await db.projects.orderBy('createdAt').reverse().toArray();
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<PepperProjectEntity | undefined> {
    return await db.projects.get(id);
  }

  async save(project: PepperProjectEntity): Promise<PepperProjectEntity> {
    await db.projects.put(project);
    return project;
  }

  async update(id: string, updates: Partial<PepperProjectEntity>): Promise<void> {
    await db.projects.update(id, { ...updates, updatedAt: Date.now() });
  }

  async delete(id: string): Promise<void> {
    await db.projects.delete(id);
  }
}

export const projectRepo = new ProjectRepository();
