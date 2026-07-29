import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-[#08090F]/90 backdrop-blur-md border-b border-white/10 py-3 shadow-2xl'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[#FF4D43] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#FF4D43]/30 group-hover:scale-105 transition-transform">
            P
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-wider text-[#F4F5F7]">PEPPER</span>
            <span className="text-[10px] text-[#8E94A5] font-medium -mt-1 tracking-widest uppercase">
              Work Memory
            </span>
          </div>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#8E94A5]">
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
          <a href="#faq" className="hover:text-[#F4F5F7] transition-colors">
            FAQ
          </a>
        </nav>

        {/* CTA Button */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="#install"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF4D43] hover:bg-[#E03E35] text-white font-semibold text-sm transition-all shadow-lg shadow-[#FF4D43]/20 hover:shadow-[#FF4D43]/40 active:scale-[0.98]"
          >
            <span>Add to Chrome</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg bg-[#11131C] text-[#8E94A5] hover:text-[#F4F5F7] border border-white/10"
          aria-label="Toggle Navigation Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#11131C] border-b border-white/10 px-4 py-6 space-y-4 animate-fade-in">
          <nav className="flex flex-col space-y-3 font-medium text-base text-[#8E94A5]">
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#F4F5F7] py-1 border-b border-white/5"
            >
              How it works
            </a>
            <a
              href="#why-pepper"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#F4F5F7] py-1 border-b border-white/5"
            >
              Why Pepper
            </a>
            <a
              href="#compare"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#F4F5F7] py-1 border-b border-white/5"
            >
              Compare
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#F4F5F7] py-1 border-b border-white/5"
            >
              Privacy
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="hover:text-[#F4F5F7] py-1"
            >
              FAQ
            </a>
          </nav>

          <a
            href="#install"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#FF4D43] text-white font-bold text-sm"
          >
            <span>Add Pepper to Chrome</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}
    </header>
  );
};
