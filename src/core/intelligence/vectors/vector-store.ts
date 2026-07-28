import { db, PepperEmbedding } from '../../../storage/db';
import { cosineSimilarity } from './cosine';

export class VectorStore {
  private static instance: VectorStore;

  private constructor() {}

  static getInstance(): VectorStore {
    if (!VectorStore.instance) {
      VectorStore.instance = new VectorStore();
    }
    return VectorStore.instance;
  }

  async saveEmbedding(sessionId: string, vector: number[], textSnippet: string): Promise<void> {
    const entry: PepperEmbedding = {
      id: `vec_${sessionId}`,
      sessionId,
      vector,
      textSnippet,
      createdAt: Date.now(),
    };
    await db.embeddings.put(entry);
  }

  async getEmbedding(sessionId: string): Promise<PepperEmbedding | undefined> {
    return await db.embeddings.get(`vec_${sessionId}`);
  }

  async findSimilar(
    queryEmbedding: number[],
    topK = 5,
    threshold = 0.2
  ): Promise<Array<{ sessionId: string; similarity: number; textSnippet: string }>> {
    const all = await db.embeddings.toArray();
    const scored = all.map((entry) => ({
      sessionId: entry.sessionId,
      similarity: cosineSimilarity(queryEmbedding, entry.vector),
      textSnippet: entry.textSnippet,
    }));

    return scored
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  async deleteEmbedding(sessionId: string): Promise<void> {
    await db.embeddings.delete(`vec_${sessionId}`);
  }

  async clear(): Promise<void> {
    await db.embeddings.clear();
  }
}

export const vectorStore = VectorStore.getInstance();
