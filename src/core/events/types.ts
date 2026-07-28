import { PepperSession, GroupedTimeline } from '../types/session';
import { PepperSettings } from '../types/settings';

export type PepperEvents = {
  'session:created': { session: PepperSession };
  'session:updated': { session: PepperSession };
  'session:deleted': { sessionId: string };
  'session:restored': { sessionId: string; tabCount: number };
  'timeline:updated': { groups: GroupedTimeline };
  'settings:updated': { settings: PepperSettings };
  'badge:updated': { count: number };
  'search:query': { query: string };
  'command:execute': { commandId: string };
};
