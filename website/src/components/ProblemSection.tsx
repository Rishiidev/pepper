import React from 'react';
import { AlertCircle, BookmarkCheck } from 'lucide-react';

export const ProblemSection: React.FC = () => {
  return (
    <section id="why-pepper" className="py-24 bg-[#08090F] border-t border-white/5 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Your browser remembers everything.{' '}
            <span className="text-[#FF4D43]">Your computer pays for it.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            Tabs accumulate naturally while you work. Closing them feels risky because you don’t want to lose your place. But keeping 50 tabs open bogs down your machine.
          </p>
        </div>

        {/* Problem vs Pepper Visual Comparison Sequence */}
        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Left Column: The Problem */}
          <div className="bg-[#11131C] border border-white/10 rounded-2xl p-8 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D43]/10 border border-[#FF4D43]/30 text-[#FF4D43] text-xs font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>THE TAB HOARDING CYCLE</span>
              </div>

              <h3 className="text-2xl font-bold text-[#F4F5F7]">Tab Chaos &amp; RAM Exhaustion</h3>
              <p className="text-sm text-[#8E94A5]">
                Chrome tab groups organize tabs visually, but all tabs remain open in memory draining CPU &amp; battery.
              </p>
            </div>

            {/* Problem Sequence Pipeline */}
            <div className="space-y-3 pt-4 font-mono text-xs">
              <div className="bg-[#08090F] border border-white/10 rounded-xl p-3.5 flex items-center justify-between text-[#8E94A5]">
                <span>47 Open Active Tabs</span>
                <span className="text-[#FF4D43] font-bold">~4.2 GB RAM</span>
              </div>
              <div className="text-center text-[#8E94A5] text-xs">↓</div>
              <div className="bg-[#08090F] border border-white/10 rounded-xl p-3.5 text-[#8E94A5]">
                Hard to find important work across windows
              </div>
              <div className="text-center text-[#8E94A5] text-xs">↓</div>
              <div className="bg-[#08090F] border border-white/10 rounded-xl p-3.5 text-[#8E94A5]">
                Browser gets heavy, slow, &amp; fan spins loud
              </div>
              <div className="text-center text-[#8E94A5] text-xs">↓</div>
              <div className="bg-[#08090F] border border-[#FF4D43]/30 rounded-xl p-3.5 text-[#FF4D43] font-bold">
                Afraid to close tabs out of fear of lost context
              </div>
            </div>
          </div>

          {/* Right Column: Pepper Solution */}
          <div className="bg-[#11131C] border border-[#49D6A5]/30 rounded-2xl p-8 space-y-6 flex flex-col justify-between glow-green">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#49D6A5]/10 border border-[#49D6A5]/30 text-[#49D6A5] text-xs font-bold">
                <BookmarkCheck className="w-4 h-4" />
                <span>THE PEPPER SOLUTION</span>
              </div>

              <h3 className="text-2xl font-bold text-[#F4F5F7]">Intelligent Work Memory</h3>
              <p className="text-sm text-[#8E94A5]">
                Pepper saves your workspace, closes the tabs to free RAM immediately, and lets you return anytime.
              </p>
            </div>

            {/* Solution Sequence Pipeline */}
            <div className="space-y-3 pt-4 font-mono text-xs">
              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 flex items-center justify-between text-[#F4F5F7]">
                <span>1. Select &amp; Save Workspace</span>
                <span className="text-[#49D6A5] font-bold">1 Click</span>
              </div>
              <div className="text-center text-[#49D6A5] text-xs">↓</div>
              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 flex items-center justify-between text-[#F4F5F7]">
                <span>2. Close Tabs &amp; Free Memory</span>
                <span className="text-[#49D6A5] font-bold">750+ MB Freed</span>
              </div>
              <div className="text-center text-[#49D6A5] text-xs">↓</div>
              <div className="bg-[#171A24] border border-[#49D6A5]/30 rounded-xl p-3.5 flex items-center justify-between text-[#F4F5F7]">
                <span>3. Restore Full Session or Single Tab</span>
                <span className="text-[#79AFFF] font-bold">&lt; 1 sec</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
