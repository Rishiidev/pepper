import React from 'react';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export const FinalCTA: React.FC = () => {
  return (
    <section id="install" className="py-24 bg-[#08090F] relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF4D43]/15 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="bg-[#11131C] border border-[#FF4D43]/30 rounded-3xl p-10 md:p-16 text-center space-y-8 shadow-2xl glow-red">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF4D43]/10 border border-[#FF4D43]/30 text-[#FF4D43] text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>START FREE TODAY</span>
          </div>

          <h2 className="text-4xl sm:text-6xl font-extrabold text-[#F4F5F7] tracking-tight leading-tight">
            Keep the work.{' '}
            <span className="text-[#FF4D43]">Lose the tab clutter.</span>
          </h2>

          <p className="text-base sm:text-xl text-[#8E94A5] max-w-xl mx-auto font-normal">
            Save your browser workspace now. Return to it when the work matters again.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://github.com/Rishiidev/pepper"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FF4D43] hover:bg-[#E03E35] text-white font-bold text-base transition-all shadow-xl shadow-[#FF4D43]/25 hover:shadow-[#FF4D43]/40 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <span>Add Pepper to Chrome</span>
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>

          <p className="text-xs text-[#8E94A5] font-medium flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#49D6A5]" />
            <span>Local-first. No account required. Free forever.</span>
          </p>
        </div>
      </div>
    </section>
  );
};
