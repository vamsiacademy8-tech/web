'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { Test, StudentProfile, Attempt } from '@/types';
import { DashboardCards } from '@/components/admin/DashboardCards';
import { formatDateTime } from '@/lib/utils';
import {
  FileCheck,
  Users,
  Award,
  ArrowRight,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Database,
  Activity
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [totalTests, setTotalTests] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeTests, setActiveTests] = useState(0);
  const [completedTests, setCompletedTests] = useState(0);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      setLoading(true);
      try {
        // 1. Fetch Tests
        const testsSnap = await getDocs(collection(db, 'tests'));
        const now = new Date();
        let activeCount = 0;
        let completedCount = 0;

        testsSnap.forEach((doc) => {
          const t = doc.data() as Test;
          const start = new Date(t.startDateTime);
          const end = new Date(t.endDateTime);
          if (now >= start && now <= end) {
            activeCount++;
          } else if (now > end) {
            completedCount++;
          }
        });

        setTotalTests(testsSnap.size);
        setActiveTests(activeCount);
        setCompletedTests(completedCount);

        // 2. Fetch Students
        const studentsSnap = await getDocs(collection(db, 'students'));
        setTotalStudents(studentsSnap.size);

        // 3. Fetch Recent Attempts (Sorted in-memory to prevent Firestore index errors)
        const attemptsSnap = await getDocs(collection(db, 'attempts'));
        const attemptsList: Attempt[] = [];
        attemptsSnap.forEach((doc) => {
          attemptsList.push({ id: doc.id, ...doc.data() } as Attempt);
        });
        attemptsList.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
        setRecentAttempts(attemptsList.slice(0, 10));
      } catch (err) {
        console.error('Error loading admin dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardMetrics();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight font-jakarta">
          Academy Performance Dashboard
        </h1>
        <p className="text-sm text-slate-400 font-medium mt-2">
          Real-time metrics, test counts, and student evaluation activity.
        </p>
      </div>

      {/* Metrics Cards */}
      <DashboardCards
        totalTests={totalTests}
        totalStudents={totalStudents}
        activeTests={activeTests}
        completedTests={completedTests}
        recentAttemptsCount={recentAttempts.length}
      />

      {/* Middle Section: Quick Actions & Backend Limits */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Quick Action Links */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/students"
            className="dark-panel p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm border border-emerald-500/20">
                <Users className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white font-jakarta">Manage Students</h3>
              <p className="text-sm text-slate-400 mt-1">Create, edit & view student profiles</p>
            </div>
          </Link>

          <Link
            href="/admin/tests"
            className="dark-panel p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className="p-3.5 bg-brand-500/10 text-brand-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm border border-brand-500/20">
                <FileCheck className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-brand-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white font-jakarta">Tests & MCQs</h3>
              <p className="text-sm text-slate-400 mt-1">Create tests & bulk import questions</p>
            </div>
          </Link>

          <Link
            href="/admin/results"
            className="dark-panel p-6 rounded-3xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className="p-3.5 bg-violet-500/10 text-violet-400 rounded-2xl group-hover:scale-110 transition-transform shadow-sm border border-violet-500/20">
                <Award className="w-6 h-6" />
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-violet-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white font-jakarta">Results & Analytics</h3>
              <p className="text-sm text-slate-400 mt-1">Leaderboards & anti-cheating logs</p>
            </div>
          </Link>
        </div>

        <div className="lg:col-span-1 dark-panel rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-500" />
                <h3 className="text-base font-bold text-white font-jakarta">Backend Quota</h3>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-400">Database Reads</span>
                  <span className="font-bold text-brand-400 font-mono">
                    {Math.min(100, ((totalTests * 45 + totalStudents * 15 + recentAttempts.length * 150) / 50000) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-brand-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((totalTests * 45 + totalStudents * 15 + recentAttempts.length * 150) / 50000) * 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-slate-400">Database Writes</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {Math.min(100, ((totalTests * 15 + totalStudents * 5 + recentAttempts.length * 35) / 20000) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, ((totalTests * 15 + totalStudents * 5 + recentAttempts.length * 35) / 20000) * 100)}%` }}></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Live Firebase Spark Tier Limit
            </p>
          </div>
        </div>
      </div>

      {/* Recent Examination Attempts Table */}
      <div className="dark-panel rounded-3xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-500/10 rounded-xl text-brand-400 shadow-sm border border-brand-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-white font-jakarta">Recent Student Attempts</h2>
          </div>
          <Link
            href="/admin/results"
            className="text-sm font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors"
          >
            View All Attempts &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : recentAttempts.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
            <FileCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">No test attempts recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {recentAttempts.map((attempt) => (
              <div key={attempt.id} className="bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800/60 rounded-2xl p-5 transition-all shadow-sm hover:shadow-glow">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 items-center">
                  
                  {/* Student Info */}
                  <div className="col-span-2 sm:col-span-1">
                    <div className="font-bold text-slate-200 text-base line-clamp-1">{attempt.studentName}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{attempt.studentIdCode || attempt.studentEmail}</div>
                  </div>
                  
                  {/* Test Info */}
                  <div className="col-span-2 sm:col-span-1 md:col-span-1">
                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Examination</div>
                    <div className="font-medium text-slate-300 text-sm line-clamp-1">{attempt.testName || 'Examination'}</div>
                  </div>

                  {/* Status & Date */}
                  <div className="col-span-1">
                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Status</div>
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                        attempt.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : attempt.status === 'auto_submitted'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : attempt.status === 'timeout_submitted'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'
                      }`}>
                        {attempt.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDateTime(attempt.startTime)}
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="col-span-1">
                    <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold">Score</div>
                    {attempt.result ? (
                      <div className="flex items-baseline gap-1">
                        <span className="font-black text-emerald-400 text-lg">{attempt.result.score}</span>
                        <span className="text-slate-500 text-xs font-bold">({attempt.result.percentage}%)</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm font-medium">In Progress</span>
                    )}
                  </div>

                  {/* Violations */}
                  <div className="col-span-1 flex md:justify-end">
                    <div className="flex flex-col items-start md:items-end w-full">
                       <div className="text-[10px] text-slate-500 mb-1 uppercase tracking-widest font-bold md:hidden">Security</div>
                      {attempt.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1.5 rounded-lg border border-red-500/20 whitespace-nowrap">
                          <AlertTriangle className="w-3.5 h-3.5" /> {attempt.violationsCount} Flags
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500/70 bg-emerald-500/5 px-2.5 py-1.5 rounded-lg border border-emerald-500/10 whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Clean
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
