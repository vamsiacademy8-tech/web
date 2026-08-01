'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { Test, StudentProfile } from '@/types';
import { Navbar } from '@/components/ui/Navbar';
import { formatDateTime } from '@/lib/utils';
import {
  FileText,
  Clock,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  LogIn,
  CheckCircle,
  HelpCircle,
  GraduationCap,
} from 'lucide-react';

export default function TestLandingPage() {
  const params = useParams();
  const testId = params.testId as string;
  const router = useRouter();
  const { user, profile, isStudent, loginStudent, loading: authLoading } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Login Form state
  const [studentId, setStudentId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const fetchTestDetails = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'tests', testId));
        if (snap.exists()) {
          setTest({ id: snap.id, ...snap.data() } as Test);
        } else {
          setError('Examination Test not found. Please verify the URL link.');
        }
      } catch (err) {
        console.error('Error fetching test landing details:', err);
        setError('Failed to load test details.');
      } finally {
        setLoading(false);
      }
    };

    if (testId) fetchTestDetails();
  }, [testId]);

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);
    try {
      await loginStudent(studentId, mobileNumber);
    } catch (err: any) {
      setLoginError(err?.message || 'Invalid credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const startExam = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    router.push(`/test/${testId}/exam`);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold text-slate-600">Verifying Test Access...</span>
        </div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 shadow-card">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Exam Unavailable</h3>
            <p className="text-xs text-slate-500 mt-2">{error || 'Test not found.'}</p>
          </div>
        </main>
      </div>
    );
  }

  // Schedule Window Calculations
  const now = new Date();
  const startDate = new Date(test.startDateTime);
  const endDate = new Date(test.endDateTime);

  const isBeforeStart = now < startDate;
  const isAfterEnd = now > endDate;
  const isAvailable = !isBeforeStart && !isAfterEnd && test.isPublished;

  // Student Assignment Check
  const studentProfile = profile as StudentProfile;
  const isAssigned =
    test.assignedStudentIds === 'all' ||
    (Array.isArray(test.assignedStudentIds) &&
      test.assignedStudentIds.includes(user?.uid || ''));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title={test.name} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {!user ? (
          /* Student Authentication Card */
          <div className="max-w-md mx-auto bg-white rounded-3xl p-8 shadow-card border border-slate-200">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl brand-gradient flex items-center justify-center mx-auto mb-3 shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Student Sign In Required
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Log in to access &quot;<strong className="text-slate-800">{test.name}</strong>&quot;
              </p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
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
                  placeholder="e.g. 100"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-xs font-mono font-bold text-slate-800"
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
                  placeholder="9876543210"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                {isAuthenticating ? 'Authenticating...' : 'Authenticate & Enter'}
              </button>
            </form>
          </div>
        ) : !isAssigned ? (
          /* Not Assigned Warning */
          <div className="bg-white rounded-3xl p-8 text-center border border-red-200 shadow-card max-w-md mx-auto">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 mt-2">
              Your account ({user.email}) is not assigned to take this examination test.
            </p>
          </div>
        ) : (
          /* Instructions & Start Exam Screen */
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                <div>
                  <span className="text-xs font-bold text-brand-600 uppercase tracking-wider block">
                    Vamsi Academy Online Assessment
                  </span>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                    {test.name}
                  </h1>
                </div>
                <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-full">
                  Duration: {test.durationMinutes} Mins
                </span>
              </div>

              {/* Metrics Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-brand-600" />
                  <div>
                    <span className="text-slate-400 font-semibold block">Examination Duration</span>
                    <strong className="text-slate-900 font-bold">{test.durationMinutes} Minutes</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-slate-400 font-semibold block">Proctoring Protocol</span>
                    <strong className="text-slate-900 font-bold">Strict Anti-Cheat Enforced</strong>
                  </div>
                </div>
              </div>

              {/* Timing Notice */}
              {isBeforeStart ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs font-medium mb-6 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <strong className="block text-sm">Exam Has Not Started Yet</strong>
                    <span>Scheduled to begin on <strong>{formatDateTime(test.startDateTime)}</strong></span>
                  </div>
                </div>
              ) : isAfterEnd ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs font-medium mb-6 flex items-center gap-3">
                  <Clock className="w-6 h-6 text-red-600 shrink-0" />
                  <div>
                    <strong className="block text-sm">Exam Schedule Expired</strong>
                    <span>This test concluded on <strong>{formatDateTime(test.endDateTime)}</strong></span>
                  </div>
                </div>
              ) : !test.isPublished ? (
                <div className="p-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 text-xs font-medium mb-6">
                  This test is currently unpublished by the administrator.
                </div>
              ) : null}

              {/* Instructions */}
              <div className="space-y-3 mb-8">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" /> Examination Instructions
                </h3>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-line">
                  {test.instructions || 'Follow all standard Vamsi Academy examination protocols.'}
                </div>
              </div>

              {/* Action Button */}
              {isAvailable && (
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                  <button
                    onClick={startExam}
                    className="py-4 px-8 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-brand-500/25 transition-all flex items-center gap-3 scale-100 hover:scale-105"
                  >
                    <PlayCircle className="w-6 h-6" />
                    <span>Start Examination Now</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
