'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileCheck2, Award, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Students', href: '/admin/students', icon: Users },
    { name: 'Tests & Questions', href: '/admin/tests', icon: FileCheck2 },
    { name: 'Results & Analytics', href: '/admin/results', icon: Award },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 hidden md:block flex-shrink-0">
      <div className="mb-6 px-3 py-2 bg-slate-50 rounded-xl border border-slate-200/60">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
          Control Center
        </span>
        <span className="text-sm font-bold text-slate-800">Vamsi Academy Admin</span>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group',
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-500/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('w-5 h-5', isActive ? 'text-white' : 'text-slate-500 group-hover:text-brand-600')} />
                <span>{item.name}</span>
              </div>
              <ChevronRight
                className={cn(
                  'w-4 h-4 transition-transform',
                  isActive ? 'text-white/80' : 'text-slate-300 group-hover:text-slate-400 group-hover:translate-x-0.5'
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
