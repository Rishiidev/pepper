import React from 'react';
import { MousePointerClick, Database, RotateCcw, CheckCircle2 } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      icon: <MousePointerClick className="w-6 h-6 text-[#FF4D43]" />,
      title: 'Select your work',
      description:
        'Pepper groups your open tabs by domain and lets you choose exactly what belongs in the workspace.',
      badge: 'Domain Grouped',
    },
    {
      number: '02',
      icon: <Database className="w-6 h-6 text-[#49D6A5]" />,
      title: 'Save Memory',
      description:
        'Pepper stores the workspace details locally, including titles, links, favicons, and tab order.',
      badge: 'Local-First Storage',
    },
    {
      number: '03',
      icon: <RotateCcw className="w-6 h-6 text-[#79AFFF]" />,
      title: 'Restore when ready',
      description:
        'Open the entire workspace or bring back only the tabs you need with instant sub-second recovery.',
      badge: 'Selective Recovery',
    },
  ];

  return (
    <section id="how-it-works" className="py-24 bg-[#08090F] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Save the work. Close the tabs.{' '}
            <span className="text-[#FF4D43]">Return instantly.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            Three clear steps to keep your browser fast, organized, and stress-free.
          </p>
        </div>

        {/* 3 Step Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 relative">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="bg-[#11131C] border border-white/10 hover:border-[#FF4D43]/40 rounded-2xl p-8 space-y-6 transition-all duration-300 relative group flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#8E94A5] bg-[#171A24] border border-white/10 px-3 py-1 rounded-full">
                    STEP {step.number}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#F4F5F7]">{step.title}</h3>
                <p className="text-sm text-[#8E94A5] leading-relaxed">{step.description}</p>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-[#49D6A5]">
                <CheckCircle2 className="w-4 h-4" />
                <span>{step.badge}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
