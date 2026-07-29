import React from 'react';
import { Check, X } from 'lucide-react';
import { COMPARISON_DATA } from '../data/comparison';

export const ComparisonTable: React.FC = () => {
  return (
    <section id="compare" className="py-24 bg-[#08090F] border-t border-white/5 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Organizing tabs is not the same as{' '}
            <span className="text-[#FF4D43]">saving work.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#8E94A5]">
            Chrome Tab Groups keep tabs active in memory. Pepper turns tabs into persistent workspaces so you can close them to free RAM and return anytime.
          </p>
        </div>

        {/* Table Wrapper */}
        <div className="bg-[#11131C] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead>
                <tr className="bg-[#171A24] border-b border-white/10 text-xs uppercase tracking-wider font-bold text-[#8E94A5]">
                  <th className="py-4 px-6">Capability</th>
                  <th className="py-4 px-6 text-center w-1/3">Chrome Tab Groups</th>
                  <th className="py-4 px-6 text-center w-1/3 text-[#FF4D43] bg-[#FF4D43]/5 border-l border-white/10">
                    PEPPER
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm font-medium">
                {COMPARISON_DATA.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 text-[#F4F5F7]">{row.capability}</td>
                    <td className="py-4 px-6 text-center text-[#8E94A5]">
                      {row.tabGroups === 'Yes' ? (
                        <span className="inline-flex items-center gap-1 text-[#49D6A5]">
                          <Check className="w-4 h-4" /> Yes
                        </span>
                      ) : row.tabGroups === 'No' ? (
                        <span className="inline-flex items-center gap-1 text-[#8E94A5]/60">
                          <X className="w-4 h-4 text-[#FF4D43]/60" /> No
                        </span>
                      ) : (
                        <span className="text-xs bg-[#171A24] px-2.5 py-1 rounded text-[#8E94A5]">
                          {row.tabGroups}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center bg-[#FF4D43]/5 border-l border-white/10 text-[#F4F5F7] font-bold">
                      {row.pepper === 'Yes' ? (
                        <span className="inline-flex items-center gap-1 text-[#49D6A5]">
                          <Check className="w-4 h-4" /> Yes
                        </span>
                      ) : (
                        row.pepper
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
