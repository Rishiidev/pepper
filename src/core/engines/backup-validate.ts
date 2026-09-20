import type { PepperProjectEntity } from '../../storage/db';
import type { FocusSession, FocusMode, FocusStatus, UserReflection } from '../types/focus-session';
import type { BrowserSession, TimelineEvent, TimelineEventType } from '../types/timeline';
import { PepperSession, PepperTab, CaptureType } from '../types/session';
import type { PepperTask } from '../types/task';
import { cleanTaskUrl, normalizeTaskTitle } from './task-engine';
import { PepperSettings, DEFAULT_SETTINGS } from '../types/settings';

export const BACKUP_FORMAT = 'pepper-backup';
export const BACKUP_VERSION = 3;

/** Settings that are safe to carry between machines. API keys are never exported. */
export const PORTABLE_SETTING_KEYS: Array<keyof PepperSettings> = [
  'namingMode',
  'nameTemplate',
  'defaultProjectName',
  'saveScope',
  'closeTabsOnSave',
  'confirmDelete',
  'lazyRestore',
  'theme',
  'quickSaveDestination',
  'quickSaveFeedback',
  'quickSaveEnableUndo',
  'notifyOnAutoCapture',
  'autoCaptureRetentionDays',
  'maxAutoCaptures',
];

export interface PepperBackup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  sessions: PepperSession[];
  projects: PepperProjectEntity[];
  settings: Partial<PepperSettings>;
  /** Added in v2; empty when importing a v1 backup */
  focusSessions: FocusSession[];
  browserSessions: BrowserSession[];
  timelineEvents: TimelineEvent[];
  /** Added in v3; empty when importing an older backup */
  tasks: PepperTask[];
}

export type ValidationResult =
  | { ok: true; backup: PepperBackup; skipped: number }
  | { ok: false; error: string };

/** Allowed values for enum-like settings. A value outside its list is dropped, not imported. */
const SETTING_ENUMS: Partial<Record<keyof PepperSettings, readonly string[]>> = {
  namingMode: ['prefilled', 'ask', 'auto', 'template'],
  saveScope: ['window', 'selected', 'all_windows'],
  theme: ['dark', 'light', 'system'],
  quickSaveDestination: ['inbox', 'current_workspace', 'ask'],
};
const MAX_TEXT_SETTING = 200;
const MAX_RETENTION_NUMBER = 3650;

/** Validates one portable setting; returns undefined when the value must not be imported. */
function sanitizeSetting(key: keyof PepperSettings, value: unknown): unknown {
  const allowed = SETTING_ENUMS[key];
  if (allowed) return typeof value === 'string' && allowed.includes(value) ? value : undefined;
  const expected = DEFAULT_SETTINGS[key];
  if (typeof value !== typeof expected) return undefined;
  if (typeof value === 'number') {
    return Number.isInteger(value) && value >= 0 && value <= MAX_RETENTION_NUMBER ? value : undefined;
  }
  if (typeof value === 'string') return value.length <= MAX_TEXT_SETTING ? value : undefined;
  return value;
}

const CAPTURE_TYPES: CaptureType[] = ['manual', 'auto_window_close', 'auto_idle', 'keyboard_shortcut', 'crash_recovery'];

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function sanitizeTab(raw: unknown, index: number): PepperTab | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const url = str(t.url);
  if (!/^https?:\/\//i.test(url)) return null;
  return {
    url,
    title: str(t.title, 'Untitled Tab'),
    favIconUrl: str(t.favIconUrl),
    index: num(t.index, index),
    pinned: t.pinned === true,
  };
}

/** Returns a clean session or null when the record is unusable. */
export function sanitizeSession(raw: unknown): PepperSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const id = str(s.id);
  if (!id || !Array.isArray(s.tabs)) return null;

  const tabs = s.tabs.map(sanitizeTab).filter((t): t is PepperTab => t !== null);
  if (tabs.length === 0) return null;

  const createdAt = num(s.createdAt, Date.now());
  const captureType = CAPTURE_TYPES.includes(s.captureType as CaptureType)
    ? (s.captureType as CaptureType)
    : 'manual';

  return {
    id,
    name: str(s.name, 'Imported Workspace'),
    tabs,
    tabCount: tabs.length,
    createdAt,
    updatedAt: num(s.updatedAt, createdAt),
    isFavorite: s.isFavorite === true,
    isPinned: s.isPinned === true,
    projectName: str(s.projectName, 'General'),
    tags: Array.isArray(s.tags) ? s.tags.filter((t): t is string => typeof t === 'string') : undefined,
    summary: typeof s.summary === 'string' ? s.summary : undefined,
    estimatedRamSavedMb: typeof s.estimatedRamSavedMb === 'number' ? s.estimatedRamSavedMb : undefined,
    captureType,
    activeTabIndex: typeof s.activeTabIndex === 'number' ? s.activeTabIndex : undefined,
    domainClusters: Array.isArray(s.domainClusters)
      ? s.domainClusters.filter((d): d is string => typeof d === 'string')
      : undefined,
    sessionIntent: typeof s.sessionIntent === 'string' ? s.sessionIntent : undefined,
    restoredAt: typeof s.restoredAt === 'number' ? s.restoredAt : undefined,
  };
}

const FOCUS_MODES: FocusMode[] = ['pomodoro', 'timer', 'stopwatch'];
const FOCUS_STATUSES: FocusStatus[] = ['active', 'paused', 'completed', 'canceled'];
const REFLECTIONS: UserReflection[] = ['great', 'good', 'okay', 'difficult'];
const EVENT_TYPES: TimelineEventType[] = [
  'session_start', 'session_end', 'tab_open', 'tab_navigate', 'tab_switch', 'tab_close', 'tab_active', 'idle_start', 'idle_end',
];

function oneOf<T extends string>(v: unknown, list: readonly T[]): T | undefined {
  return typeof v === 'string' && (list as readonly string[]).includes(v) ? (v as T) : undefined;
}

function optStr(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function optNum(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function strList(v: unknown): string[] | undefined {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : undefined;
}

export function sanitizeFocusSession(raw: unknown): FocusSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  const id = str(f.id);
  const mode = oneOf(f.mode, FOCUS_MODES);
  const status = oneOf(f.status, FOCUS_STATUSES);
  if (!id || !mode || !status) return null;
  // A backup cannot bring back a running timer: anything unfinished becomes canceled.
  const settled: FocusStatus = status === 'active' || status === 'paused' ? 'canceled' : status;
  return {
    id,
    sessionId: str(f.sessionId),
    workspaceName: str(f.workspaceName),
    projectName: optStr(f.projectName),
    taskId: optStr(f.taskId),
    taskTitle: optStr(f.taskTitle),
    mode,
    durationSeconds: Math.max(0, num(f.durationSeconds, 0)),
    elapsedSeconds: Math.max(0, num(f.elapsedSeconds, 0)),
    status: settled,
    startedAt: num(f.startedAt, 0),
    endedAt: optNum(f.endedAt),
    pomodoroRound: optNum(f.pomodoroRound),
    totalRounds: optNum(f.totalRounds),
    isBreak: typeof f.isBreak === 'boolean' ? f.isBreak : undefined,
    aiSummary: optStr(f.aiSummary),
    accomplishments: strList(f.accomplishments),
    suggestedNextStep: optStr(f.suggestedNextStep),
    visitedDomains: strList(f.visitedDomains),
    tabsVisitedCount: optNum(f.tabsVisitedCount),
    userReflection: oneOf(f.userReflection, REFLECTIONS),
    userNotes: optStr(f.userNotes),
  };
}

function sanitizeBrowserSession(raw: unknown): BrowserSession | null {
  if (!raw || typeof raw !== 'object') return null;
  const b = raw as Record<string, unknown>;
  const id = str(b.id);
  const startReason = oneOf(b.startReason, ['startup', 'enabled', 'window'] as const);
  if (!id || !startReason) return null;
  const startedAt = num(b.startedAt, 0);
  return {
    id,
    startedAt,
    endedAt: optNum(b.endedAt),
    endReason: oneOf(b.endReason, ['clean', 'interrupted'] as const),
    lastEventAt: num(b.lastEventAt, startedAt),
    startReason,
  };
}

function sanitizeTimelineEvent(raw: unknown): TimelineEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  const type = oneOf(e.type, EVENT_TYPES);
  const sessionId = str(e.sessionId);
  if (!type || !sessionId) return null;
  const url = optStr(e.url);
  if (url && !/^https?:\/\//i.test(url)) return null;
  return {
    sessionId,
    ts: num(e.ts, 0),
    type,
    tabId: optNum(e.tabId),
    windowId: optNum(e.windowId),
    url,
    title: optStr(e.title),
    spentMs: optNum(e.spentMs),
    reason: optStr(e.reason),
  };
}

export function sanitizeTask(raw: unknown): PepperTask | null {
  if (!raw || typeof raw !== 'object') return null;
  const t = raw as Record<string, unknown>;
  const id = str(t.id);
  const title = normalizeTaskTitle(str(t.title));
  if (!id || !title) return null;
  const createdAt = num(t.createdAt, Date.now());
  const done = t.done === true;
  const workspaceId = str(t.workspaceId);
  return {
    id,
    title,
    done,
    workspaceId: workspaceId || undefined,
    url: cleanTaskUrl(optStr(t.url)),
    createdAt,
    updatedAt: num(t.updatedAt, createdAt),
    doneAt: done ? optNum(t.doneAt) ?? num(t.updatedAt, createdAt) : undefined,
  };
}

function sanitizeProject(raw: unknown): PepperProjectEntity | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const id = str(p.id);
  const name = str(p.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    color: str(p.color, '#FF3B30'),
    icon: str(p.icon, 'folder'),
    description: typeof p.description === 'string' ? p.description : undefined,
    createdAt: num(p.createdAt, Date.now()),
    updatedAt: num(p.updatedAt, Date.now()),
  };
}

/** Pure: validates and normalizes untrusted backup JSON. Accepts the old plain-array export too. */
export function validateBackup(raw: unknown): ValidationResult {
  let sessionsRaw: unknown[];
  let projectsRaw: unknown[] = [];
  let settingsRaw: Record<string, unknown> = {};
  let focusRaw: unknown[] = [];
  let browserRaw: unknown[] = [];
  let eventsRaw: unknown[] = [];
  let tasksRaw: unknown[] = [];
  let exportedAt = Date.now();

  if (Array.isArray(raw)) {
    sessionsRaw = raw; // legacy export: bare session array
  } else if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.format !== BACKUP_FORMAT) return { ok: false, error: 'Not a Pepper backup file.' };
    if (typeof obj.version === 'number' && obj.version > BACKUP_VERSION) {
      return { ok: false, error: 'This backup was made by a newer version of Pepper.' };
    }
    if (!Array.isArray(obj.sessions)) return { ok: false, error: 'Backup has no sessions list.' };
    sessionsRaw = obj.sessions;
    projectsRaw = Array.isArray(obj.projects) ? obj.projects : [];
    settingsRaw = obj.settings && typeof obj.settings === 'object' ? (obj.settings as Record<string, unknown>) : {};
    focusRaw = Array.isArray(obj.focusSessions) ? obj.focusSessions : [];
    browserRaw = Array.isArray(obj.browserSessions) ? obj.browserSessions : [];
    eventsRaw = Array.isArray(obj.timelineEvents) ? obj.timelineEvents : [];
    tasksRaw = Array.isArray(obj.tasks) ? obj.tasks : [];
    exportedAt = num(obj.exportedAt, exportedAt);
  } else {
    return { ok: false, error: 'File is not valid backup JSON.' };
  }

  const sessions = sessionsRaw.map(sanitizeSession).filter((s): s is PepperSession => s !== null);
  const projects = projectsRaw.map(sanitizeProject).filter((p): p is PepperProjectEntity => p !== null);
  const skipped = sessionsRaw.length - sessions.length;

  const settings: Partial<PepperSettings> = {};
  for (const key of PORTABLE_SETTING_KEYS) {
    if (!(key in settingsRaw)) continue;
    const clean = sanitizeSetting(key, settingsRaw[key]);
    if (clean !== undefined) (settings as Record<string, unknown>)[key] = clean;
  }

  return {
    ok: true,
    skipped,
    backup: {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      sessions,
      projects,
      settings,
      focusSessions: focusRaw.map(sanitizeFocusSession).filter((f): f is FocusSession => f !== null),
      browserSessions: browserRaw.map(sanitizeBrowserSession).filter((b): b is BrowserSession => b !== null),
      timelineEvents: eventsRaw.map(sanitizeTimelineEvent).filter((e): e is TimelineEvent => e !== null),
      tasks: tasksRaw.map(sanitizeTask).filter((t): t is PepperTask => t !== null),
    },
  };
}

