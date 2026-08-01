'use client';

import React, { useEffect, useState } from 'react';
import { formatSeconds } from '@/lib/utils';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimerProps {
  initialSeconds: number;
  onTimeUp: () => void;
}

export const Timer: React.FC<TimerProps> = ({ initialSeconds, onTimeUp }) => {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      onTimeUp();
      return;
    }

    const timerId = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [seconds, onTimeUp]);

  const isWarning = seconds < 300; // less than 5 minutes

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-2xl border flex items-center gap-2.5 transition-all duration-300 font-mono font-bold text-base shadow-sm',
        isWarning
          ? 'bg-red-50 text-red-600 border-red-200 animate-pulse shadow-red-500/10'
          : 'bg-brand-50 text-brand-700 border-brand-200'
      )}
    >
      {isWarning ? (
        <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
      ) : (
        <Clock className="w-5 h-5 text-brand-600 shrink-0" />
      )}
      <div>
        <span className="text-xs uppercase font-sans tracking-wider block leading-none font-semibold text-slate-400">
          Time Remaining
        </span>
        <span className="text-lg leading-tight">{formatSeconds(seconds)}</span>
      </div>
    </div>
  );
};
