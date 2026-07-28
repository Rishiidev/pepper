import React from 'react';
import { PepperTab } from '../core/types/session';
import { CheckSquare, Square } from 'lucide-react';

interface TabChecklistProps {
  tabs: PepperTab[];
  selectedIndices: Set<number>;
  onToggleIndex: (index: number) => void;
  onToggleAll: () => void;
}

export const TabChecklist: React.FC<TabChecklistProps> = ({
  tabs,
  selectedIndices,
  onToggleIndex,
  onToggleAll,
}) => {
  const allSelected = tabs.length > 0 && selectedIndices.size === tabs.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text-muted">
          {selectedIndices.size} of {tabs.length} tabs selected
        </span>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-xs font-medium text-pepper-400 hover:text-pepper-500 transition-colors"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1 pr-1 border border-border rounded-lg p-1.5 bg-surface">
        {tabs.map((tab, idx) => {
          const isSelected = selectedIndices.has(idx);
          return (
            <div
              key={idx}
              onClick={() => onToggleIndex(idx)}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer text-xs transition-colors ${
                isSelected ? 'bg-surface-card text-text-primary' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              <button type="button" className="shrink-0 text-pepper-500">
                {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-text-muted" />}
              </button>

              <img
                src={tab.favIconUrl || '/icons/icon-16.png'}
                alt=""
                className="w-4 h-4 rounded object-cover shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/icons/icon-16.png';
                }}
              />

              <span className="truncate font-medium flex-1">{tab.title || tab.url}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
