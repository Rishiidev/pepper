import type { PepperProjectEntity } from '../../storage/db';
import { PepperSession, PepperTab, CaptureType } from '../types/session';
import { PepperSettings, DEFAULT_SETTINGS } from '../types/settings';

export const BACKUP_FORMAT = 'pepper-backup';
export const BACKUP_VERSION = 1;

/** Settings that are safe to carry between machines. API keys are never exported. */
export const PORTABLE_SETTING_KEYS: Array<keyof PepperSettings> = [
  'namingMode',
  'nameTemplate',
  'defaultProjectName',
  'saveScope',
  'closeTabsOnSave',
  'confirmDelete',
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
}

export type ValidationResult =
  | { ok: true; backup: PepperBackup; skipped: number }
  | { ok: false; error: string };

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
    tabDurations: s.tabDurations && typeof s.tabDurations === 'object' ? (s.tabDurations as Record<number, number>) : undefined,
    domainClusters: Array.isArray(s.domainClusters)
      ? s.domainClusters.filter((d): d is string => typeof d === 'string')
      : undefined,
    sessionIntent: typeof s.sessionIntent === 'string' ? s.sessionIntent : undefined,
    restoredAt: typeof s.restoredAt === 'number' ? s.restoredAt : undefined,
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
    exportedAt = num(obj.exportedAt, exportedAt);
  } else {
    return { ok: false, error: 'File is not valid backup JSON.' };
  }

  const sessions = sessionsRaw.map(sanitizeSession).filter((s): s is PepperSession => s !== null);
  const projects = projectsRaw.map(sanitizeProject).filter((p): p is PepperProjectEntity => p !== null);
  const skipped = sessionsRaw.length - sessions.length;

  const settings: Partial<PepperSettings> = {};
  for (const key of PORTABLE_SETTING_KEYS) {
    if (key in settingsRaw && typeof settingsRaw[key] === typeof DEFAULT_SETTINGS[key]) {
      (settings as Record<string, unknown>)[key] = settingsRaw[key];
    }
  }

  return {
    ok: true,
    skipped,
    backup: { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt, sessions, projects, settings },
  };
}

