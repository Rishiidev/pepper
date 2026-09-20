import React, { useEffect, useState } from 'react';
import { Clock, Search, Timer } from 'lucide-react';
import { Button, IconButton } from './Button';
import { Card, CardHeader, BentoGrid, Tone } from './Card';
import { Stat } from './Stat';
import { Chip, Kbd } from './Chip';
import { FaviconStack } from './FaviconStack';
import { ProgressRing } from './ProgressRing';
import { Sparkline } from './Sparkline';
import { Switch } from './Switch';
import { Field, Input } from './Field';
import { Segmented } from './Segmented';
import { Dialog } from './Dialog';
import { EmptyState, Skeleton } from './EmptyState';
import { Menu } from './Menu';
import { ToastHost } from './Toast';
import { toast } from './toast-store';
import { ThemeToggle } from '../settings/ThemeToggle';

function luminance(hex: string): number {
  let h = hex.trim().replace(/^#/, '');
  // CSS minifiers shorten #FFFFFF to #fff
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const m = h.match(/^([0-9a-f]{6})$/i);
  if (!m) return NaN;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)];
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const PAIRS: Array<[string, string, string]> = [
  ['Text on card', '--pp-text', '--pp-card'],
  ['Secondary text on card', '--pp-text-2', '--pp-card'],
  ['Muted text on card', '--pp-text-muted', '--pp-card'],
  ['Text on canvas', '--pp-text', '--pp-canvas'],
  ['Muted text on canvas', '--pp-text-muted', '--pp-canvas'],
  ['Red text on card', '--pp-red-text', '--pp-card'],
  ['Ink card text', '--pp-ink-fg', '--pp-ink-bg'],
  ['Ink card accent', '--pp-ink-accent', '--pp-ink-bg'],
  ['Mint card text', '--pp-mint-fg', '--pp-mint-bg'],
  ['Mint card accent', '--pp-mint-accent', '--pp-mint-bg'],
  ['Lilac card text', '--pp-lilac-fg', '--pp-lilac-bg'],
  ['Lilac card accent', '--pp-lilac-accent', '--pp-lilac-bg'],
  ['Butter card text', '--pp-butter-fg', '--pp-butter-bg'],
  ['Butter card accent', '--pp-butter-accent', '--pp-butter-bg'],
];

const ContrastTable: React.FC = () => {
  const [rows, setRows] = useState<Array<{ label: string; ratio: number; fg: string; bg: string }>>([]);
  useEffect(() => {
    const compute = () => {
      const cs = getComputedStyle(document.documentElement);
      const v = (n: string) => cs.getPropertyValue(n).trim();
      const red = v('--pp-red');
      setRows([
        ...PAIRS.map(([label, fg, bg]) => ({ label, fg: v(fg), bg: v(bg), ratio: contrast(v(fg), v(bg)) })),
        { label: 'White on red button', fg: '#FFFFFF', bg: red, ratio: contrast('#FFFFFF', red) },
      ]);
    };
    compute();
    const obs = new MutationObserver(compute);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return (
    <table className="w-full text-sm" data-testid="contrast-table">
      <thead>
        <tr className="text-left text-text-muted">
          <th className="py-1 font-semibold">Pair</th>
          <th className="font-semibold">Ratio</th>
          <th className="font-semibold">AA</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} data-testid="contrast-row" data-pass={r.ratio >= 4.5} className="border-t border-border">
            <td className="py-1.5">
              <span className="inline-block w-4 h-4 rounded-full align-middle mr-2 border border-border" style={{ background: r.fg }} />
              <span className="inline-block w-4 h-4 rounded-full align-middle mr-2 border border-border" style={{ background: r.bg }} />
              {r.label}
            </td>
            <td className="font-mono">{r.ratio.toFixed(2)}:1</td>
            <td className={r.ratio >= 4.5 ? 'text-text-primary' : 'text-pepper-400'}>{r.ratio >= 4.5 ? 'Pass' : 'Fail'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const sample = ['github.com', 'figma.com', 'notion.so', 'stripe.com', 'linear.app', 'vercel.com', 'x.com'].map((h) => ({ url: `https://${h}` }));

/** Living style guide: every primitive in the current theme. Open with ?view=design. */
export const DesignPage: React.FC = () => {
  const [on, setOn] = useState(true);
  const [seg, setSeg] = useState<'a' | 'b' | 'c'>('a');
  const [dialog, setDialog] = useState(false);
  const tones: Tone[] = ['paper', 'ink', 'mint', 'lilac', 'butter'];

  return (
    <main className="min-h-screen p-6 max-w-[1120px] mx-auto space-y-8">
      <ToastHost />
      <header className="flex items-center justify-between">
        <div>
          <p className="eyebrow text-text-muted">Pepper</p>
          <h1 className="text-[28px] font-bold leading-tight">Design system</h1>
        </div>
        <ThemeToggle />
      </header>

      <section aria-labelledby="ds-cards" className="space-y-3">
        <h2 id="ds-cards" className="text-xl font-bold">Cards and zones</h2>
        <BentoGrid>
          {tones.map((t) => (
            <Card key={t} tone={t} className="col-span-12 sm:col-span-6 lg:col-span-4" data-testid={`card-${t}`}>
              <CardHeader eyebrow={t === 'ink' ? 'Resume' : t === 'mint' ? 'Focus' : t === 'lilac' ? 'Timeline' : t === 'butter' ? 'Needs attention' : 'Default'} title={`${t[0].toUpperCase()}${t.slice(1)} card`} icon={<Clock className="w-4 h-4" />} />
              <div className="flex items-end justify-between mt-4">
                <Stat label="Active today" value="3h 10m" />
                <FaviconStack items={sample} max={4} ring={t === 'paper' ? 'var(--pp-card)' : `var(--pp-${t}-bg)`} />
              </div>
            </Card>
          ))}
        </BentoGrid>
      </section>

      <section aria-labelledby="ds-buttons" className="space-y-3">
        <h2 id="ds-buttons" className="text-xl font-bold">Buttons, chips and controls</h2>
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Save window</Button>
            <Button variant="secondary">Restore</Button>
            <Button variant="ghost">Cancel</Button>
            <Button variant="primary" size="sm">Small</Button>
            <IconButton aria-label="Search"><Search className="w-4 h-4" /></IconButton>
            <Chip>Auto-saved</Chip>
            <Chip tone="mint">Focus</Chip>
            <Chip tone="lilac">Timeline</Chip>
            <Chip tone="butter">Recovered</Chip>
            <Kbd>⌘K</Kbd>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={on} onChange={setOn} label="Close tabs after saving" />
              Close tabs after saving
            </label>
            <Segmented label="Example" value={seg} onChange={setSeg} options={[{ value: 'a', label: 'Today' }, { value: 'b', label: 'Yesterday' }, { value: 'c', label: 'Pick day' }]} />
            <Field label="Workspace name" hint="Shown everywhere" className="w-64">
              {(p) => <Input {...p} placeholder="Stripe webhooks" />}
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => toast('Deleted “Stripe Webhooks”', { actionLabel: 'Undo', onAction: () => { toast('Restored'); } })}>Show undo toast</Button>
            <Button onClick={() => setDialog(true)}>Open dialog</Button>
            <Menu triggerLabel="More actions" trigger={<span className="inline-flex h-10 items-center rounded-full border border-border-strong px-5 text-sm font-semibold">Menu</span>} items={[{ label: 'Make active', onSelect: () => { toast('Now active'); } }, { label: 'Rename', onSelect: () => undefined }, { label: 'Delete', danger: true, onSelect: () => undefined }]} />
          </div>
        </Card>
      </section>

      <section aria-labelledby="ds-data" className="space-y-3">
        <h2 id="ds-data" className="text-xl font-bold">Data</h2>
        <BentoGrid>
          <Card tone="mint" className="col-span-12 sm:col-span-6 lg:col-span-4 flex items-center gap-4">
            <ProgressRing value={0.62} label="Focus progress" size={88}>
              <Timer className="w-5 h-5" aria-hidden="true" />
            </ProgressRing>
            <Stat label="Focus" value="15:20" size="md" hint="of 25:00" />
          </Card>
          <Card tone="lilac" className="col-span-12 sm:col-span-6 lg:col-span-4">
            <Stat label="Today" value="3h 10m" />
            <Sparkline values={[1, 3, 2, 6, 4, 7, 5, 8]} className="mt-3 w-full" width={240} />
          </Card>
          <EmptyState className="col-span-12 lg:col-span-4" icon={<Clock className="w-4 h-4" />} title="Nothing here yet" body="Close a window and Pepper saves it for you." action={<Button variant="primary" size="sm">Try the demo</Button>} />
        </BentoGrid>
        <Card className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      </section>

      <section aria-labelledby="ds-type" className="space-y-3">
        <h2 id="ds-type" className="text-xl font-bold">Type</h2>
        <Card className="space-y-2">
          <p className="display-number">48 display</p>
          <p className="text-[28px] font-bold leading-tight">28 Heading one</p>
          <p className="text-xl font-bold">20 Heading two</p>
          <p className="text-base font-bold">16 Heading three</p>
          <p className="text-sm">14 Body text is what most of the interface uses, with a comfortable 20px line.</p>
          <p className="text-xs text-text-muted">12 Small text is the minimum size anywhere.</p>
          <p className="eyebrow text-text-muted">Eyebrow label</p>
        </Card>
      </section>

      <section aria-labelledby="ds-contrast" className="space-y-3">
        <h2 id="ds-contrast" className="text-xl font-bold">Contrast (WCAG AA needs 4.5:1)</h2>
        <Card><ContrastTable /></Card>
      </section>

      <Dialog open={dialog} onClose={() => setDialog(false)} title="Example dialog" footer={<><Button onClick={() => setDialog(false)}>Cancel</Button><Button variant="primary" onClick={() => setDialog(false)}>Confirm</Button></>}>
        Focus is trapped here. Press Escape to close.
      </Dialog>
    </main>
  );
};
