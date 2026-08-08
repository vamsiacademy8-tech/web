'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { Test, StudentProfile, Attempt } from '@/types';
import { Navbar } from '@/components/ui/Navbar';
import { formatDateTime } from '@/lib/utils';
import {
  GraduationCap,
  FileText,
  Clock,
  Calendar,
  ArrowRight,
  ShieldAlert,
  LogIn,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function StudentHomePage() {
  const { user, profile, isStudent, isAdmin, loginStudent, loading: authLoading } = useAuth();
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [tests, setTests] = useState<Test[]>([]);
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set());
  const [testsLoading, setTestsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      router.push('/admin');
    }
  }, [user, isAdmin, authLoading, router]);

  // Fetch tests assigned to student (Optimized Spark Read)
  useEffect(() => {
    if (!user || !isStudent) return;

    const fetchStudentTestsAndAttempts = async () => {
      setTestsLoading(true);
      try {
        const testsQuery = query(
          collection(db, 'tests'),
          where('isPublished', '==', true)
        );
        
        const currentUid = user.uid;
        const attemptsQuery = query(
          collection(db, 'attempts'),
          where('studentId', '==', currentUid)
        );

        const [testsSnap, attemptsSnap] = await Promise.all([
          getDocs(testsQuery),
          getDocs(attemptsQuery)
        ]);
        
        const loaded: Test[] = [];

        testsSnap.forEach((doc) => {
          const t = { id: doc.id, ...doc.data() } as Test;
          const assigned = t.assignedStudentIds || 'all';
          const assignedBatches = t.assignedBatchIds || [];
          const studentBatches = (profile as StudentProfile)?.batchIds || [];

          const inAssignedBatch = assignedBatches.some(b => studentBatches.includes(b));

          const studentDocId = (profile as StudentProfile)?.id;

          // Filter if assigned to 'all' or specifically contains student ID or is in assigned batch
          if (
            assigned === 'all' ||
            (Array.isArray(assigned) && assigned.includes(studentDocId)) ||
            inAssignedBatch
          ) {
            loaded.push(t);
          }
        });
        // Sort tests: Live First, then Upcoming, then Ended
        loaded.sort((a, b) => {
          const now = new Date().getTime();
          const aStart = new Date(a.startDateTime).getTime();
          const aEnd = new Date(a.endDateTime).getTime();
          const bStart = new Date(b.startDateTime).getTime();
          const bEnd = new Date(b.endDateTime).getTime();
          
          const aStatus = now >= aStart && now <= aEnd ? 0 : now < aStart ? 1 : 2;
          const bStatus = now >= bStart && now <= bEnd ? 0 : now < bStart ? 1 : 2;

          if (aStatus !== bStatus) return aStatus - bStatus;
          return bStart - aStart; // Newest first within same category
        });
        
        setTests(loaded);

        const completedIds = new Set<string>();
        attemptsSnap.forEach((doc) => {
          const attempt = doc.data() as Attempt;
          if (attempt.status !== 'in_progress') {
            completedIds.add(attempt.testId);
          }
        });
        setCompletedTestIds(completedIds);
      } catch (err) {
        console.error('Error fetching student tests:', err);
      } finally {
        setTestsLoading(false);
      }
    };

    fetchStudentTestsAndAttempts();
  }, [user, isStudent]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsSubmitting(true);
    try {
      await loginStudent(studentId, mobileNumber);
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid Student ID or Mobile Number.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const studentProfile = profile as StudentProfile;

  if (authLoading || (user && isAdmin)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-600">Loading Vamsi Academy Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Student Examination Portal" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(!user || !isStudent) ? (
          /* Student Login View */
          <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 shadow-card border border-slate-200/80">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/25">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                Student Sign In
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Log in with your Student ID & Mobile Number
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Student ID / User ID *
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all font-mono font-bold text-brand-700"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                <LogIn className="w-4 h-4" />
                {isSubmitting ? 'Authenticating...' : 'Enter Student Portal'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-500 font-medium">Are you an administrator? </span>
              <Link href="/admin/login" className="text-xs font-bold text-brand-600 hover:underline">
                Admin Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Student Dashboard / Available Tests */
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-brand-800 via-brand-700 to-blue-600 rounded-3xl p-6 sm:p-8 text-white shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
                  <GraduationCap className="w-3.5 h-3.5" /> Welcome Back
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {studentProfile?.name || 'Student Portal'}
                </h1>
                <p className="text-brand-100 text-sm mt-1 max-w-xl">
                  Student ID: <span className="font-mono font-bold text-white">{studentProfile?.studentIdCode || '100'}</span> | Mobile Number: <span className="font-mono font-bold text-white">{studentProfile?.phone || 'N/A'}</span>
                </p>
              </div>

              {studentProfile?.status === 'disabled' && (
                <div className="p-4 bg-red-500/20 border border-red-300/40 rounded-2xl text-red-100 text-xs max-w-xs flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-red-200" />
                  <span>Account Disabled. Contact Vamsi Academy Administrator.</span>
                </div>
              )}
            </div>

            {/* Test Cards List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Assigned Examinations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Select a scheduled test to read instructions and begin.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                  {tests.length} Active Tests
                </span>
              </div>

              {testsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="bg-white rounded-2xl p-6 h-48 border border-slate-200 animate-pulse"></div>
                  ))}
                </div>
              ) : tests.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Assigned Tests Yet</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Check back later or contact your instructor for active share links.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {tests.map((test) => {
                    const now = new Date();
                    const startDate = new Date(test.startDateTime);
                    const endDate = new Date(test.endDateTime);

                    const isUpcoming = now < startDate;
                    const isEnded = now > endDate;
                    const isActive = !isUpcoming && !isEnded;
                    const isCompleted = completedTestIds.has(test.id);

                    return (
                      <div
                        key={test.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : isUpcoming
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isActive ? 'Live Now' : isUpcoming ? 'Upcoming' : 'Ended'}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-slate-900 leading-snug mb-2">
                            {test.name}
                          </h3>

                          <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">
                            {test.description || 'Vamsi Academy Standard Examination'}
                          </p>

                          <div className="space-y-2 text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2 p-2 bg-brand-50/50 rounded-xl border border-brand-100/50">
                              <Award className="w-5 h-5 text-brand-600 shrink-0" />
                              <span className="text-sm font-bold text-slate-700">Total Marks: <strong className="text-brand-600 text-lg ml-1 font-black">{test.maxMarks}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Duration: <strong>{test.durationMinutes} Mins</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Starts: <strong>{formatDateTime(test.startDateTime)}</strong></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0" />
                              <span>Ends: <strong>{formatDateTime(test.endDateTime)}</strong></span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={isCompleted ? `/test/${test.id}/exam` : `/test/${test.id}`}
                          className={`w-full py-3 px-4 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
                            studentProfile?.status === 'disabled'
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'
                              : isCompleted
                              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 shadow-none'
                              : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
                          }`}
                        >
                          <span>{isCompleted ? 'Show Result' : 'Open Exam Portal'}</span>
                          {isCompleted ? <Award className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
