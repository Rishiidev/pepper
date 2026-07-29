import { db } from '../../storage/db';
import { FocusSession, FocusMode, FocusStatus, UserReflection } from '../types/focus-session';
import { PepperSession } from '../types/session';
import { FocusSummarySkill } from '../intelligence/skills/focus-summary';
import { eventBus } from '../events/event-bus';

const focusSummarySkill = new FocusSummarySkill();

export class FocusEngine {
  /**
   * Starts a new Focus Session linked to a specific Workspace/Memory
   */
  async startSession(
    memory: PepperSession,
    mode: FocusMode,
    targetMinutes: number = 25
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
    const session = await db.focusSessions.get(sessionId);
    if (!session) throw new Error(`Focus session ${sessionId} not found.`);

    const now = Date.now();
    session.elapsedSeconds = elapsedSeconds;
    session.status = 'completed';
    session.endedAt = now;
    session.userReflection = reflection;
    session.userNotes = notes;

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
