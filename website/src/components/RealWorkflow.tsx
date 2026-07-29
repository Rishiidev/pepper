import React from 'react';
import { Folder } from 'lucide-react';

export const RealWorkflow: React.FC = () => {
  return (
    <section className="py-24 bg-[#08090F] border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            One browser. Multiple projects.{' '}
            <span className="text-[#FF4D43]">No tab chaos.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            See how Pepper transforms a chaotic browser window into organized, lightweight workspaces.
          </p>
        </div>

        {/* Before & After Interactive Showcase */}
        <div className="grid lg:grid-cols-2 gap-8 items-stretch">
          {/* Before Box */}
          <div className="bg-[#11131C] border border-[#FF4D43]/30 rounded-2xl p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#FF4D43] bg-[#FF4D43]/10 border border-[#FF4D43]/20 px-3 py-1 rounded-full">
                  BEFORE PEPPER
                </span>
                <span className="text-xs font-mono font-bold text-[#FF4D43]">52 Open Tabs</span>
              </div>

              <h3 className="text-2xl font-bold text-[#F4F5F7]">Overwhelmed &amp; Memory Heavy</h3>
              <p className="text-sm text-[#8E94A5]">
                Scattered tabs across 5 windows. Hard to find what you were working on 2 hours ago.
              </p>
            </div>

            {/* Scattered Tabs Pills Container */}
            <div className="bg-[#08090F] border border-white/10 rounded-xl p-4 flex flex-wrap gap-2 text-xs font-mono text-[#8E94A5]">
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5 text-[#F4F5F7]">Shopify (18)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">GitHub PRs (14)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">Claude AI (5)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">Figma Comps (6)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">Analytics (3)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">YouTube (4)</span>
              <span className="bg-[#171A24] px-3 py-1.5 rounded-lg border border-white/5">Email (2)</span>
            </div>
          </div>

          {/* After Box */}
          <div className="bg-[#11131C] border border-[#49D6A5]/40 rounded-2xl p-8 space-y-6 flex flex-col justify-between glow-green">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#49D6A5] bg-[#49D6A5]/10 border border-[#49D6A5]/20 px-3 py-1 rounded-full">
                  AFTER PEPPER
                </span>
                <span className="text-xs font-mono font-bold text-[#49D6A5]">7 Active Tabs Only</span>
              </div>

              <h3 className="text-2xl font-bold text-[#F4F5F7]">4 Workspace Memory Cards Saved</h3>
              <p className="text-sm text-[#8E94A5]">
                Saved 45 tabs into organized project workspaces. 4500+ MB RAM freed immediately.
              </p>
            </div>

            {/* Saved Workspaces Container */}
            <div className="grid sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[#F4F5F7] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-[#FF4D43]" /> Shopify Redesign
                  </span>
                </div>
                <div className="text-[11px] text-[#8E94A5]">18 tabs &bull; Saved 2h ago</div>
              </div>

              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[#F4F5F7] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-[#79AFFF]" /> BRUUHH Studios
                  </span>
                </div>
                <div className="text-[11px] text-[#8E94A5]">14 tabs &bull; Saved yesterday</div>
              </div>

              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[#F4F5F7] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-[#49D6A5]" /> Product Research
                  </span>
                </div>
                <div className="text-[11px] text-[#8E94A5]">11 tabs &bull; Saved 3d ago</div>
              </div>

              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between text-[#F4F5F7] font-bold">
                  <span className="flex items-center gap-1.5">
                    <Folder className="w-4 h-4 text-[#FF4D43]" /> Read Later
                  </span>
                </div>
                <div className="text-[11px] text-[#8E94A5]">9 tabs &bull; Saved 4d ago</div>
              </div>
            </div>

            {/* Impact Metric Strip */}
            <div className="pt-2 flex items-center justify-between text-xs font-semibold text-[#49D6A5] border-t border-white/10">
              <span>Active now: 7 tabs</span>
              <span>Saved for later: 45 tabs</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
