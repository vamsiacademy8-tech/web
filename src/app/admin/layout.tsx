'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/ui/Navbar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { MonitorSmartphone } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/admin/login') return;

    if (!loading && (!user || !isAdmin)) {
      router.push('/admin/login');
    }
  }, [user, isAdmin, loading, router, pathname]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-600">Verifying Admin Permissions...</span>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <>
      {/* Mobile Blocker View */}
      <div className="flex md:hidden min-h-screen bg-slate-50 flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-card max-w-sm border border-slate-200">
           <MonitorSmartphone className="w-16 h-16 text-brand-600 mx-auto mb-4" />
           <h2 className="text-2xl font-black text-slate-900 mb-3 leading-tight">Desktop<br/>Required</h2>
           <p className="text-sm text-slate-600 font-medium leading-relaxed">
             The Admin Control Center is designed for larger screens. Please log in from a laptop or desktop computer to manage your academy.
           </p>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen bg-slate-50 flex-col">
        <Navbar title="Admin Control Center" showAdminBadge />
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          <AdminSidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
