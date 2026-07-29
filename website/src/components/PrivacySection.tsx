import React from 'react';
import { ShieldCheck, HardDrive, Lock, UserCheck, EyeOff } from 'lucide-react';

export const PrivacySection: React.FC = () => {
  return (
    <section id="privacy" className="py-24 bg-[#08090F] relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#49D6A5]/10 border border-[#49D6A5]/30 text-[#49D6A5] text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            <span>PRIVACY-FIRST DESIGN</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Your workspaces are <span className="text-[#49D6A5]">yours.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            Pepper is designed around local browser storage. You should not need to create an account just to save your own tabs.
          </p>
        </div>

        {/* 4 Privacy Pillars */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="bg-[#11131C] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center text-[#49D6A5]">
              <UserCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F4F5F7]">No Required Account</h3>
            <p className="text-xs text-[#8E94A5] leading-relaxed">
              Install and start saving workspaces immediately. No email signup, login wall, or passwords needed.
            </p>
          </div>

          <div className="bg-[#11131C] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center text-[#49D6A5]">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F4F5F7]">Local-First Storage</h3>
            <p className="text-xs text-[#8E94A5] leading-relaxed">
              All saved workspaces, tab titles, favicons, and URLs live safely in your browser via IndexedDB &amp; Chrome Storage.
            </p>
          </div>

          <div className="bg-[#11131C] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center text-[#49D6A5]">
              <EyeOff className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F4F5F7]">Zero Unnecessary Tracking</h3>
            <p className="text-xs text-[#8E94A5] leading-relaxed">
              We do not sell, track, or analyze your browsing history or workspace contents.
            </p>
          </div>

          <div className="bg-[#11131C] border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center text-[#49D6A5]">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-[#F4F5F7]">Full Data Control</h3>
            <p className="text-xs text-[#8E94A5] leading-relaxed">
              Export, backup, or wipe your workspace history anytime directly from Pepper Settings.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
