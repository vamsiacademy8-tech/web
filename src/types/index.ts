export type StudentStatus = 'active' | 'disabled';

export interface StudentProfile {
  id: string; // Firebase Auth UID
  authUid?: string; // Optional legacy field
  name: string;
  email: string;
  phone?: string;
  studentIdCode: string; // e.g. "VA-2026-001"
  status: StudentStatus;
  createdAt: string;
  assignedTestIds?: string[];
  batchIds?: string[];
}

export interface Batch {
  id: string;
  name: string;
  description?: string;
  studentIds: string[];
  createdAt: string;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin';
}

export type QuestionOptionKey = 'A' | 'B' | 'C' | 'D';

export interface Question {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: QuestionOptionKey;
  marks: number;
  explanation?: string;
  imageUrl?: string;
  orderIndex: number;
}

export interface Test {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  startDateTime: string; // ISO string
  endDateTime: string; // ISO string
  maxMarks: number;
  passingMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  allowBackNav: boolean;
  showResultImmediately: boolean;
  negativeMarking: number; // e.g. 0 or 0.25 or 0.5 or 1
  instructions: string;
  assignedStudentIds: string[] | 'all';
  assignedBatchIds?: string[];
  isPublished: boolean;
  shareCode: string; // Unique URL share code
  createdAt: string;
  questionCount?: number;
  marksPerQuestion?: number;
}

export type ViolationType = 
  | 'tab_change' 
  | 'visibility_lost' 
  | 'window_minimized' 
  | 'fullscreen_exit'
  | 'context_menu'
  | 'copy_paste_attempt'
  | 'screen_recording_attempt'
  | 'screen_sharing_attempt'
  | 'devtools_opened'
  | 'multiple_tabs_detected'
  | 'screenshot_attempt'
  | 'print_attempt';

export interface AttemptViolation {
  timestamp: string;
  type: ViolationType;
  details?: string;
}

export interface AttemptResult {
  score: number;
  correct: number;
  wrong: number;
  skipped: number;
  percentage: number;
  passed: boolean;
}

export type AttemptStatus = 'in_progress' | 'completed' | 'auto_submitted';

export interface Attempt {
  id: string;
  testId: string;
  testName?: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentIdCode?: string;
  startTime: string; // ISO string
  endTime?: string;
  submittedAt?: string;
  status: AttemptStatus;
  userAnswers: Record<string, string>; // questionId -> selectedOption ('A'|'B'|'C'|'D')
  reviewLater: string[]; // array of questionIds
  violationsCount: number;
  violationLogs: AttemptViolation[];
  questionOrder?: string[]; // array of questionIds representing the randomized order
  result?: AttemptResult;
}

export interface ExamState {
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  reviewLater: string[];
  remainingSeconds: number;
  isSubmitting: boolean;
  violationsCount: number;
  violationLogs: AttemptViolation[];
  lastSavedAt: string | null;
}
