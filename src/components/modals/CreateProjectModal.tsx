import React, { useState } from 'react';
import { projectRepo } from '../../storage/repositories/project-repo';
import { X, Plus, Layers } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const COLOR_OPTIONS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];

export const CreateProjectModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLOR_OPTIONS[0]);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;

    await projectRepo.save({
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: name.trim(),
      color,
      icon: 'Folder',
      description: description.trim() || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    setName('');
    setDescription('');
    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-text-primary">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-pepper-500/10 text-pepper-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Create New Project</h3>
              <p className="text-[11px] text-text-muted">Organize workspaces into first-class project hubs</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:bg-surface-hover">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 🛒 BunchShop Checkout"
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-pepper-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-pepper-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-2">Accent Color</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((c) => (
                <div
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full cursor-pointer transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-surface-card' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-xs font-semibold text-text-muted hover:bg-surface-hover">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-pepper-500 hover:bg-pepper-600 font-bold text-xs text-white rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-pepper-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>
      </div>
    </div>
  );
};
