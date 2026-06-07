'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

export function AuthHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-6 transition-all duration-300 ${
        isScrolled
          ? 'py-4 border-b border-white/[0.05] bg-[#070b14]/50 backdrop-blur-xl'
          : 'py-6 border-b border-transparent bg-transparent'
      }`}
    >
      <div className="max-w-420 mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 text-cyan-400 group-hover:text-purple-400 transition-colors duration-500">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-full"
            >
              <path
                d="M12 2L2 22H6.5L9.5 16H18L13 6L12 2Z"
                fill="currentColor"
              />
              <path
                d="M7.5 13C7.5 13 9 10 12 10C15 10 16.5 13 16.5 13C16.5 13 15 15 12 15C9 15 7.5 13 7.5 13Z"
                fill="white"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-white tracking-wide">
            Aegis
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/docs"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Documentation
          </Link>
          <Link
            href="/enterprise"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors"
          >
            Enterprise
          </Link>

          <div className="flex items-center gap-4 border-l border-white/10 pl-8 ml-2">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-cyan-400 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-white px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.05] hover:bg-white/[0.1] hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all"
            >
              Create Account
            </Link>
          </div>
        </nav>

        {/* Mobile Menu Toggle (Placeholder) */}
        <button className="md:hidden text-white/70 hover:text-white">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
