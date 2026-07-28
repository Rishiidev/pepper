import React, { useEffect, useState } from 'react';
import { projectRepo } from '../../storage/repositories/project-repo';
import { PepperProjectEntity } from '../../storage/db';
import { PepperSession } from '../../core/types/session';
import { Layers, Plus, Trash2 } from 'lucide-react';

interface Props {
  sessions: PepperSession[];
  selectedProject: string | null;
  onSelectProject: (projectName: string | null) => void;
  onOpenCreateModal: () => void;
}

export const ProjectsOverview: React.FC<Props> = ({
  sessions,
  selectedProject,
  onSelectProject,
  onOpenCreateModal,
}) => {
  const [customProjects, setCustomProjects] = useState<PepperProjectEntity[]>([]);

  const fetchProjects = async () => {
    const list = await projectRepo.getAll();
    setCustomProjects(list);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await projectRepo.delete(id);
    await fetchProjects();
    onSelectProject(null);
  };

  const sessionProjectNames = Array.from(new Set(sessions.map((s) => s.projectName).filter(Boolean)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
            <Layers className="w-4 h-4 text-pepper-500" />
            <span>Projects Hub</span>
          </h3>
          {selectedProject && (
            <button
              onClick={() => onSelectProject(null)}
              className="text-[11px] font-semibold text-pepper-400 hover:underline ml-2"
            >
              Clear Filter
            </button>
          )}
        </div>

        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pepper-500/30 bg-pepper-500/10 hover:bg-pepper-500/20 text-pepper-400 font-bold text-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Custom User-Defined Projects */}
        {customProjects.map((proj) => {
          const matchedCount = sessions.filter(
            (s) => s.projectName && s.projectName.toLowerCase() === proj.name.toLowerCase()
          ).length;
          const isSelected = selectedProject === proj.name;

          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(isSelected ? null : proj.name)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group ${
                isSelected
                  ? 'bg-pepper-500/10 border-pepper-500/40 shadow-lg shadow-pepper-500/10'
                  : 'bg-surface-card border-border/80 hover:border-border hover:bg-surface-hover'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }} />
                  <span className="font-bold text-sm text-text-primary truncate">{proj.name}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border/60 text-text-muted shrink-0">
                  {matchedCount} sessions
                </span>
              </div>
              {proj.description && <p className="text-[11px] text-text-muted truncate">{proj.description}</p>}

              <button
                onClick={(e) => handleDeleteProject(e, proj.id)}
                className="absolute right-2 bottom-2 p-1 text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete Project"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Auto-Derived Session Projects */}
        {sessionProjectNames
          .filter((pName) => !customProjects.some((cp) => cp.name.toLowerCase() === pName?.toLowerCase()))
          .map((pName) => {
            const matchedCount = sessions.filter((s) => s.projectName === pName).length;
            const isSelected = selectedProject === pName;

            return (
              <div
                key={pName}
                onClick={() => onSelectProject(isSelected ? null : pName!)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-pepper-500/10 border-pepper-500/40 shadow-lg shadow-pepper-500/10'
                    : 'bg-surface-card border-border/80 hover:border-border hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text-primary truncate">{pName}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface border border-border/60 text-text-muted shrink-0">
                    {matchedCount} sessions
                  </span>
                </div>
                <p className="text-[11px] text-text-muted truncate">Workspace Project Category</p>
              </div>
            );
          })}
      </div>
    </div>
  );
};
