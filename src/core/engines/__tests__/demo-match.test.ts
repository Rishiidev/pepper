import { describe, it, expect } from 'vitest';
import { findDemoCapture, DEMO_URLS } from '../demo-match';
import { PepperSession } from '../../types/session';

const mk = (id: string, urls: string[], createdAt: number, captureType: PepperSession['captureType']): PepperSession => ({
  id, name: id, tabCount: urls.length, createdAt, isFavorite: false, captureType,
  tabs: urls.map((url, index) => ({ url, title: url, favIconUrl: '', index })),
});

describe('findDemoCapture', () => {
  it('finds the auto-capture created after the demo started', () => {
    const s = [mk('other', ['https://a.com', 'https://b.com'], 2000, 'auto_window_close'), mk('demo', DEMO_URLS, 2000, 'auto_window_close')];
    expect(findDemoCapture(s, 1000)?.id).toBe('demo');
  });
  it('ignores older sessions and manual saves', () => {
    expect(findDemoCapture([mk('old', DEMO_URLS, 500, 'auto_window_close')], 1000)).toBeUndefined();
    expect(findDemoCapture([mk('manual', DEMO_URLS, 2000, 'manual')], 1000)).toBeUndefined();
  });
  it('tolerates redirected urls with trailing paths', () => {
    const urls = DEMO_URLS.map((u) => `${u}#section`);
    expect(findDemoCapture([mk('r', urls, 2000, 'auto_window_close')], 1000)?.id).toBe('r');
  });
});
