import React from 'react';
import { Github, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#08090F] border-t border-white/10 py-12 text-xs text-[#8E94A5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Brand */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#FF4D43] flex items-center justify-center text-white font-black text-xs shadow-md">
                P
              </div>
              <span className="font-bold text-sm text-[#F4F5F7]">PEPPER</span>
            </div>
            <p className="text-xs text-[#8E94A5]">Your browser remembers. Your computer breathes.</p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap gap-8 text-xs font-semibold text-[#8E94A5]">
            <a href="#how-it-works" className="hover:text-[#F4F5F7] transition-colors">
              How it works
            </a>
            <a href="#why-pepper" className="hover:text-[#F4F5F7] transition-colors">
              Why Pepper
            </a>
            <a href="#compare" className="hover:text-[#F4F5F7] transition-colors">
              Compare
            </a>
            <a href="#privacy" className="hover:text-[#F4F5F7] transition-colors">
              Privacy
            </a>
            <a
              href="https://github.com/Rishiidev/pepper"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F4F5F7] transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-mono">
          <p>© 2026 PEPPER — Work Memory Engine. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[#49D6A5]">
            <Shield className="w-3.5 h-3.5" />
            <span>Local-first architecture &bull; Zero tracking</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
