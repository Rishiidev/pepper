import { db } from '../../storage/db';
import { FocusSession, FocusMode, FocusStatus, UserReflection } from '../types/focus-session';
import { PepperSession } from '../types/session';
import { FocusSummarySkill } from '../intelligence/skills/focus-summary';
import { recordActivation } from './activation';
import { eventBus } from '../events/event-bus';
import { FocusTask } from '../types/task';

const focusSummarySkill = new FocusSummarySkill();

export class FocusEngine {
  /**
   * Starts a new Focus Session linked to a specific Workspace/Memory
   */
  async startSession(
    memory: PepperSession,
    mode: FocusMode,
    targetMinutes: number = 25,
    task?: FocusTask
  ): Promise<FocusSession> {
    const targetSeconds = mode === 'stopwatch' ? 0 : targetMinutes * 60;

    const domains = Array.from(
      new Set(
        memory.tabs
          .map((t) => {
            try {
              return new URL(t.url).hostname.replace(/^www\./, '');
            } catch {
              return '';
            }
          })
          .filter(Boolean)
      )
    ).slice(0, 5);

    const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
      ? crypto.randomUUID() 
      : `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

    const session: FocusSession = {
      id: `focus_${uniqueId}`,
      sessionId: memory.id,
      workspaceName: memory.name,
      projectName: memory.projectName || 'General',
      taskId: task?.id,
      taskTitle: task?.title,
      mode,
      durationSeconds: targetSeconds,
      elapsedSeconds: 0,
      status: 'active',
      startedAt: Date.now(),
      pomodoroRound: mode === 'pomodoro' ? 1 : undefined,
      totalRounds: mode === 'pomodoro' ? 4 : undefined,
      visitedDomains: domains,
      tabsVisitedCount: memory.tabCount,
    };

    await db.focusSessions.add(session);
    void recordActivation('focus');
    eventBus.emit('focus:started', { session });
    return session;
  }

  /**
   * Complete a Focus Session and trigger AI Summary generation
   */
  async completeSession(
    sessionId: string,
    elapsedSeconds: number,
    reflection?: UserReflection,
    notes?: string
  ): Promise<FocusSession> {
    // The timer in every open page and the background alarm can all reach zero together.
    // Claim the session in one transaction so exactly one of them writes the result and runs the summary.
    const now = Date.now();
    const session = await db.transaction('rw', db.focusSessions, async () => {
      const current = await db.focusSessions.get(sessionId);
      if (!current) throw new Error(`Focus session ${sessionId} not found.`);
      if (current.status === 'completed' || current.status === 'canceled') return null;
      current.elapsedSeconds = elapsedSeconds;
      current.status = 'completed';
      current.endedAt = now;
      current.userReflection = reflection;
      current.userNotes = notes;
      await db.focusSessions.put(current);
      return current;
    });
    if (!session) return (await db.focusSessions.get(sessionId)) as FocusSession;

    // Trigger AI Focus Summary Skill
    try {
      const aiResult = await focusSummarySkill.execute({
        id: `task_focus_${session.id}`,
        skillId: focusSummarySkill.id,
        priority: 'HIGH',
        requirements: focusSummarySkill.requirements,
        input: session,
        context: { traceId: `trace_${now}`, createdAt: now },
      });

      if (aiResult.success && aiResult.data) {
        session.aiSummary = aiResult.data.summary;
        session.accomplishments = aiResult.data.accomplishments;
        session.suggestedNextStep = aiResult.data.suggestedNextStep;
      }
    } catch (err) {
      console.warn('AI Focus summary generation fallback:', err);
      session.aiSummary = `Completed ${Math.round(elapsedSeconds / 60)} minutes of focus on ${session.workspaceName}.`;
      session.accomplishments = [`Focused for ${Math.round(elapsedSeconds / 60)}m`];
      session.suggestedNextStep = 'Resume workspace tasks.';
    }

    await db.focusSessions.put(session);
    eventBus.emit('focus:completed', { session });
    return session;
  }

  async pauseSession(sessionId: string, elapsedSeconds: number): Promise<void> {
    const session = await db.focusSessions.get(sessionId);
    if (session) {
      session.status = 'paused';
      session.elapsedSeconds = elapsedSeconds;
      await db.focusSessions.put(session);
      eventBus.emit('focus:paused', { sessionId });
    }
  }

  /** Puts a paused session back to active so history and the stored status match the running timer. */
  async resumeSession(sessionId: string, elapsedSeconds: number): Promise<void> {
    await db.transaction('rw', db.focusSessions, async () => {
      const session = await db.focusSessions.get(sessionId);
      if (!session || session.status !== 'paused') return;
      session.status = 'active';
      session.elapsedSeconds = elapsedSeconds;
      await db.focusSessions.put(session);
    });
    eventBus.emit('focus:resumed', { sessionId });
  }

  async cancelSession(sessionId: string, elapsedSeconds: number): Promise<void> {
    const session = await db.focusSessions.get(sessionId);
    if (session) {
      session.status = 'canceled';
      session.elapsedSeconds = elapsedSeconds;
      session.endedAt = Date.now();
      await db.focusSessions.put(session);
      eventBus.emit('focus:canceled', { sessionId });
    }
  }

  async getAllSessions(): Promise<FocusSession[]> {
    return await db.focusSessions.orderBy('startedAt').reverse().toArray();
  }

  async getSessionsForWorkspace(workspaceId: string): Promise<FocusSession[]> {
    const sessions = await db.focusSessions
      .where('sessionId')
      .equals(workspaceId)
      .toArray();
    return sessions.sort((a, b) => b.startedAt - a.startedAt);
  }
}

export const focusEngine = new FocusEngine();
