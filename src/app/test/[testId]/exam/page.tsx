'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
} from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import {
  Test,
  Question,
  Attempt,
  AttemptViolation,
  ViolationType,
  AttemptResult,
} from '@/types';
import {
  calculateScore,
  saveLocalAttemptDraft,
  getLocalAttemptDraft,
  clearLocalAttemptDraft,
  formatSeconds,
} from '@/lib/utils';
import { AntiCheatingWrapper } from '@/components/exam/AntiCheatingWrapper';
import { QuestionPalette } from '@/components/exam/QuestionPalette';
import { Timer } from '@/components/exam/Timer';
import { ViolationWarning } from '@/components/exam/ViolationWarning';
import { WatermarkOverlay } from '@/components/exam/WatermarkOverlay';
import { DRMContentProtection } from '@/components/exam/DRMContentProtection';
import { StudentProfile } from '@/types';
import {
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Send,
  XCircle,
  HelpCircle,
  Award,
  AlertTriangle,
  Download,
} from 'lucide-react';

export default function ExamPage() {
  const params = useParams();
  const testId = params.testId as string;
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Attempt State
  const [attemptId, setAttemptId] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [violationsCount, setViolationsCount] = useState(0);
  const [violationLogs, setViolationLogs] = useState<AttemptViolation[]>([]);
  const [activeViolationType, setActiveViolationType] = useState<string>('');
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);

  // Result & State flags
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [finalResult, setFinalResult] = useState<AttemptResult | null>(null);
  const [showErrorFeedback, setShowErrorFeedback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Spark Plan Optimization: Single Query Load Questions
  useEffect(() => {
    if (!user || !testId) return;

    const initExam = async () => {
      setLoading(true);
      try {
        // 1. Load Test Metadata
        const testSnap = await getDoc(doc(db, 'tests', testId));
        if (!testSnap.exists()) {
          router.push(`/test/${testId}`);
          return;
        }
        const loadedTest = { id: testSnap.id, ...testSnap.data() } as Test;

        // Security Check: Verify Assignment
        const studentProfile = profile as StudentProfile;
        const assignedBatches = loadedTest.assignedBatchIds || [];
        const studentBatches = studentProfile?.batchIds || [];
        const inAssignedBatch = assignedBatches.some(b => studentBatches.includes(b));

        const isAssigned =
          loadedTest.assignedStudentIds === 'all' ||
          (Array.isArray(loadedTest.assignedStudentIds) && loadedTest.assignedStudentIds.includes(studentProfile?.id || '')) ||
          inAssignedBatch;

        if (!isAssigned) {
          router.push(`/test/${testId}`);
          return;
        }

        setTest(loadedTest);

        // 2. Single Query Fetch All Questions
        const qSnap = await getDocs(
          collection(db, 'tests', testId, 'questions')
        );
        let loadedQs: Question[] = [];
        qSnap.forEach((d) => {
          loadedQs.push({ id: d.id, ...d.data() } as Question);
        });

        // Questions are ALWAYS randomized
        loadedQs = [...loadedQs].sort(() => Math.random() - 0.5);
        setQuestions(loadedQs);

        // 3. Initialize or Restore Attempt
        const generatedAttemptId = `att_${testId}_${user.uid}`;
        setAttemptId(generatedAttemptId);

        const attemptRef = doc(db, 'attempts', generatedAttemptId);
        const attemptSnap = await getDoc(attemptRef);

        const localDraft = getLocalAttemptDraft(testId, user.uid);

        let finalOrder: string[] = [];
        let startTimeStr = new Date().toISOString();
        let loadedAttemptData = attemptSnap.exists() ? attemptSnap.data() as Attempt : null;

        if (loadedAttemptData && loadedAttemptData.status !== 'in_progress') {
          // Already completed exam
          setIsSubmitted(true);
          setFinalResult(loadedAttemptData.result || null);
          setUserAnswers(loadedAttemptData.userAnswers || {});
          setLoading(false);
          return;
        }

        if (loadedAttemptData) {
          startTimeStr = loadedAttemptData.startTime || startTimeStr;
          
          if (loadedAttemptData.questionOrder && loadedAttemptData.questionOrder.length > 0) {
            finalOrder = loadedAttemptData.questionOrder;
            loadedQs.sort((a, b) => finalOrder.indexOf(a.id) - finalOrder.indexOf(b.id));
          } else {
             loadedQs = [...loadedQs].sort(() => Math.random() - 0.5);
             finalOrder = loadedQs.map(q => q.id);
          }
        } else {
          // New attempt
          loadedQs = [...loadedQs].sort(() => Math.random() - 0.5);
          finalOrder = loadedQs.map(q => q.id);

          const newAttempt: Partial<Attempt> = {
            id: generatedAttemptId,
            testId,
            testName: loadedTest.name,
            studentId: user.uid,
            studentName: profile?.name || user.email?.split('@')[0] || 'Student',
            studentEmail: user.email || '',
            studentIdCode: (profile as any)?.studentIdCode || '',
            startTime: startTimeStr,
            status: 'in_progress',
            userAnswers: localDraft?.userAnswers || {},
            violationsCount: localDraft?.violationsCount || 0,
            violationLogs: localDraft?.violationLogs || [],
            questionOrder: finalOrder,
          };
          await setDoc(attemptRef, newAttempt);
          loadedAttemptData = newAttempt as Attempt;
        }

        setQuestions(loadedQs);

        // Hydrate local state
        const answersToUse = (localDraft?.userAnswers && Object.keys(localDraft.userAnswers).length > 0) 
          ? localDraft.userAnswers 
          : (loadedAttemptData?.userAnswers || {});
        if (localDraft || loadedAttemptData) {
          setUserAnswers(answersToUse);
          
          const localViolations = localDraft?.violationsCount || 0;
          const dbViolations = loadedAttemptData?.violationsCount || 0;
          setViolationsCount(Math.max(localViolations, dbViolations));

          // Combine violation logs safely
          const localLogs = localDraft?.violationLogs || [];
          const dbLogs = loadedAttemptData?.violationLogs || [];
          setViolationLogs(localLogs.length > dbLogs.length ? localLogs : dbLogs);
        }

        // Set Initial Question Index to first unanswered
        const firstUnansweredIdx = loadedQs.findIndex(q => !answersToUse[q.id]);
        if (firstUnansweredIdx !== -1) {
          setCurrentIndex(firstUnansweredIdx);
        } else {
          setCurrentIndex(0);
        }

        // Calculate Remaining Timer
        const elapsedMs = new Date().getTime() - new Date(startTimeStr).getTime();
        const elapsedSeconds = Math.floor(elapsedMs / 1000);
        const maxDurationSeconds = (loadedTest.durationMinutes || 60) * 60;
        const remaining = Math.max(0, maxDurationSeconds - elapsedSeconds);
        setRemainingSeconds(remaining);

        // Request Fullscreen
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (err) {
        console.error('Error initializing exam:', err);
      } finally {
        setLoading(false);
      }
    };

    initExam();
  }, [testId, user, profile, router]);

  // Periodic Local Draft Caching (Backend sync happens explicitly every 3 questions)
  useEffect(() => {
    if (!testId || !user || isSubmitted) return;

    // Cache locally on state change
    saveLocalAttemptDraft(testId, user.uid, {
      userAnswers,
      violationsCount,
      violationLogs,
      updatedAt: new Date().toISOString(),
    });
  }, [userAnswers, violationsCount, violationLogs, testId, user, attemptId, isSubmitted]);

  // Fullscreen Enforcer
  useEffect(() => {
    const isFullscreenSupported = !!document.documentElement.requestFullscreen;
    
    // Bypass fullscreen requirement for iOS Safari and unsupported browsers
    if (!isFullscreenSupported) {
      setIsFullscreen(true);
      return;
    }

    const handleFs = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFs);
    handleFs(); // Initial check
    return () => document.removeEventListener('fullscreenchange', handleFs);
  }, []);

  // Allow printing only for submitted exam results
  useEffect(() => {
    if (isSubmitted) {
      document.body.classList.add('allow-print');
    } else {
      document.body.classList.remove('allow-print');
    }
    return () => document.body.classList.remove('allow-print');
  }, [isSubmitted]);

  // Final Exam Submission Handler
  const handleSubmitExam = useCallback(
    async (submitReason: 'user' | 'auto_violation' | 'auto_timeout' = 'user') => {
      if (isSubmitting || isSubmitted || !test) return;
      setIsSubmitting(true);

      try {
        const result = calculateScore(questions, userAnswers);

        const submittedAt = new Date().toISOString();
        const finalStatus = submitReason === 'auto_violation' ? 'auto_submitted' : submitReason === 'auto_timeout' ? 'timeout_submitted' : 'completed';

        await updateDoc(doc(db, 'attempts', attemptId), {
          userAnswers,
          violationsCount,
          violationLogs,
          submittedAt,
          status: finalStatus,
          result,
        });

        clearLocalAttemptDraft(testId, user?.uid || '');
        setFinalResult(result);
        setIsSubmitted(true);

        // Exit fullscreen
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {
        console.error('Failed to submit exam:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, isSubmitted, test, questions, userAnswers, testId, user, attemptId, violationsCount, violationLogs]
  );

  // Throttling and Ref for handleViolation
  const lastViolationTimeRef = useRef<number>(0);
  const handleSubmitExamRef = useRef(handleSubmitExam);

  useEffect(() => {
    handleSubmitExamRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  // Anti-Cheating Violation Callback
  const handleViolation = useCallback(
    (type: ViolationType, details?: string) => {
      if (isSubmitted) return;

      const now = Date.now();
      // Prevent duplicate flags if multiple events fire at the exact same moment (e.g. blur + visibilitychange)
      if (now - lastViolationTimeRef.current < 1500) {
        return;
      }
      lastViolationTimeRef.current = now;

      const newViolation: AttemptViolation = {
        timestamp: new Date().toISOString(),
        type,
        details,
      };

      setViolationLogs((prev) => {
        const updatedLogs = [...prev, newViolation];
        // Asynchronously update Firebase violation logs in real-time
        if (attemptId) {
          updateDoc(doc(db, 'attempts', attemptId), {
            violationsCount: updatedLogs.length,
            violationLogs: updatedLogs,
            lastViolationAt: newViolation.timestamp,
          }).catch((err) => console.error('Failed to log violation to Firebase:', err));
        }
        return updatedLogs;
      });

      setViolationsCount((prev) => {
        const newCount = prev + 1;
        if (newCount >= 10) {
          // Auto submit exam when max violation limit (10) is exceeded
          setTimeout(() => {
            handleSubmitExamRef.current('auto_violation');
          }, 200);
        }
        return newCount;
      });

      setActiveViolationType(type);
      setShowViolationModal(true);
    },
    [isSubmitted, attemptId]
  );

  // Option Select Handler
  const handleOptionSelect = (optionKey: string) => {
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    if (showErrorFeedback) return; // Enforce no changes while viewing error feedback
    
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optionKey,
    }));
  };

  const handleNextQuestion = async () => {
    if (isSaving) return;
    if (!questions[currentIndex]) return;
    const qId = questions[currentIndex].id;
    const selectedAns = userAnswers[qId];
    if (!selectedAns) return; // Enforce answering

    // Check if wrong and feedback hasn't been shown yet
    if (selectedAns !== questions[currentIndex].correctAnswer && !showErrorFeedback) {
      setShowErrorFeedback(true);
      return; // Stop here to show feedback
    }

    // Proceeding to next question
    const answeredCount = Object.keys(userAnswers).length;
    
    // Auto-save to Firebase every 3 questions
    if (answeredCount > 0 && answeredCount % 3 === 0 && attemptId) {
      setIsSaving(true);
      try {
        await updateDoc(doc(db, 'attempts', attemptId), {
          userAnswers,
          violationsCount,
          violationLogs,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed batch Firestore sync:', err);
      } finally {
        setIsSaving(false);
      }
    }

    setShowErrorFeedback(false);
    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1));
  };



  if (loading || !test) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-bold">Initializing Secure Exam Session...</span>
        </div>
      </div>
    );
  }

  /* Instant Result & Scorecard View */
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-brand-600" />
              <span className="font-extrabold text-slate-900">Vamsi Academy Exam Evaluation</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="py-2 px-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow print:hidden"
            >
              Back to Portal
            </button>
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
          {/* Result Header Card */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-card text-center relative overflow-hidden">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 shadow-lg ${
                finalResult?.passed
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-600'
                  : 'bg-red-100 border-red-300 text-red-600'
              }`}
            >
              {finalResult?.passed ? <Award className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
            </div>

            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2 ${
                finalResult?.passed
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {finalResult?.passed ? 'TEST RESULT' : 'NEEDS IMPROVEMENT'}
            </span>

            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {test.name}
            </h1>

            <div className="mt-2 text-sm text-slate-500 font-medium">
              Student: <strong className="text-slate-800">{profile?.name || 'Student'}</strong> | ID: <strong className="text-slate-800 font-mono">{(profile as any)?.studentIdCode || 'N/A'}</strong>
            </div>

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-medium">
              <div>
                <span className="text-slate-400 block font-semibold">Total Correct</span>
                <strong className="text-xl font-mono font-black text-brand-600">
                  {finalResult?.score} / {questions.length}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Percentage</span>
                <strong className="text-xl font-mono font-black text-slate-800">
                  {finalResult?.percentage}%
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Correct Answers</span>
                <strong className="text-xl font-mono font-black text-emerald-600">
                  {finalResult?.correct}
                </strong>
              </div>

              <div>
                <span className="text-slate-400 block font-semibold">Wrong Answers</span>
                <strong className="text-xl font-mono font-black text-red-600">
                  {finalResult?.wrong}
                </strong>
              </div>
            </div>
          </div>

          {/* Solutions & Explanations (Only available after test end date) */}
          {new Date() > new Date(test.endDateTime) ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Detailed Solutions & Explanations
                </h2>
                <button
                  onClick={() => window.print()}
                  className="py-2 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 print:hidden"
                >
                  <Download className="w-3.5 h-3.5" /> Save as PDF
                </button>
              </div>
              {questions.map((q, idx) => {
                const userAns = userAnswers[q.id];
                const isCorrect = userAns && userAns.toUpperCase() === q.correctAnswer.toUpperCase();

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-3xl p-6 border shadow-soft ${
                      isCorrect ? 'border-emerald-200' : userAns ? 'border-red-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-100 font-bold text-xs flex items-center justify-center text-slate-700">
                          {idx + 1}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900">{q.question}</h3>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : userAns
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCorrect ? 'Correct' : userAns ? 'Wrong' : 'Skipped'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium mb-3">
                      {[
                        { key: 'A', text: q.optionA },
                        { key: 'B', text: q.optionB },
                        { key: 'C', text: q.optionC },
                        { key: 'D', text: q.optionD },
                      ].map((opt) => (
                        <div
                          key={opt.key}
                          className={`p-2.5 rounded-xl border flex items-center justify-between ${
                            opt.key === q.correctAnswer
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                              : opt.key === userAns
                              ? 'bg-red-50 text-red-900 border-red-300'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span>{opt.key}. {opt.text}</span>
                          {opt.key === q.correctAnswer && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {q.explanation && (
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 font-medium">
                        <strong>Solution Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200 text-center print:hidden">
              <h3 className="text-amber-800 font-bold mb-2">Detailed Solutions Locked</h3>
              <p className="text-amber-700 text-sm">
                Detailed solutions, explanations, and the PDF download will be available here after the examination window closes on {new Date(test.endDateTime).toLocaleString()}.
              </p>
            </div>
          )}
        </main>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <AntiCheatingWrapper enabled={!isSubmitted} onViolation={handleViolation}>
      <WatermarkOverlay
        studentName={profile?.name}
        studentId={(profile as StudentProfile)?.studentIdCode || '100'}
        opacity={0.3}
      />
      <div className="min-h-screen bg-slate-900 text-white flex flex-col font-sans">
        {/* Fullscreen Exam Header */}
        <header className="bg-slate-900 text-white py-3 px-6 sticky top-0 z-40 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl brand-gradient flex items-center justify-center font-extrabold text-sm">
              VA
            </div>
            <div>
              <h2 className="text-sm font-extrabold tracking-tight leading-none text-slate-100">
                {test.name}
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Student: {profile?.name || 'Student'} | ID: {(profile as any)?.studentIdCode || '100'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Timer
              initialSeconds={remainingSeconds}
              onTimeUp={() => handleSubmitExam('auto_timeout')}
            />
          </div>
        </header>

        {/* Exam Body Workspace */}
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Display Area (3 Cols) */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-card flex flex-col justify-between exam-protected-content">
            <DRMContentProtection isObfuscated={showViolationModal}>
            {currentQ ? (
              <div>
                {/* Question Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
                  <div className="flex items-center gap-2.5">
                    <span className="px-3 py-1 rounded-xl bg-brand-50 text-brand-700 font-black text-xs border border-brand-200">
                      Question {currentIndex + 1} of {questions.length}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      +{currentQ.marks} Mark{currentQ.marks > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Question Text & Optional Image */}
                <div className="space-y-4 mb-8">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                    {currentQ.question}
                  </h3>

                    {currentQ.imageUrl && (
                      <div className="max-w-md rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                        <img
                          src={currentQ.imageUrl}
                          alt="Question Reference"
                          className="w-full h-auto object-contain max-h-64"
                        />
                      </div>
                    )}
                  </div>

                  {/* MCQ Options List */}
                  <div className="space-y-3">
                    {[
                      { key: 'A', text: currentQ.optionA },
                      { key: 'B', text: currentQ.optionB },
                      { key: 'C', text: currentQ.optionC },
                      { key: 'D', text: currentQ.optionD },
                    ].map((opt) => {
                      const hasAnswered = !!userAnswers[currentQ.id];
                      const isSelected = userAnswers[currentQ.id] === opt.key;
                      const isCorrectAnswer = currentQ.correctAnswer === opt.key;
                      
                      let containerStyles = 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800';
                      let iconStyles = 'bg-slate-100 text-slate-600 border-slate-300';
                      
                      if (showErrorFeedback) {
                        if (isSelected && !isCorrectAnswer) {
                          containerStyles = 'bg-red-50 border-red-500 text-red-950 font-bold shadow-md ring-2 ring-red-500/20 cursor-default';
                          iconStyles = 'bg-red-600 text-white border-red-600';
                        } else if (isCorrectAnswer) {
                          containerStyles = 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-md cursor-default';
                          iconStyles = 'bg-emerald-600 text-white border-emerald-600';
                        } else {
                          containerStyles = 'bg-slate-50 border-slate-200 text-slate-400 cursor-default opacity-60';
                          iconStyles = 'bg-slate-100 text-slate-300 border-slate-200';
                        }
                      } else if (isSelected) {
                         // Normal selection before clicking next
                         containerStyles = 'bg-brand-50 border-brand-500 text-brand-950 font-bold shadow-md shadow-brand-500/10 ring-2 ring-brand-500/20';
                         iconStyles = 'bg-brand-600 text-white border-brand-600';
                      }

                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleOptionSelect(opt.key)}
                          disabled={showErrorFeedback}
                          className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-200 ${containerStyles}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center shrink-0 border ${iconStyles}`}
                          >
                            {opt.key}
                          </span>
                          <span className="pt-0.5 text-sm flex-1">{opt.text}</span>
                          
                          {showErrorFeedback && isCorrectAnswer && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {showErrorFeedback && isSelected && !isCorrectAnswer && (
                            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-medium">
                No questions available in this test.
              </div>
            )}

            {/* Exam Navigation Footer */}
            <div className="pt-6 border-t border-slate-100 mt-8 flex items-center justify-end gap-3">
              {currentIndex === questions.length - 1 ? (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to submit your examination now?')) {
                      handleSubmitExam('user');
                    }
                  }}
                  disabled={isSubmitting || !userAnswers[currentQ?.id]}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit Exam'}
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  disabled={!userAnswers[currentQ?.id] || isSaving}
                  className="py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Next Question'} <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
            </DRMContentProtection>
          </div>

          {/* Sidebar Question Palette (1 Col) */}
          <div className="lg:col-span-1 space-y-4">
            <QuestionPalette
              questions={questions}
              currentQuestionIndex={currentIndex}
              userAnswers={userAnswers}
            />
          </div>
        </div>

        {/* Security Violation Popup Warning */}
        <ViolationWarning
          isOpen={showViolationModal}
          violationCount={violationsCount}
          violationType={activeViolationType}
          onDismiss={() => setShowViolationModal(false)}
        />

        {/* Fullscreen Enforcer Overlay */}
        {!isFullscreen && !isSubmitted && !showViolationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm select-none">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-red-100 animate-bounce-short">
              <div className="w-16 h-16 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Fullscreen Required</h2>
              <p className="text-sm text-slate-600 mb-6 font-medium">
                You must be in fullscreen mode to view questions and submit answers.
              </p>
              <button
                onClick={() => {
                  if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen().catch(() => {});
                  }
                }}
                className="w-full py-3.5 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-red-500/25"
              >
                Return to Fullscreen
              </button>
            </div>
          </div>
        )}
      </div>
    </AntiCheatingWrapper>
  );
}
