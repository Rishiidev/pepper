import React, { useEffect, useRef, useState } from 'react';
import { Check, Pencil } from 'lucide-react';

interface Props {
  value: string;
  onSave: (name: string) => Promise<void> | void;
  /** Start in edit mode with the text selected (used right after a capture). */
  autoFocus?: boolean;
  label?: string;
  className?: string;
}

/** Click-to-edit title. Enter or blur saves, Escape cancels. Fully keyboard operable. */
export const InlineRename: React.FC<Props> = ({ value, onSave, autoFocus = false, label = 'Workspace name', className = '' }) => {
  const [editing, setEditing] = useState(autoFocus);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== value) await onSave(next);
    else setDraft(value);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={`${label}: ${value}. Press to rename`}
        className={`group inline-flex items-center gap-1.5 text-left font-semibold text-current hover:underline underline-offset-2 ${className}`}
      >
        <span className="truncate">{value}</span>
        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 shrink-0" aria-hidden="true" />
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <input
        ref={inputRef}
        value={draft}
        aria-label={label}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void commit();
          } else if (e.key === 'Escape') {
            e.stopPropagation();
            setDraft(value);
            setEditing(false);
          }
        }}
        className="min-w-0 flex-1 bg-black/10 dark:bg-white/10 border border-current/50 rounded-input px-2 py-1 text-sm font-semibold text-current"
      />
      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    </span>
  );
};
