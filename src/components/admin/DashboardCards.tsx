'use client';

import React from 'react';
import { FileCheck, Users, PlayCircle, CheckCircle2, Clock } from 'lucide-react';

interface MetricProps {
  totalTests: number;
  totalStudents: number;
  activeTests: number;
  completedTests: number;
  recentAttemptsCount: number;
}

export const DashboardCards: React.FC<MetricProps> = ({
  totalTests,
  totalStudents,
  activeTests,
  completedTests,
  recentAttemptsCount,
}) => {
  const cards = [
    {
      title: 'Total Tests',
      value: totalTests,
      icon: FileCheck,
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    },
    {
      title: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Active Tests',
      value: activeTests,
      icon: PlayCircle,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    {
      title: 'Completed Tests',
      value: completedTests,
      icon: CheckCircle2,
      color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    },
    {
      title: 'Recent Attempts',
      value: recentAttemptsCount,
      icon: Clock,
      color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="dark-panel rounded-3xl p-6 hover:shadow-glow hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-jakarta">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-2xl border shadow-sm ${card.color.split(' ').slice(2).join(' ')}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-5">
              <span className="text-4xl font-extrabold text-white tracking-tight font-jakarta">
                {card.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
