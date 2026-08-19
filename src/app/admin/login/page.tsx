'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/ui/Navbar';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, isAdmin, logout, loginAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user && isAdmin) {
      router.push('/admin');
    }
  }, [user, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginAdmin(email, password);
      router.push('/admin');
    } catch (err: any) {
      console.error("Admin Login Error:", err);
      setError('Invalid User ID or Password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex flex-col relative overflow-hidden">
      <Navbar title="Admin Portal Sign In" />

      <main className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="max-w-md w-full dark-panel p-8 sm:p-10 my-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl brand-gradient text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight font-jakarta">
              Administrator Login
            </h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              Vamsi Academy Exam Management Portal
            </p>
          </div>

          {user && !isAdmin && (
            <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs flex items-center justify-between">
              <div>
                <strong className="block font-bold">Currently Signed In as Student:</strong>
                <span className="font-mono text-slate-300">{user.email}</span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@vamsiacademy.com"
                className="w-full px-4 py-3.5 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3.5 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all text-white placeholder-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 brand-gradient brand-gradient-hover text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? 'Authenticating...' : 'Access Admin Dashboard'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-sm text-slate-400 font-medium mb-2">
              Are you a student looking for an exam?
            </p>
            <Link 
              href="/"
              className="inline-flex items-center text-sm font-bold text-brand-400 hover:text-brand-300 transition-colors underline decoration-brand-400/30 underline-offset-4"
            >
              Go to Student Login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
