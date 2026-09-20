import React from 'react';
import { Card, CardHeader, Button } from '../ui';
import { ThemeToggle } from './ThemeToggle';
import { TrackingSettings } from './TrackingSettings';
import { DataPanel } from './DataPanel';
import { IntelligenceSettings } from '../IntelligenceSettings';

interface Props {
  onStartTour: () => void;
}

const STORED = [
  ['Workspaces', 'The tabs you save, and windows Pepper auto-saves, in this browser.'],
  ['Session timeline', 'Only if you turn it on. Tab titles, sites and times, never page contents.'],
  ['Settings and counters', 'Your preferences and a few local counters that power the checklist.'],
  ['AI keys', 'Only if you add one. Stored in this browser, sent only to the provider you pick.'],
];

/** Everything configurable, grouped into cards. */
export const SettingsView: React.FC<Props> = ({ onStartTour }) => (
  <section aria-labelledby="settings-title" className="space-y-5">
    <h1 id="settings-title" className="text-[28px] font-bold leading-tight">
      Settings
    </h1>

    <Card as="section" aria-labelledby="appearance-title" className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 id="appearance-title" className="text-base font-bold">
          Appearance
        </h2>
        <p className="text-sm text-text-muted">Follow your system, or pick a theme.</p>
      </div>
      <ThemeToggle />
    </Card>

    <TrackingSettings />
    <DataPanel />

    <Card as="section" aria-labelledby="stored-title" tone="mint" className="space-y-3">
      <CardHeader eyebrow="Privacy" titleId="stored-title" title="What Pepper stores" />
      <dl className="grid gap-3 sm:grid-cols-2">
        {STORED.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm font-bold">{k}</dt>
            <dd className="text-sm opacity-90">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm font-semibold">Nothing is uploaded. There is no account and no tracking.</p>
    </Card>

    <IntelligenceSettings />

    <Card as="section" className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-base font-bold">Getting started</h2>
        <p className="text-sm text-text-muted">Replay the 10-second demo any time.</p>
      </div>
      <Button onClick={onStartTour}>Take the tour</Button>
    </Card>
  </section>
);
