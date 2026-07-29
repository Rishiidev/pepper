import { useState } from 'react';
import { Sparkles, CheckCircle2, Globe } from 'lucide-react';
import { PepperLogo } from './PepperLogo';

export const BrowserMockup: React.FC = () => {
  const [selectedTabs, setSelectedTabs] = useState<number[]>([0, 1, 2, 3, 4, 5]);
  const [isSaved, setIsSaved] = useState(false);

  const tabsData = [
    { title: 'Pepper Session Manager — Save Chrome Tabs Efficiently', domain: 'chatgpt.com', ram: '125 MB' },
    { title: 'Pepper Session Manager — Branch Save Chrome Tabs', domain: 'chatgpt.com', ram: '125 MB' },
    { title: 'Pepper Session Manager — Branch Branch Save Chrome', domain: 'chatgpt.com', ram: '125 MB' },
    { title: 'GitHub — Rishiidev/pepper: Work Memory Engine', domain: 'github.com', ram: '150 MB' },
    { title: 'Shopify Admin — Order Processing & Checkout Flow', domain: 'shopify.com', ram: '110 MB' },
    { title: 'Stripe Documentation — Webhook Implementation', domain: 'stripe.com', ram: '115 MB' },
  ];

  const toggleTab = (index: number) => {
    if (selectedTabs.includes(index)) {
      setSelectedTabs(selectedTabs.filter((i) => i !== index));
    } else {
      setSelectedTabs([...selectedTabs, index]);
    }
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 4000);
  };

  const ramFreed = selectedTabs.length * 125;

  return (
    <div className="w-full max-w-4xl mx-auto rounded-2xl bg-[#11131C] border border-white/10 shadow-2xl overflow-hidden glow-red transition-all text-left">
      {/* Chrome Window Top Bar */}
      <div className="bg-[#08090F] px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
        </div>

        <div className="flex-1 max-w-md mx-4 bg-[#171A24] border border-white/10 rounded-lg px-3 py-1 text-xs font-mono text-[#8E94A5] truncate text-center">
          chrome://extension-pepper-workspace-capture
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#8E94A5] font-semibold">
          <span className="w-2 h-2 rounded-full bg-[#49D6A5]"></span>
          <span>Chrome MV3 Ready</span>
        </div>
      </div>

      {/* Pepper UI Interface Inside Browser */}
      <div className="p-6 md:p-8 space-y-6">
        {/* Header Stats */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <PepperLogo size={32} />
            <div>
              <h3 className="text-sm font-bold text-[#F4F5F7] tracking-wide">PEPPER OS</h3>
              <p className="text-xs text-[#8E94A5] font-medium">WORK MEMORY ENGINE</p>
            </div>
          </div>

          {/* Impact Badges */}
          <div className="grid grid-cols-4 gap-3 bg-[#08090F] border border-white/10 rounded-xl p-3 text-center">
            <div>
              <span className="text-[10px] text-[#8E94A5] block font-medium">Tabs</span>
              <span className="text-xs font-bold text-[#F4F5F7]">{selectedTabs.length} Tabs</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E94A5] block font-medium">RAM Freed</span>
              <span className="text-xs font-bold text-[#49D6A5]">{ramFreed} MB</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E94A5] block font-medium">Domains</span>
              <span className="text-xs font-bold text-[#FF4D43]">4 Domains</span>
            </div>
            <div>
              <span className="text-[10px] text-[#8E94A5] block font-medium">Restore</span>
              <span className="text-xs font-bold text-[#79AFFF]">&lt; 1 sec</span>
            </div>
          </div>
        </div>

        {/* AI Suggested Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="font-bold text-[#F4F5F7] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#FF4D43]" />
              <span>Suggested Workspace Name</span>
            </label>
            <span className="text-[11px] text-[#49D6A5] font-semibold bg-[#49D6A5]/10 px-2 py-0.5 rounded-md border border-[#49D6A5]/20">
              Auto-detected
            </span>
          </div>

          <input
            type="text"
            readOnly
            value="Active Workspace — Shopify & Developer Research"
            className="w-full bg-[#171A24] border border-[#FF4D43]/40 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#F4F5F7] focus:outline-none shadow-inner"
          />
        </div>

        {/* Domain Grouped Tab List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#8E94A5]">Browser Tabs Grouped by Domain</span>
            <button
              onClick={() =>
                setSelectedTabs(selectedTabs.length === tabsData.length ? [] : [0, 1, 2, 3, 4, 5])
              }
              className="text-[#FF4D43] font-semibold hover:underline"
            >
              {selectedTabs.length === tabsData.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="bg-[#08090F] border border-white/10 rounded-xl p-3 space-y-2 max-h-56 overflow-y-auto">
            {tabsData.map((tab, idx) => {
              const isChecked = selectedTabs.includes(idx);
              return (
                <div
                  key={idx}
                  onClick={() => toggleTab(idx)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-[#171A24] border-[#FF4D43]/40 text-[#F4F5F7]'
                      : 'bg-[#11131C] border-white/5 text-[#8E94A5] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-[#FF4D43] w-4 h-4 rounded cursor-pointer"
                    />
                    <Globe className="w-4 h-4 text-[#8E94A5] shrink-0" />
                    <span className="text-xs font-medium truncate">{tab.title}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#49D6A5]/10 text-[#49D6A5] border border-[#49D6A5]/20">
                      {tab.ram}
                    </span>
                    <span className="text-[11px] text-[#8E94A5] font-mono">{tab.domain}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Call-to-Action */}
        {isSaved ? (
          <div className="bg-[#49D6A5]/10 border border-[#49D6A5]/30 rounded-xl p-4 text-center space-y-1 animate-fade-in">
            <div className="flex items-center justify-center gap-2 text-[#49D6A5] font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>✓ Workspace Saved &amp; Tabs Safely Closed!</span>
            </div>
            <p className="text-xs text-[#8E94A5]">
              {selectedTabs.length} tabs captured • {ramFreed} MB RAM freed • Workspace verified in storage
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={selectedTabs.length === 0}
              className="w-full py-3.5 px-6 rounded-xl bg-[#FF4D43] hover:bg-[#E03E35] active:scale-[0.99] font-bold text-sm text-white transition-all shadow-xl shadow-[#FF4D43]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>Save Memory (Enter / ⌘S)</span>
            </button>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-[#8E94A5] text-center pt-1">
              <span>✓ Closes {selectedTabs.length} selected tabs</span>
              <span>✓ {ramFreed} MB RAM freed</span>
              <span>✓ Local-first storage</span>
              <span>✓ Instant restore ready</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
