import React, { useEffect, useState, useMemo } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { focusEngine } from '../../core/engines/focus-engine';
import { activityEngine } from '../../core/engines/activity-engine';
import { FocusSession } from '../../core/types/focus-session';
import { ContributionDay, DailyActivityRecord } from '../../core/types/history-insights';
import { ContributionGraph } from './ContributionGraph';
import { DailyWorkDetailPanel } from './DailyWorkDetailPanel';
import { SearchableWorkMemory } from './SearchableWorkMemory';
import { Calendar, History, Sparkles, Brain, Clock, Layers, Filter } from 'lucide-react';

export const HistoryView: React.FC = () => {
  const { sessions, fetchSessions } = useSessionStore();
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [manualNotesMap, setManualNotesMap] = useState<Record<string, string>>({});

  const loadData = async () => {
    await fetchSessions();
    const allFocus = await focusEngine.getAllSessions();
    setFocusSessions(allFocus);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute 52-week contribution graph days
  const contributionDays = useMemo(() => {
    return activityEngine.generateContributionGrid(focusSessions, sessions, 52);
  }, [focusSessions, sessions]);

  // Compute selected daily record when a date is selected
  const selectedDailyRecord: DailyActivityRecord | null = useMemo(() => {
    if (!selectedDateStr) return null;
    const record = activityEngine.getDailyRecord(selectedDateStr, focusSessions, sessions);
    if (manualNotesMap[selectedDateStr]) {
      record.manualNotes = manualNotesMap[selectedDateStr];
    }
    return record;
  }, [selectedDateStr, focusSessions, sessions, manualNotesMap]);

  const handleSaveNotes = (dateStr: string, notes: string) => {
    setManualNotesMap((prev) => ({ ...prev, [dateStr]: notes }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4 animate-slide-up select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/80">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-pepper-500/10 text-pepper-400 border border-pepper-500/20">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-text-primary tracking-tight">Work History &amp; Contribution Memory</h2>
            <p className="text-xs text-text-muted">
              What happened? 52-week work contribution graph, daily activity timeline, and searchable memory
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-pepper-400 font-bold bg-surface-card px-3 py-1.5 rounded-xl border border-border">
          {sessions.length} Workspaces Saved &bull; {focusSessions.length} Focus Sessions Logged
        </div>
      </div>

      {/* Part 1: GitHub-Style Work Contribution Graph */}
      <ContributionGraph
        days={contributionDays}
        selectedDateStr={selectedDateStr}
        onSelectDay={(day) => setSelectedDateStr(day.dateStr)}
      />

      {/* Part 2 & 3: Daily Work Detail Panel (Shows when a date is selected) */}
      {selectedDailyRecord ? (
        <DailyWorkDetailPanel
          record={selectedDailyRecord}
          onClose={() => setSelectedDateStr(null)}
          onSaveNotes={handleSaveNotes}
        />
      ) : (
        <div className="p-6 text-center border border-dashed border-border/70 rounded-3xl bg-surface-card/30 text-xs text-text-muted space-y-1">
          <Calendar className="w-5 h-5 text-pepper-400 mx-auto mb-1" />
          <div className="font-bold text-text-primary">No Day Selected</div>
          <p>Click any cell in the contribution graph above to inspect its daily activity, AI journal, and timeline.</p>
        </div>
      )}

      {/* Part 10 & 11: Searchable Work Memory */}
      <SearchableWorkMemory
        sessions={sessions}
        focusSessions={focusSessions}
        onSelectDate={(dStr) => setSelectedDateStr(dStr)}
      />
    </div>
  );
};
