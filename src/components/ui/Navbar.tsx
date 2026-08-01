'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { LogOut, User, ShieldCheck, GraduationCap } from 'lucide-react';

interface NavbarProps {
  title?: string;
  showAdminBadge?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ title, showAdminBadge = false }) => {
  const { user, profile, isAdmin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <Link href={isAdmin ? '/admin' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl brand-gradient flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight">
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
                  <span className="text-sm font-bold text-slate-800">
                    {profile?.name || 'Student'}
                  </span>
                  {showAdminBadge || isAdmin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-700 border border-brand-200">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs text-brand-600 font-bold bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200 font-mono">
                      ID: {(profile as any)?.studentIdCode || '100'}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-medium font-mono">
                  {(profile as any)?.phone || user.email}
                </span>
              </div>

              <div className="w-9 h-9 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-sm border border-brand-200 shadow-sm">
                {(profile?.name || user.email || 'U')[0].toUpperCase()}
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
