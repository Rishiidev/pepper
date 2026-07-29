import React from 'react';
import ReactDOM from 'react-dom/client';
import { defineContentScript } from 'wxt/sandbox';
import { QuickCaptureOverlay, QuickCaptureTabMeta } from '../src/components/overlay/QuickCaptureOverlay';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('PEPPER v2 — Content Script initialized');

    let shadowContainer: HTMLDivElement | null = null;
    let shadowRoot: ShadowRoot | null = null;
    let reactRoot: ReactDOM.Root | null = null;
    let isOpen = false;

    const closeOverlay = () => {
      if (reactRoot) {
        reactRoot.unmount();
        reactRoot = null;
      }
      if (shadowContainer && shadowContainer.parentNode) {
        shadowContainer.parentNode.removeChild(shadowContainer);
        shadowContainer = null;
        shadowRoot = null;
      }
      isOpen = false;
    };

    const openOverlay = (meta: QuickCaptureTabMeta) => {
      // Toggle behavior: If open, toggle close
      if (isOpen) {
        closeOverlay();
        return;
      }

      // Create isolated host element
      shadowContainer = document.createElement('div');
      shadowContainer.id = 'pepper-quick-capture-root';
      shadowContainer.style.position = 'absolute';
      shadowContainer.style.top = '0';
      shadowContainer.style.left = '0';
      shadowContainer.style.zIndex = '2147483647';

      // Attach Shadow DOM to insulate styles
      shadowRoot = shadowContainer.attachShadow({ mode: 'open' });

      // Create React mount target inside Shadow DOM
      const mountTarget = document.createElement('div');
      shadowRoot.appendChild(mountTarget);
      document.body.appendChild(shadowContainer);

      isOpen = true;

      // Handle Save action from Content Script to Background Worker
      const handleSave = async (title: string, projectName: string, tags: string[], closeTabs: boolean): Promise<boolean> => {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'PEPPER_EXECUTE_QUICK_SAVE',
            payload: { title, projectName, tags, closeTabs },
          });
          return response && response.success;
        } catch (err) {
          console.error('PEPPER ContentScript Save Error:', err);
          return false;
        }
      };

      // Render React Overlay into Shadow DOM
      reactRoot = ReactDOM.createRoot(mountTarget);
      reactRoot.render(
        React.createElement(QuickCaptureOverlay, {
          meta: meta,
          onSave: handleSave,
          onClose: closeOverlay,
        })
      );
    };

    // Listen for messages from background service worker
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message && message.type === 'PEPPER_PING') {
        console.debug('[PEPPER DEBUG] Content script ping received');
        sendResponse({ ok: true, source: 'pepper-content-script' });
        return true;
      }
      if (message && message.type === 'PEPPER_TOGGLE_QUICK_CAPTURE') {
        console.debug('[PEPPER DEBUG] Quick Capture message received');
        openOverlay(message.payload);
        sendResponse({ received: true });
        return true;
      }
      return true;
    });
  },
});
