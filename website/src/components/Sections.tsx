import { DemoLoop } from './DemoLoop';

/** Swap for the Chrome Web Store listing once it is published. */
export const INSTALL_URL = 'https://github.com/Rishiidev/pepper#install';
const REPO_URL = 'https://github.com/Rishiidev/pepper';
const BASE = import.meta.env.BASE_URL;

function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={(size * 456) / 519} height={size} viewBox="0 0 456 519" fill="currentColor" aria-hidden="true">
      <path d="M0 0H456V409H194V519H0V262H194V342H262V194H0Z" />
    </svg>
  );
}

/** Real screenshot from the extension, light or dark by system preference. */
function Shot({ name, alt, className = '' }: { name: string; alt: string; className?: string }) {
  return (
    <picture>
      <source srcSet={`${BASE}img/${name}-dark.png`} media="(prefers-color-scheme: dark)" />
      <img src={`${BASE}img/${name}-light.png`} alt={alt} width={1280} height={800} loading="lazy" className={`w-full h-auto rounded-card border border-line ${className}`} />
    </picture>
  );
}

const Section = ({ id, eyebrow, title, intro, children }: { id?: string; eyebrow: string; title: string; intro?: string; children: React.ReactNode }) => (
  <section id={id} aria-labelledby={`${id ?? eyebrow}-t`} className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
    <div className="mx-auto max-w-2xl text-center mb-12">
      <p className="eyebrow text-muted">{eyebrow}</p>
      <h2 id={`${id ?? eyebrow}-t`} className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">{title}</h2>
      {intro && <p className="mt-4 text-lg text-ink-2">{intro}</p>}
    </div>
    {children}
  </section>
);

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-canvas/95 border-b border-line">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <a href="#top" className="flex items-center gap-2 font-bold text-lg"><Mark /> Pepper</a>
        <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-ink-2">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#privacy" className="hover:text-ink">Privacy</a>
          <a href="#faq" className="hover:text-ink">FAQ</a>
        </div>
        <a href={INSTALL_URL} className="btn btn-primary !h-10 !px-5 !text-sm">Get Pepper</a>
      </nav>
    </header>
  );
}

export function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-5 pt-16 sm:pt-24 pb-8 text-center">
      <p className="eyebrow text-muted">For Chrome, Edge, Brave and Arc</p>
      <h1 className="mx-auto mt-4 max-w-3xl text-5xl sm:text-7xl font-bold tracking-tight leading-[1.02]">Close it. It’s saved.</h1>
      <p className="mx-auto mt-6 max-w-xl text-lg sm:text-xl text-ink-2">
        Pepper saves a browser window the moment you close it, and brings every tab back in one click. No folders, no naming, no lost work.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href={INSTALL_URL} className="btn btn-primary">Get Pepper for Chrome</a>
        <a href="#demo" className="btn btn-secondary">See how it works</a>
      </div>
      <p className="mt-4 text-sm text-muted">Free. No account. Works offline. Chrome Web Store listing coming soon.</p>
      <div className="mt-14"><Shot name="2-restore" alt="Pepper home: a Continue where you left off card with a Resume button, a focus timer, today's activity and recent workspaces." className="shadow-card" /></div>
    </section>
  );
}

export function Trust() {
  const items = ['Stays on your device', 'No account, no tracking', 'Works fully offline', 'Open source'];
  return (
    <ul className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-8 text-sm font-semibold text-ink-2" aria-label="Why people trust Pepper">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-2"><span aria-hidden="true">✓</span>{t}</li>
      ))}
    </ul>
  );
}

export function DemoSection() {
  return (
    <Section id="demo" eyebrow="See it work" title="Ten seconds, three steps" intro="There is nothing to configure. Close a window and it is saved.">
      <DemoLoop />
    </Section>
  );
}

export function Features() {
  const cards: Array<{ tone: string; eyebrow: string; title: string; body: string; extra?: React.ReactNode }> = [
    { tone: 'bg-zmint text-zmint-fg border-transparent', eyebrow: 'Automatic', title: 'Every closed window is saved', body: 'Even if Chrome crashes. Pepper rebuilds your last session and offers it back.' },
    { tone: 'bg-zink text-zink-fg border-transparent', eyebrow: 'One click', title: 'Restore exactly where you were', body: 'Same tabs, same order, the tab you were on is in front. Or reopen your last closed window from the toolbar.' },
    { tone: 'bg-card', eyebrow: 'Search', title: 'Find anything with ⌘K', body: 'Type what you remember, even with typos. It searches names, tab titles and sites, and works offline.' },
    { tone: 'bg-zlilac text-zlilac-fg border-transparent', eyebrow: 'Timeline', title: 'Scrub back through your day', body: 'Optional and private. See what was open at 10:42, and pull any tab into a workspace.' },
    { tone: 'bg-zbutter text-zbutter-fg border-transparent', eyebrow: 'Workspaces', title: 'Add any tab in one keystroke', body: 'Alt+Shift+A adds the current tab to your active workspace. Pepper also suggests tabs that belong together.' },
    { tone: 'bg-zmint text-zmint-fg border-transparent', eyebrow: 'Focus', title: 'A Pomodoro that finishes itself', body: 'Start 25 minutes from the popup or side panel. The timer and toolbar badge keep running with no page open.' },
  ];
  return (
    <Section id="features" eyebrow="Features" title="Everything you need to never lose your place">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.title} className={`card p-6 flex flex-col gap-3 min-h-56 ${c.tone}`}>
            <p className="eyebrow opacity-75">{c.eyebrow}</p>
            <h3 className="text-xl font-bold leading-snug">{c.title}</h3>
            <p className="opacity-90">{c.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Shot name="3-find" alt="The ⌘K search finding a workspace after a typo." />
        <Shot name="4-timeline" alt="The timeline showing a day of browsing with a scrubber." />
      </div>
    </Section>
  );
}

export function HowItWorks() {
  const steps = [
    ['Install', 'Add Pepper to Chrome. There is no sign-up.'],
    ['Work as usual', 'Pepper watches which windows and tabs are open. It only keeps titles and addresses, never page content.'],
    ['Close and come back', 'Close a window any time. Open Pepper, press Resume, and you are back.'],
  ];
  return (
    <Section eyebrow="How it works" title="Three steps, and the first one is the only setup">
      <ol className="grid gap-4 md:grid-cols-3">
        {steps.map(([t, b], i) => (
          <li key={t} className="card p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-canvas font-bold" aria-hidden="true">{i + 1}</span>
            <h3 className="mt-4 text-xl font-bold">{t}</h3>
            <p className="mt-1 text-ink-2">{b}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

const PERMISSIONS: Array<[string, string]> = [
  ['tabs', 'Read the titles and addresses of your open tabs so Pepper can save and restore them.'],
  ['storage and unlimitedStorage', 'Keep your workspaces on your own device, with no size cap.'],
  ['activeTab and scripting', 'Show the quick-save panel on the page when you press the shortcut.'],
  ['contextMenus', 'The right-click “Add this tab to workspace” menu.'],
  ['notifications', 'An optional, quiet “saved” notification.'],
  ['sessions', 'Reopen your last closed window with its full history.'],
  ['alarms', 'Finish your focus timer and keep the timeline accurate with no page open.'],
  ['idle', 'Know when you step away, only if you turn the timeline on.'],
  ['sidePanel', 'The optional side panel.'],
  ['AI provider addresses', 'Only if you add your own key. Requests go straight from your browser to that provider.'],
];

export function Privacy() {
  return (
    <Section id="privacy" eyebrow="Privacy" title="Your tabs never leave your computer" intro="No account, no servers, no analytics. Pepper works fully offline. Here is every permission and why it is needed.">
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="card p-6 bg-zmint text-zmint-fg border-transparent space-y-3">
          <p className="eyebrow opacity-75">What Pepper stores</p>
          <ul className="space-y-2 font-semibold">
            <li>Workspaces you save, and windows it auto-saves</li>
            <li>Your settings</li>
            <li>An optional timeline, only if you turn it on</li>
          </ul>
          <p>Nothing is uploaded. Incognito is never recorded, and you can block any site.</p>
        </div>
        <details className="card p-6" open>
          <summary className="cursor-pointer text-lg font-bold">Permissions, in plain words</summary>
          <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {PERMISSIONS.map(([k, v]) => (
              <div key={k}>
                <dt className="font-bold">{k}</dt>
                <dd className="text-ink-2">{v}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </Section>
  );
}

export function Faq() {
  const items: Array<[string, string]> = [
    ['Does Pepper upload my browsing?', 'No. Everything stays in your browser on your device. There is no account and no server. The optional AI feature only runs if you add your own key, and then goes straight to the provider you choose.'],
    ['What happens when Chrome crashes?', 'Pepper writes your window state continuously. After a crash or forced quit, it rebuilds the windows it had not finished saving and offers to restore them.'],
    ['Will it slow my browser down?', 'No. It listens for tab events and does small writes. The optional timeline is off by default.'],
    ['Does it need AI?', 'No. Names, search and everything else work on your device. AI is an optional extra for smarter titles.'],
    ['Can I back up my workspaces?', 'Yes. Export a JSON backup any time and import it on another computer. API keys are never included.'],
    ['Is it free?', 'Yes, and open source.'],
  ];
  return (
    <Section id="faq" eyebrow="Questions" title="Good things to ask">
      <div className="mx-auto max-w-3xl space-y-3">
        {items.map(([q, a]) => (
          <details key={q} className="card p-5">
            <summary className="cursor-pointer text-lg font-bold">{q}</summary>
            <p className="mt-3 text-ink-2">{a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24 text-center">
      <div className="card bg-zink text-zink-fg border-transparent p-10 sm:p-16">
        <h2 className="text-3xl sm:text-5xl font-bold tracking-tight">Never rebuild your tabs again.</h2>
        <p className="mx-auto mt-4 max-w-lg text-lg opacity-85">Install once. The next time you close a window, it is already saved.</p>
        <div className="mt-8"><a href={INSTALL_URL} className="btn btn-primary">Get Pepper for Chrome</a></div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-2">
        <span className="flex items-center gap-2 font-bold text-ink"><Mark size={18} /> Pepper</span>
        <nav aria-label="Footer" className="flex gap-6">
          <a href={REPO_URL} className="hover:text-ink">GitHub</a>
          <a href={`${REPO_URL}/blob/main/SECURITY.md`} className="hover:text-ink">Security</a>
          <a href={`${REPO_URL}/blob/main/LICENSE`} className="hover:text-ink">License</a>
        </nav>
      </div>
    </footer>
  );
}

/** Keeps the one action in reach on phones. */
export function StickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 p-3 sm:hidden">
      <a href={INSTALL_URL} className="btn btn-primary w-full">Get Pepper for Chrome</a>
    </div>
  );
}
