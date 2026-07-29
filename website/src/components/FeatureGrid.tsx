import React from 'react';
import {
  Layers,
  Globe,
  CheckSquare,
  HardDrive,
  RotateCcw,
  Sliders,
  Search,
  Lock,
} from 'lucide-react';

export const FeatureGrid: React.FC = () => {
  const features = [
    {
      icon: <Layers className="w-6 h-6 text-[#FF4D43]" />,
      title: 'Intelligent workspaces',
      description:
        'Turn related tabs into a named workspace instead of leaving them scattered across your browser.',
    },
    {
      icon: <Globe className="w-6 h-6 text-[#79AFFF]" />,
      title: 'Domain grouping',
      description:
        'See your tabs grouped by website so large browsing sessions are easier to understand.',
    },
    {
      icon: <CheckSquare className="w-6 h-6 text-[#49D6A5]" />,
      title: 'Select before saving',
      description:
        'Choose exactly which tabs belong in the workspace before closing them.',
    },
    {
      icon: <HardDrive className="w-6 h-6 text-[#FF4D43]" />,
      title: 'Memory visibility',
      description:
        'See Pepper’s estimated memory impact and RAM freed before you execute a save.',
    },
    {
      icon: <RotateCcw className="w-6 h-6 text-[#79AFFF]" />,
      title: 'Instant restore',
      description:
        'Bring back the complete workspace when the project needs your attention again.',
    },
    {
      icon: <Sliders className="w-6 h-6 text-[#49D6A5]" />,
      title: 'Restore selectively',
      description:
        'Open one tab, a few tabs, or the entire workspace based on your task.',
    },
    {
      icon: <Search className="w-6 h-6 text-[#FF4D43]" />,
      title: 'Searchable history',
      description:
        'Find saved work instantly without reopening dozens of tabs or searching history logs.',
    },
    {
      icon: <Lock className="w-6 h-6 text-[#79AFFF]" />,
      title: 'Local-first privacy',
      description:
        'Your workspace data stays in your browser stored securely in IndexedDB and Chrome storage.',
    },
  ];

  return (
    <section className="py-24 bg-[#08090F] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Built for people who{' '}
            <span className="text-[#FF4D43]">work in tabs.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            Engineered with privacy, performance, and instant context recovery at its core.
          </p>
        </div>

        {/* 8 Feature Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="bg-[#11131C] border border-white/10 hover:border-white/20 rounded-2xl p-6 space-y-4 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#171A24] border border-white/10 flex items-center justify-center">
                  {feat.icon}
                </div>

                <h3 className="text-lg font-bold text-[#F4F5F7]">{feat.title}</h3>
                <p className="text-xs text-[#8E94A5] leading-relaxed">{feat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
