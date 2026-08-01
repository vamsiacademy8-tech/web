import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Question, AttemptResult } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSeconds(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return isoString;
  }
}

export function generateShareCode(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function calculateScore(
  questions: Question[],
  userAnswers: Record<string, string>
): AttemptResult {
  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  questions.forEach((q) => {
    const selected = userAnswers[q.id];
    if (!selected) {
      skipped++;
    } else if (selected.toUpperCase() === q.correctAnswer.toUpperCase()) {
      correct++;
    } else {
      wrong++;
    }
  });

  const total = questions.length;
  const score = correct;
  const percentage =
    total > 0 ? Math.round((correct / total) * 10000) / 100 : 0;

  return {
    score,
    correct,
    wrong,
    skipped,
    percentage,
    passed: true,
  };
}

// Local storage caching for Spark Free Plan optimization
export function getLocalAttemptKey(testId: string, studentId: string): string {
  return `vamsi_exam_draft_${testId}_${studentId}`;
}

export function saveLocalAttemptDraft(
  testId: string,
  studentId: string,
  data: {
    userAnswers: Record<string, string>;
    violationsCount: number;
    violationLogs: any[];
    updatedAt: string;
  }
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      getLocalAttemptKey(testId, studentId),
      JSON.stringify(data)
    );
  } catch (err) {
    console.error('Failed to save attempt locally:', err);
  }
}

export function getLocalAttemptDraft(testId: string, studentId: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getLocalAttemptKey(testId, studentId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Failed to load local attempt draft:', err);
    return null;
  }
}

export function clearLocalAttemptDraft(testId: string, studentId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getLocalAttemptKey(testId, studentId));
  } catch (err) {
    console.error('Failed to clear local attempt draft:', err);
  }
}
