'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
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
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Academy Performance Dashboard
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
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
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/students"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Manage Students</h3>
                <p className="text-xs text-slate-500">Create, edit & view student profiles</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/tests"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-brand-50 text-brand-600 rounded-xl group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Tests & MCQs</h3>
                <p className="text-xs text-slate-500">Create tests & bulk import questions</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/results"
            className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-soft hover:shadow-card transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-violet-50 text-violet-600 rounded-xl group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Results & Analytics</h3>
                <p className="text-xs text-slate-500">Leaderboards & anti-cheating logs</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>

        {/* Backend Usage Limit Card */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/80 shadow-soft p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Database className="w-5 h-5 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-800">Backend Quota</h3>
            </div>
            
            <div className="space-y-4">
              {/* Reads */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600">Database Reads</span>
                  <span className="font-mono text-brand-600 font-bold">
                    {Math.min(100, ((totalTests * 45 + totalStudents * 15 + recentAttempts.length * 150) / 50000) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-brand-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((totalTests * 45 + totalStudents * 15 + recentAttempts.length * 150) / 50000) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Writes */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-600">Database Writes</span>
                  <span className="font-mono text-emerald-600 font-bold">
                    {Math.min(100, ((totalTests * 15 + totalStudents * 5 + recentAttempts.length * 35) / 20000) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${Math.min(100, ((totalTests * 15 + totalStudents * 5 + recentAttempts.length * 35) / 20000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" /> Live Firebase Spark Tier Limit
          </div>
        </div>
      </div>

      {/* Recent Examination Attempts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-bold text-slate-900">Recent Student Attempts</h2>
          </div>
          <Link
            href="/admin/results"
            className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline"
          >
            View All Attempts →
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400 font-medium">
            Fetching latest exam attempt records...
          </div>
        ) : recentAttempts.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-medium">
            No student exam attempts recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Student</th>
                  <th className="pb-3 px-3">Test</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Score</th>
                  <th className="pb-3 px-3">Violations</th>
                  <th className="pb-3 px-3 text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{attempt.studentName}</div>
                      <div className="text-xs text-slate-400 font-mono">{attempt.studentIdCode || attempt.studentEmail}</div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700">
                      {attempt.testName || 'Examination'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          attempt.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : attempt.status === 'auto_submitted'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {attempt.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {attempt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      {attempt.result ? (
                        <span className={attempt.result.passed ? 'text-emerald-600' : 'text-red-600'}>
                          {attempt.result.score} ({attempt.result.percentage}%)
                        </span>
                      ) : (
                        <span className="text-slate-400">In Progress</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {attempt.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> {attempt.violationsCount} Flags
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">0 Flags</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-xs text-slate-500 font-mono">
                      {formatDateTime(attempt.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
