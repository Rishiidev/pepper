import React, { useState, useEffect, useRef } from 'react';
import { PepperTab } from '../../core/types/session';
import { localNamingEngine } from '../../core/engines/local-naming-engine';

export interface QuickCaptureTabMeta {
  tabs: PepperTab[];
  domainCount: number;
  estimatedRamSavedMb?: number;
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

  const saving = status === 'saving';

  return (
    <div className="pp-scrim" onClick={onClose} role="presentation">
      <style>{CSS}</style>
      <div className="pp-panel" role="dialog" aria-modal="true" aria-label="Save this window to Pepper" onClick={(e) => e.stopPropagation()}>
        {status === 'success' ? (
          <div className="pp-done" role="status">
            <div className="pp-check" aria-hidden="true">✓</div>
            <div className="pp-title">Saved {meta.tabs.length} tab{meta.tabs.length !== 1 ? 's' : ''}</div>
            <div className="pp-muted">“{title}” is in your workspaces.</div>
          </div>
        ) : (
          <>
            <div className="pp-eyebrow">This window · {meta.tabs.length} tab{meta.tabs.length !== 1 ? 's' : ''} · {meta.domainCount} site{meta.domainCount !== 1 ? 's' : ''}</div>
            <label className="pp-label" htmlFor="pp-name">Workspace name</label>
            <input id="pp-name" ref={titleInputRef} className="pp-input" type="text" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="Name this workspace" />

            <div className="pp-row">
              <label className="pp-field">
                <span className="pp-label">Project</span>
                <select className="pp-input" value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                  <option value="General">General</option>
                  {meta.projects.filter((p) => p !== 'General').map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="pp-field">
                <span className="pp-label">After saving</span>
                <select className="pp-input" value={saveMode} onChange={(e) => setSaveMode(e.target.value as 'save_and_close' | 'save_only')}>
                  <option value="save_and_close">Close the tabs</option>
                  <option value="save_only">Keep the tabs open</option>
                </select>
              </label>
            </div>

            {errorMessage && <div className="pp-error" role="alert">{errorMessage}</div>}

            <div className="pp-actions">
              <span className="pp-muted">Enter saves · Esc closes</span>
              <button className="pp-btn pp-btn-ghost" type="button" onClick={onClose}>Cancel</button>
              <button className="pp-btn pp-btn-primary" type="button" disabled={saving} onClick={() => handleExecuteSave(saveMode === 'save_and_close')}>
                {saving ? 'Saving…' : 'Save window'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/** The overlay lives in a shadow root on any web page, so it carries its own tokens and follows the OS theme. */
const CSS = `
  :host, .pp-scrim { all: initial; }
  .pp-scrim {
    --card: #FFFFFF; --text: #111412; --text2: #4A514B; --muted: #666D67; --border: #C9CFC5; --field: #F5F7F2; --red: #D8322B;
    position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: flex-start; justify-content: center; padding-top: 14vh;
    background: rgba(14, 16, 15, 0.5); font-family: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--text);
  }
  @media (prefers-color-scheme: dark) {
    .pp-scrim { --card: #171A18; --text: #F2F4F0; --text2: #B4BBB4; --muted: #8D958E; --border: #363D38; --field: #1E221F; }
  }
  .pp-panel { box-sizing: border-box; width: 460px; max-width: 92vw; background: var(--card); border: 1px solid var(--border); border-radius: 24px; padding: 20px; box-shadow: 0 24px 60px -20px rgba(0,0,0,.45); animation: pp-in 160ms ease-out; }
  .pp-panel * { box-sizing: border-box; font-family: inherit; }
  .pp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 14px; }
  .pp-label { display: block; font-size: 12px; font-weight: 700; color: var(--text2); margin: 0 0 6px; }
  .pp-input { display: block; width: 100%; height: 40px; border: 1px solid var(--border); border-radius: 12px; background: var(--field); color: var(--text); padding: 0 12px; font-size: 14px; font-weight: 600; }
  .pp-input:focus-visible, .pp-btn:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
  .pp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
  .pp-field { display: block; }
  .pp-actions { display: flex; align-items: center; gap: 8px; margin-top: 18px; }
  .pp-muted { font-size: 12px; color: var(--muted); margin-right: auto; }
  .pp-btn { height: 40px; border-radius: 999px; border: 1px solid transparent; padding: 0 20px; font-size: 14px; font-weight: 700; cursor: pointer; }
  .pp-btn:disabled { opacity: .6; cursor: default; }
  .pp-btn-primary { background: var(--red); color: #fff; }
  .pp-btn-ghost { background: transparent; color: var(--text); border-color: var(--border); }
  .pp-error { margin-top: 12px; font-size: 13px; font-weight: 600; color: var(--red); }
  .pp-done { text-align: center; padding: 18px 8px; }
  .pp-check { width: 44px; height: 44px; margin: 0 auto 10px; border-radius: 50%; background: #A9F5A4; color: #0E1A10; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 800; }
  .pp-title { font-size: 18px; font-weight: 700; }
  @keyframes pp-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .pp-panel { animation: none; } }
`;
