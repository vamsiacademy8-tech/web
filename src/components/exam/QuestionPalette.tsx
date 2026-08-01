'use client';

import React from 'react';
import { Question } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle2, Bookmark, HelpCircle } from 'lucide-react';

interface QuestionPaletteProps {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
}

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentQuestionIndex,
  userAnswers,
}) => {
  const total = questions.length;
  const answeredCount = Object.keys(userAnswers).length;
  const notAnsweredCount = total - answeredCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
      <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Question Palette</span>
        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
          {answeredCount}/{total} Done
        </span>
      </h4>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-4 pb-3 border-b border-slate-100 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
          <span className="text-slate-600">Answered ({answeredCount})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400"></span>
          <span className="text-slate-600">Not Answered ({notAnsweredCount})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border-2 border-brand-500 bg-white"></span>
          <span className="text-slate-600">Current</span>
        </div>
      </div>

      {/* Numbers Grid */}
      <div className="grid grid-cols-5 gap-2 max-h-72 overflow-y-auto pr-1">
        {questions.map((q, idx) => {
          const isCurrent = currentQuestionIndex === idx;
          const isAnswered = Boolean(userAnswers[q.id]);
          let colorClass = 'bg-slate-100 text-slate-700 border-slate-300';

          if (isAnswered) {
            colorClass = 'bg-emerald-500 text-white border-emerald-600 font-bold opacity-50'; // Locked look
          }

          return (
            <button
              key={q.id || idx}
              disabled={true}
              className={cn(
                'w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center border transition-all duration-200 relative cursor-not-allowed',
                colorClass,
                isCurrent && 'ring-2 ring-brand-500 ring-offset-2 scale-105 font-black shadow-md opacity-100'
              )}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
