import React from 'react';
import { ArrowRight, ShieldCheck, Zap, HardDrive } from 'lucide-react';
import { BrowserMockup } from './BrowserMockup';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden bg-[#08090F]">
      {/* Background Accent Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF4D43]/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-8">
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#171A24] border border-[#FF4D43]/30 text-[#FF4D43] text-xs font-bold tracking-widest uppercase shadow-inner">
          <span className="w-2 h-2 rounded-full bg-[#FF4D43] animate-pulse"></span>
          <span>WORK MEMORY ENGINE</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#F4F5F7] tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Your tabs are not clutter.{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF4D43] to-[#FF857E]">
            They’re unfinished work.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="text-base sm:text-xl text-[#8E94A5] max-w-2xl mx-auto font-normal leading-relaxed">
          Pepper saves your browser workspaces, closes the tabs you don’t need right now, and brings everything back when you’re ready.
        </p>

        {/* CTA Button Group */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href="#install"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FF4D43] hover:bg-[#E03E35] text-white font-bold text-base transition-all shadow-xl shadow-[#FF4D43]/25 hover:shadow-[#FF4D43]/40 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            <span>Add Pepper to Chrome</span>
            <ArrowRight className="w-5 h-5" />
          </a>

          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#11131C] hover:bg-[#171A24] text-[#F4F5F7] font-semibold text-base border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <span>See how it works</span>
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#8E94A5] font-medium pt-2">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#49D6A5]" />
            Local-first
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#FF4D43]" />
            No account required
          </span>
          <span className="hidden sm:inline">&bull;</span>
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-[#79AFFF]" />
            Your data stays yours
          </span>
        </div>

        {/* Hero Product Interface Mockup */}
        <div className="pt-10">
          <BrowserMockup />
        </div>
      </div>
    </section>
  );
};
