import { PepperSession } from '../types/session';
import { settingsRepo } from '../../storage/repositories/settings-repo';
import { sessionEngine } from './session-engine';

export const LAST_CAPTURE_KEY = 'pepper_last_capture';
const FLASH_MS = 4000;
const FLASH_COLOR = '#30D158';

export interface CaptureAnnouncement {
  sessionId: string;
  name: string;
  tabCount: number;
  at: number;
  kind: 'auto' | 'recovered';
}

/** Copy shown in toast, notification and badge. */
export function captureMessage(tabCount: number, kind: CaptureAnnouncement['kind']): string {
  const noun = tabCount === 1 ? 'tab' : 'tabs';
  return kind === 'recovered' ? `Recovered ${tabCount} ${noun}` : `Saved ${tabCount} ${noun}`;
}

/**
 * Makes an auto-capture visible without being intrusive: a brief green badge
 * flash, a record the dashboard turns into a toast, and (optionally) a silent
 * notification with Reopen / Rename actions.
 */
export async function announceCapture(session: PepperSession, kind: CaptureAnnouncement['kind'] = 'auto'): Promise<void> {
  if (typeof chrome === 'undefined') return;

  const announcement: CaptureAnnouncement = {
    sessionId: session.id,
    name: session.name,
    tabCount: session.tabCount,
    at: Date.now(),
    kind,
  };

  try {
    await chrome.storage.local.set({ [LAST_CAPTURE_KEY]: announcement });
  } catch {
    // non-fatal
  }

  try {
    if (chrome.action) {
      await chrome.action.setBadgeBackgroundColor({ color: FLASH_COLOR });
      await chrome.action.setBadgeText({ text: `+${session.tabCount}` });
      setTimeout(() => void sessionEngine.refreshBadge(), FLASH_MS);
    }
  } catch {
    // non-fatal
  }

  try {
    const settings = await settingsRepo.get();
    if (settings.notifyOnAutoCapture && chrome.notifications) {
      chrome.notifications.create(`pepper_capture_${session.id}`, {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: captureMessage(session.tabCount, kind),
        message: session.name,
        contextMessage: 'Pepper — click to rename',
        buttons: [{ title: 'Reopen' }, { title: 'Rename' }],
        silent: true,
        priority: 0,
      });
    }
  } catch {
    // non-fatal
  }
}
