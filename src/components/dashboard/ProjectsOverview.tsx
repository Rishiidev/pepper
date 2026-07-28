import React from 'react';
import { DEFAULT_PROJECTS, PepperProject } from '../../core/types/project';
import { PepperSession } from '../../core/types/session';
import { Layers } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
  selectedProject: string | null;
  onSelectProject: (projectName: string | null) => void;
}

export const ProjectsOverview: React.FC<Props> = ({ sessions, selectedProject, onSelectProject }) => {
  // Aggregate actual sessions per project
  const projectStats = DEFAULT_PROJECTS.map((proj) => {
    const matchedCount = sessions.filter(
      (s) => s.projectName && s.projectName.toLowerCase().includes(proj.name.replace(/^[^\s]+\s*/, '').toLowerCase())
    ).length;
    return {
      ...proj,
      sessionCount: matchedCount,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
          <Layers className="w-4 h-4 text-pepper-500" />
          <span>Projects</span>
        </h3>
        {selectedProject && (
          <button
            onClick={() => onSelectProject(null)}
            className="text-[11px] font-semibold text-pepper-400 hover:underline"
          >
            Clear Project Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {projectStats.map((proj) => {
          const isSelected = selectedProject === proj.name;
          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(isSelected ? null : proj.name)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                isSelected
                  ? 'bg-pepper-500/10 border-pepper-500/40 shadow-lg shadow-pepper-500/10'
                  : 'bg-surface-card border-border/80 hover:border-border hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-text-primary">{proj.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border/60 text-text-muted">
                  {proj.sessionCount} sessions
                </span>
              </div>
              <p className="text-[11px] text-text-muted truncate">{proj.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
