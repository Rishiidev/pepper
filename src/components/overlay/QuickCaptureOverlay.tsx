import React, { useState, useEffect, useRef } from 'react';
import { PepperTab } from '../../core/types/session';
import { localNamingEngine } from '../../core/engines/local-naming-engine';
import { Sparkles, Layers, CheckCircle2, AlertCircle, X, Cpu, RotateCcw, ArrowRight, FolderKanban, Tag } from 'lucide-react';

export interface QuickCaptureTabMeta {
  tabs: PepperTab[];
  domainCount: number;
  estimatedRamSavedMb: number;
  projects: string[];
}

interface Props {
  meta: QuickCaptureTabMeta;
  onSave: (title: string, projectName: string, tags: string[], closeTabs: boolean) => Promise<boolean>;
  onClose: () => void;
}

export const QuickCaptureOverlay: React.FC<Props> = ({ meta, onSave, onClose }) => {
  const localGen = localNamingEngine.generateFallbackTitle(meta.tabs);

  const [title, setTitle] = useState(localGen.title);
  const [selectedProject, setSelectedProject] = useState(meta.projects[0] || 'General');
  const [tags, setTags] = useState<string[]>(localGen.tags);
  const [saveMode, setSaveMode] = useState<'save_and_close' | 'save_only'>('save_and_close');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus title input when overlay opens
  useEffect(() => {
    setTimeout(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }, 50);
  }, []);

  // Focus management: Trap focus & setup hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent keyboard events from leaking to host webpage
      e.stopPropagation();

      // Escape: Close overlay
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Cmd+Enter or Ctrl+Enter: Save & Close Tabs
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecuteSave(true);
        return;
      }

      // Enter (without Cmd/Ctrl): Save using current mode
      if (e.key === 'Enter' && document.activeElement !== titleInputRef.current) {
        e.preventDefault();
        handleExecuteSave(saveMode === 'save_and_close');
        return;
      }

      // Cmd+E: Focus Title Input
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
        return;
      }

      // Cmd+R: Regenerate Local Fallback Title
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        const fresh = localNamingEngine.generateFallbackTitle(meta.tabs);
        setTitle(fresh.title);
        setTags(fresh.tags);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [saveMode, title, selectedProject, tags]);

  const handleExecuteSave = async (closeTabs: boolean) => {
    if (status === 'saving' || status === 'success') return;

    setStatus('saving');
    setErrorMessage(null);

    const success = await onSave(title, selectedProject, tags, closeTabs);

    if (success) {
      setStatus('success');
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setStatus('error');
      setErrorMessage('Could not save workspace. Tabs remain open.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        backgroundColor: 'rgba(9, 9, 11, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '42%',
          transform: 'translate(-50%, -50%)',
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '80vh',
          backgroundColor: '#121316',
          border: '1px solid rgba(249, 115, 22, 0.3)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 30px rgba(249, 115, 22, 0.15)',
          color: '#f4f4f5',
          overflow: 'hidden',
          animation: 'pepperSlideUp 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Style Tag for internal animation */}
        <style>{`
          @keyframes pepperSlideUp {
            from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}</style>

        {/* Header Bar */}
        <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontWeight: 800, fontSize: '13px' }}>
              P
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f97316' }}>
                PEPPER &bull; Quick Capture
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#f4f4f5' }}>
                Current Browser Workspace
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', padding: '4px', borderRadius: '6px' }}
          >
            <X style={{ width: '18px', height: '18px' }} />
          </button>
        </div>

        {/* Body Section */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {status === 'success' ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 style={{ width: '42px', height: '42px', color: '#10b981' }} />
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#f4f4f5' }}>Workspace Saved to Pepper</div>
              <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                "{title}" &bull; {meta.tabs.length} tabs captured ({meta.estimatedRamSavedMb} MB recovered)
              </div>
            </div>
          ) : (
            <>
              {/* Workspace Title Input */}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: '6px' }}>
                  Workspace Name
                </label>
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter workspace name..."
                  style={{
                    width: '100%',
                    backgroundColor: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#f4f4f5',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Stats Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '12px', color: '#a1a1aa' }}>
                <span style={{ fontWeight: 700, color: '#f4f4f5' }}>{meta.tabs.length} Tabs</span>
                <span>&bull;</span>
                <span>{meta.domainCount} Domains</span>
                <span>&bull;</span>
                <span style={{ color: '#f97316', fontWeight: 700 }}>~{meta.estimatedRamSavedMb} MB RAM Recoverable</span>
              </div>

              {/* Project & Tags Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: '6px' }}>
                    Project
                  </label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#f4f4f5',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="General">General</option>
                    {meta.projects.filter((p) => p !== 'General').map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a1a1aa', marginBottom: '6px' }}>
                    Save Action Mode
                  </label>
                  <select
                    value={saveMode}
                    onChange={(e) => setSaveMode(e.target.value as any)}
                    style={{
                      width: '100%',
                      backgroundColor: '#18181b',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#f4f4f5',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="save_and_close">Save &amp; Close Tabs</option>
                    <option value="save_only">Save Workspace Only</option>
                  </select>
                </div>
              </div>

              {/* Tag Badges */}
              {tags.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#71717a' }}>Tags:</span>
                  {tags.map((t) => (
                    <span key={t} style={{ fontSize: '11px', fontWeight: 700, backgroundColor: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: '1px solid rgba(249, 115, 22, 0.25)', padding: '2px 8px', borderRadius: '6px' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Error Notification */}
              {errorMessage && (
                <div style={{ padding: '10px 14px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', color: '#f87171', fontSize: '12px', fontWeight: 600 }}>
                  {errorMessage}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions & Shortcut Hints */}
        {status !== 'success' && (
          <div style={{ padding: '14px 24px', backgroundColor: '#18181b', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#a1a1aa' }}>
              <span><kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#27272a', border: '1px solid #3f3f46', fontSize: '10px', fontFamily: 'monospace', color: '#f4f4f5' }}>Enter</kbd> Save</span>
              <span><kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#27272a', border: '1px solid #3f3f46', fontSize: '10px', fontFamily: 'monospace', color: '#f4f4f5' }}>⌘+Enter</kbd> Save &amp; Close</span>
              <span><kbd style={{ padding: '2px 5px', borderRadius: '4px', backgroundColor: '#27272a', border: '1px solid #3f3f46', fontSize: '10px', fontFamily: 'monospace', color: '#f4f4f5' }}>Esc</kbd> Close</span>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleExecuteSave(saveMode === 'save_and_close')}
                disabled={status === 'saving'}
                style={{
                  backgroundColor: '#f97316',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                }}
              >
                {status === 'saving' ? 'Saving...' : saveMode === 'save_and_close' ? 'Save & Close' : 'Save Workspace'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
