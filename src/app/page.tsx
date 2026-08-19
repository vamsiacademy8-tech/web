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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-400">Loading Vamsi Academy Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent flex flex-col font-sans">
      <Navbar title="Student Examination Portal" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(!user || !isStudent) ? (
          <div className="max-w-md mx-auto my-16 dark-panel rounded-3xl p-10 relative overflow-hidden">
            
            <div className="text-center mb-10 relative z-10">
              <div className="w-16 h-16 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight font-jakarta">
                Student Sign In
              </h2>
              <p className="text-sm text-slate-400 mt-2 font-medium">
                Access your secure examination portal
              </p>
            </div>

            {loginError && (
              <div className="mb-6 p-4 bg-red-50/80 backdrop-blur border border-red-200/60 text-red-700 text-sm rounded-2xl flex items-center gap-3 shadow-sm relative z-10">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span className="font-medium">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleStudentLogin} className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Student ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-900/50 rounded-xl border border-slate-700/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all font-mono font-bold text-white placeholder-slate-600"
                    placeholder="Enter your ID"
                  />
                  <FileText className="w-4 h-4 text-slate-400 absolute right-4 top-4" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Mobile Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-900/50 rounded-xl border border-slate-700/80 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all font-mono font-bold text-brand-400 placeholder-slate-600"
                    placeholder="Registered mobile"
                  />
                  <CheckCircle className="w-4 h-4 text-slate-400 absolute right-4 top-4" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-4 brand-gradient brand-gradient-hover font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-4 group"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Enter Student Portal'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200/50 text-center relative z-10">
              <span className="text-xs text-slate-500 font-medium">Are you an administrator? </span>
              <Link href="/admin/login" className="text-xs font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors">
                Admin Sign In
              </Link>
            </div>
          </div>
        ) : (
          /* Student Dashboard / Available Tests */
          <div className="space-y-8">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-brand-700 via-brand-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-glow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold mb-4 border border-white/20 shadow-inner-light tracking-wide">
                    <GraduationCap className="w-4 h-4" /> Welcome Back
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-jakarta mb-2">
                    {studentProfile?.name || 'Student Portal'}
                  </h1>
                  <p className="text-brand-100 text-sm font-medium">
                    Student ID: <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md ml-1">{studentProfile?.studentIdCode || '100'}</span> 
                    <span className="mx-3 opacity-50">|</span>
                    Mobile: <span className="font-mono bg-white/10 px-2 py-0.5 rounded-md ml-1">{studentProfile?.phone || 'N/A'}</span>
                  </p>
                </div>

                {studentProfile?.status === 'disabled' && (
                  <div className="p-4 bg-red-500/20 backdrop-blur border border-red-400/50 rounded-2xl text-red-50 text-sm max-w-sm flex items-center gap-3 shadow-lg">
                    <ShieldAlert className="w-6 h-6 shrink-0 text-red-300" />
                    <span className="font-medium leading-snug">Your account is currently disabled. Please contact the Vamsi Academy Administrator for access.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Test Cards List */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight font-jakarta">
                    Assigned Examinations
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    Select a scheduled test to read instructions and begin.
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                  {tests.length} Active Tests
                </span>
              </div>

              {testsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="dark-panel rounded-2xl p-6 h-48 animate-pulse"></div>
                  ))}
                </div>
              ) : tests.length === 0 ? (
                <div className="dark-panel rounded-3xl p-12 text-center max-w-md mx-auto">
                  <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-300">No Assigned Tests Yet</h3>
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
                        className="dark-panel rounded-3xl p-6 hover:shadow-glow hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span
                              className={`text-xs font-bold px-3 py-1.5 rounded-full border shadow-sm ${
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : isUpcoming
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isActive ? 'Live Now' : isUpcoming ? 'Upcoming' : 'Ended'}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white leading-snug mb-2 font-jakarta group-hover:text-brand-400 transition-colors">
                            {test.name}
                          </h3>

                          <p className="text-sm text-slate-400 line-clamp-2 mb-6 font-medium">
                            {test.description || 'Vamsi Academy Standard Examination'}
                          </p>

                          <div className="space-y-2.5 text-xs text-slate-400 mb-8 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
                              <span className="font-medium text-slate-500 flex items-center gap-1.5"><Award className="w-4 h-4 text-brand-500" /> Total Marks</span>
                              <span className="text-brand-400 font-bold text-base">{test.maxMarks}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-500"><Clock className="w-4 h-4" /> Duration</span>
                              <span className="font-bold text-slate-300">{test.durationMinutes} Mins</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-500"><Calendar className="w-4 h-4" /> Opens</span>
                              <span className="font-bold text-slate-300">{formatDateTime(test.startDateTime)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-500"><CheckCircle2 className="w-4 h-4" /> Closes</span>
                              <span className="font-bold text-slate-300">{formatDateTime(test.endDateTime)}</span>
                            </div>
                          </div>
                        </div>

                        <Link
                          href={isCompleted ? `/test/${test.id}/exam` : `/test/${test.id}`}
                          className={`w-full py-3.5 px-4 font-bold text-sm rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                            studentProfile?.status === 'disabled'
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed pointer-events-none border border-slate-700'
                              : isCompleted
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'brand-gradient brand-gradient-hover'
                          }`}
                        >
                          <span>{isCompleted ? 'View Performance' : 'Enter Exam Portal'}</span>
                          {isCompleted ? <Award className="w-4 h-4" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
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
