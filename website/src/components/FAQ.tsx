import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { FAQ_DATA } from '../data/faq';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#08090F] border-t border-white/5 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#171A24] border border-white/10 text-[#8E94A5] text-xs font-bold">
            <HelpCircle className="w-4 h-4 text-[#FF4D43]" />
            <span>GOT QUESTIONS?</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-[#F4F5F7] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-[#8E94A5]">
            Everything you need to know about Pepper's memory engine &amp; workspace system.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {FAQ_DATA.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-[#11131C] border border-white/10 hover:border-white/20 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-bold text-base text-[#F4F5F7]">{item.question}</span>
                  <div className="w-8 h-8 rounded-lg bg-[#171A24] flex items-center justify-center text-[#FF4D43] shrink-0">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 text-sm text-[#8E94A5] leading-relaxed border-t border-white/5 pt-4 animate-fade-in">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
