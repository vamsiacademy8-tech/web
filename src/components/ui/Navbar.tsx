'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, ShieldCheck, GraduationCap, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  title?: string;
  showAdminBadge?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ title, showAdminBadge = false }) => {
  const { user, profile, isAdmin, logout } = useAuth();
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    // Check initial state
    if (document.documentElement.classList.contains('light-theme')) {
      setIsLightMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const isLight = document.documentElement.classList.toggle('light-theme');
    setIsLightMode(isLight);
  };

  return (
    <header className="sticky top-0 z-40 w-full dark-panel border-b-0 border-white/5 rounded-none ring-0 border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <Link href={isAdmin ? '/admin' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-xl text-white tracking-tight block leading-tight font-jakarta">
                Vamsi Academy
              </span>
            </div>
          </Link>

        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col items-end">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {profile?.name || 'Student'}
                  </span>
                  {showAdminBadge || isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-brand-400 font-bold bg-brand-900/30 px-2 py-0.5 rounded-md border border-brand-800 font-mono">
                      ID: {(profile as any)?.studentIdCode || '100'}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 font-medium font-mono">
                  {(profile as any)?.phone || user.email}
                </span>
              </div>

              <div className="w-9 h-9 rounded-full bg-slate-800 text-brand-400 flex items-center justify-center font-bold text-sm border border-slate-700 shadow-sm">
                {(profile?.name || user.email || 'U')[0].toUpperCase()}
              </div>

              <button
                title="Toggle Theme"
                className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                onClick={toggleTheme}
              >
                {isLightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
};
