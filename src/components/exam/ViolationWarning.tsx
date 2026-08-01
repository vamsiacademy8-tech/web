'use client';

import React from 'react';
import { AlertOctagon, ShieldAlert } from 'lucide-react';

interface ViolationWarningProps {
  isOpen: boolean;
  violationCount: number;
  violationType: string;
  onDismiss: () => void;
}

export const ViolationWarning: React.FC<ViolationWarningProps> = ({
  isOpen,
  violationCount,
  violationType,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const handleUnderstand = () => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    onDismiss();
  };

  let title = 'Anti-Cheating Security Violation Detected';
  let message = 'Moving away from the examination window is strictly recorded.';

  if (violationType === 'tab_change' || violationType === 'visibility_lost') {
    message = 'You switched browser tabs or minimized the exam window.';
  } else if (violationType === 'fullscreen_exit') {
    message = 'You exited Fullscreen mode.';
  } else if (violationType === 'copy_paste_attempt') {
    message = 'Copying, pasting, or selecting exam content is prohibited.';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black select-none animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-200 text-center animate-bounce-short">
        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 border-4 border-red-50">
          <ShieldAlert className="w-9 h-9" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
          {title}
        </h3>

        <p className="text-sm text-slate-600 font-medium mb-4">{message}</p>

        <div className="p-3 bg-red-50 border border-red-200 rounded-2xl mb-6">
          <div className="flex items-center justify-center gap-2 text-red-700 font-bold text-sm">
            <AlertOctagon className="w-4 h-4" />
            <span>Total Violation Count: {violationCount} / 10</span>
          </div>
          <p className="text-xs text-red-600 mt-1">
            All security flags are saved. The exam will auto-submit after 10 violations.
          </p>
        </div>

        <button
          onClick={handleUnderstand}
          className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-red-500/25 transition-all"
        >
          I Understand & Return to Exam
        </button>
      </div>
    </div>
  );
};
