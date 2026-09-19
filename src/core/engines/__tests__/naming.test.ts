import { describe, it, expect } from 'vitest';
import { generateSessionName, cleanTitle, extractTopic, baseDomain } from '../session-naming';
import { PepperTab } from '../../types/session';

const tab = (url: string, title: string, i = 0): PepperTab => ({ url, title, favIconUrl: '', index: i });

describe('session naming', () => {
  it('strips site suffix from titles', () => {
    expect(cleanTitle('Webhooks | Stripe Documentation', 'docs.stripe.com')).toBe('Webhooks');
    expect(cleanTitle('GitHub', 'github.com')).toBe('GitHub');
  });

  it('finds the topic shared across titles', () => {
    const tabs = [
      tab('https://docs.stripe.com/webhooks', 'Stripe webhooks guide - Stripe Docs'),
      tab('https://stackoverflow.com/q/1', 'Verify stripe webhooks signature - Stack Overflow'),
      tab('https://github.com/x/y', 'stripe-webhooks-example'),
    ];
    expect(extractTopic(tabs)).toMatch(/webhooks/i);
  });

  it('combines topic and intent', () => {
    const tabs = [
      tab('https://github.com/a/b/issues/1', 'Fix checkout bug - Issue #1'),
      tab('https://stackoverflow.com/q/2', 'Checkout bug in React - Stack Overflow'),
    ];
    const name = generateSessionName(tabs, ['github.com', 'stackoverflow.com']);
    expect(name).toContain('Checkout');
    expect(name).toContain('·');
    expect(name).toContain('Development');
  });

  it('falls back to intent when titles share nothing', () => {
    const tabs = [tab('https://figma.com/a', 'Alpha'), tab('https://dribbble.com/b', 'Beta')];
    expect(generateSessionName(tabs, ['figma.com', 'dribbble.com'])).toMatch(/Design/);
  });

  it('falls back to domain for unknown sites', () => {
    const tabs = [tab('https://acme.io/a', ''), tab('https://acme.io/b', '')];
    expect(generateSessionName(tabs, ['acme.io'])).toContain('Acme');
  });

  it('never exceeds 48 chars', () => {
    const long = 'supercalifragilisticexpialidocious hyperbolic'.repeat(3);
    const tabs = [tab('https://a.dev/1', long), tab('https://b.dev/2', long)];
    expect(generateSessionName(tabs, ['a.dev']).length).toBeLessThanOrEqual(48);
  });

  it('resolves base domains', () => {
    expect(baseDomain('www.docs.google.com')).toBe('docs.google.com');
    expect(baseDomain('blog.example.co')).toBe('example.co');
  });
});
