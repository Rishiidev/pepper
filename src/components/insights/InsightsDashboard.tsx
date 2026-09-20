import React, { useEffect, useMemo, useState } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { focusEngine } from '../../core/engines/focus-engine';
import { activityEngine } from '../../core/engines/activity-engine';
import { projectRepo } from '../../storage/repositories/project-repo';
import { FocusSession } from '../../core/types/focus-session';
import { PepperProjectEntity } from '../../storage/db';
import { Button, Card, CardHeader, Chip, EmptyState, Segmented, Stat } from '../ui';

type Range = '7d' | '30d' | '90d' | 'all';
type View = 'overview' | 'weekly' | 'monthly';
type Dist = 'project' | 'workspace';

const DAYS: Record<Range, number> = { '7d': 7, '30d': 30, '90d': 90, all: 9999 };

/** Short duration for stat tiles: 0m, 45m, 1.5h */
const fmt = (secs: number) => {
  if (secs <= 0) return '0m';
  const m = Math.floor(secs / 60);
  return m < 60 ? `${m}m` : `${(secs / 3600).toFixed(1)}h`;
};

const ago = (ts: number) => {
  const d = Math.floor((Date.now() - ts) / 86_400_000);
  return d < 1 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

/** Focus time and project activity, computed only from your own saved data. */
export const InsightsDashboard: React.FC = () => {
  const { sessions, fetchSessions, restoreSession } = useSessionStore();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [projects, setProjects] = useState<PepperProjectEntity[]>([]);
  const [range, setRange] = useState<Range>('30d');
  const [view, setView] = useState<View>('overview');
  const [dist, setDist] = useState<Dist>('project');

  useEffect(() => {
    void (async () => {
      await fetchSessions();
      setFocusSessions(await focusEngine.getAllSessions());
      setProjects(await projectRepo.getAll());
    })();
  }, [fetchSessions]);

  const days = DAYS[range];
  const overview = useMemo(() => activityEngine.getFocusOverview(focusSessions, days), [focusSessions, days]);
  const distribution = useMemo(() => {
    const cutoff = Date.now() - days * 86_400_000;
    return activityEngine.getWorkDistribution(focusSessions.filter((s) => s.startedAt >= cutoff), sessions, dist);
  }, [focusSessions, sessions, days, dist]);
  const projectActivity = useMemo(() => activityEngine.getProjectMomentum(focusSessions, sessions, projects), [focusSessions, sessions, projects]);
  const patterns = useMemo(() => activityEngine.getFocusPatterns(focusSessions).filter((p) => p.confidence !== 'Insufficient data'), [focusSessions]);
  const weekly = useMemo(() => activityEngine.generateWeeklyReview(focusSessions, sessions), [focusSessions, sessions]);
  const monthly = useMemo(() => activityEngine.generateMonthlyReview(focusSessions, sessions), [focusSessions, sessions]);

  const hasData = focusSessions.some((s) => s.status === 'completed');
  const deepShare = overview.totalFocusedSeconds > 0 ? Math.round((overview.deepWorkSeconds / overview.totalFocusedSeconds) * 100) : 0;
  const maxDist = Math.max(1, ...distribution.map((d) => d.seconds));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<View>
          label="Insights view"
          value={view}
          onChange={setView}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'weekly', label: 'This week' },
            { value: 'monthly', label: 'This month' },
          ]}
        />
        {view === 'overview' && (
          <Segmented<Range>
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: '7d', label: '7 days' },
              { value: '30d', label: '30 days' },
              { value: '90d', label: '90 days' },
              { value: 'all', label: 'All' },
            ]}
          />
        )}
      </div>

      {!hasData && (
        <EmptyState title="Finish a focus session to see insights" body="Focus time, your longest sessions and project activity show up here, computed from your own sessions." />
      )}

      {view === 'overview' && hasData && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card tone="mint" pad="sm">
              <Stat label="Focused" value={fmt(overview.totalFocusedSeconds)} hint={overview.trendPercentage !== undefined ? `${overview.trendPercentage >= 0 ? '+' : ''}${overview.trendPercentage}% vs the period before` : undefined} />
            </Card>
            <Card pad="sm">
              <Stat label="Average session" value={fmt(overview.avgSessionSeconds)} />
            </Card>
            <Card pad="sm">
              <Stat label="Longest session" value={fmt(overview.longestSessionSeconds)} />
            </Card>
            <Card tone="lilac" pad="sm">
              <Stat label="In blocks of 30m+" value={`${deepShare}%`} hint={`${fmt(overview.deepWorkSeconds)} of focus`} />
            </Card>
          </div>

          <Card as="section" aria-labelledby="ins-dist" className="space-y-4">
            <CardHeader
              eyebrow="Time"
              titleId="ins-dist"
              title="Where your focus went"
              action={
                <Segmented<Dist>
                  label="Group by"
                  value={dist}
                  onChange={setDist}
                  options={[
                    { value: 'project', label: 'Project' },
                    { value: 'workspace', label: 'Workspace' },
                  ]}
                />
              }
            />
            {distribution.length === 0 ? (
              <p className="text-sm text-text-muted">No focus time in this range.</p>
            ) : (
              <ul className="space-y-2">
                {distribution.slice(0, 8).map((d) => (
                  <li key={d.name} className="flex items-center gap-3 text-sm">
                    <span className="w-40 truncate font-semibold">{d.name}</span>
                    <span className="flex-1 h-2.5 rounded-full bg-surface-active overflow-hidden" aria-hidden="true">
                      <span className="block h-full rounded-full bg-text-primary" style={{ width: `${Math.max(3, (d.seconds / maxDist) * 100)}%` }} />
                    </span>
                    <span className="w-24 text-right font-mono text-xs text-text-secondary">
                      {fmt(d.seconds)} · {Math.round(d.percentage)}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {projectActivity.length > 0 && (
            <Card as="section" aria-labelledby="ins-proj" className="space-y-3">
              <CardHeader eyebrow="Projects" titleId="ins-proj" title="Project activity" />
              <ul className="divide-y divide-border">
                {projectActivity.map((p) => (
                  <li key={p.projectId} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{p.projectName}</p>
                      <p className="text-xs text-text-muted">
                        {fmt(p.timeInvestedSeconds)} focused · last active {ago(p.lastActiveTimestamp)}
                      </p>
                    </div>
                    <Chip tone={p.momentum === 'Strong' || p.momentum === 'Growing' ? 'mint' : 'neutral'}>{p.momentum === 'Paused' ? 'Paused' : p.momentum === 'Steady' ? 'Steady' : 'Active'}</Chip>
                    {p.targetWorkspaceId && (
                      <Button size="sm" onClick={() => void restoreSession(p.targetWorkspaceId!)}>
                        Resume
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {patterns.length > 0 && (
            <Card as="section" aria-labelledby="ins-patterns" className="space-y-3">
              <CardHeader eyebrow="Patterns" titleId="ins-patterns" title="What your sessions show" />
              <ul className="space-y-3">
                {patterns.map((p) => (
                  <li key={p.id}>
                    <p className="text-sm font-semibold">{p.title}</p>
                    <p className="text-sm text-text-secondary">{p.description}</p>
                    <p className="text-xs text-text-muted mt-0.5">{p.evidence}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      {view === 'weekly' && (
        <Card tone="lilac" className="space-y-4">
          <CardHeader eyebrow={weekly.weekLabel} title={`${fmt(weekly.totalFocusedSeconds)} focused this week`} />
          <p className="text-sm">{weekly.aiReflection}</p>
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <div>
              <dt className="eyebrow opacity-75">Most active project</dt>
              <dd className="font-semibold">{weekly.mostActiveProject || '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow opacity-75">Strongest day</dt>
              <dd className="font-semibold">{weekly.strongestDay || '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow opacity-75">Longest session</dt>
              <dd className="font-semibold">{fmt(weekly.longestSessionSeconds)}</dd>
            </div>
          </dl>
          <p className="text-sm font-semibold">{weekly.recommendation}</p>
        </Card>
      )}

      {view === 'monthly' && (
        <Card tone="lilac" className="space-y-4">
          <CardHeader eyebrow={monthly.monthLabel} title={`${fmt(monthly.totalFocusedSeconds)} focused this month`} />
          <p className="text-sm">{monthly.aiSummary}</p>
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="eyebrow opacity-75">Top project</dt>
              <dd className="font-semibold">{monthly.topProject || '—'}</dd>
            </div>
            <div>
              <dt className="eyebrow opacity-75">Longest session</dt>
              <dd className="font-semibold">{fmt(monthly.longestSessionSeconds)}</dd>
            </div>
          </dl>
          {monthly.nextMonthRecommendations.length > 0 && (
            <ul className="list-disc pl-5 text-sm space-y-1">
              {monthly.nextMonthRecommendations.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
};
