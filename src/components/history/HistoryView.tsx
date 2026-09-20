import React, { useEffect, useState, useMemo } from 'react';
import { useSessionStore } from '../../stores/session-store';
import { focusEngine } from '../../core/engines/focus-engine';
import { activityEngine } from '../../core/engines/activity-engine';
import { FocusSession } from '../../core/types/focus-session';
import { ContributionDay, DailyActivityRecord } from '../../core/types/history-insights';
import { ContributionGraph } from './ContributionGraph';
import { DailyWorkDetailPanel } from './DailyWorkDetailPanel';

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
    return activityEngine.generateContributionGrid(focusSessions, sessions, 13);
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
    <div className="space-y-5">
      <ContributionGraph days={contributionDays} selectedDateStr={selectedDateStr} onSelectDay={(day) => setSelectedDateStr(day.dateStr)} />

      {selectedDailyRecord ? (
        <DailyWorkDetailPanel record={selectedDailyRecord} onClose={() => setSelectedDateStr(null)} onSaveNotes={handleSaveNotes} />
      ) : (
        <p className="text-sm text-text-muted">Pick a day above to see what you focused on and which workspaces you used. Search everything with ⌘K.</p>
      )}
    </div>
  );
};
