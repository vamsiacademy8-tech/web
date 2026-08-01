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
      color: 'bg-blue-500 text-blue-500 bg-blue-50 border-blue-200',
    },
    {
      title: 'Total Students',
      value: totalStudents,
      icon: Users,
      color: 'bg-emerald-500 text-emerald-500 bg-emerald-50 border-emerald-200',
    },
    {
      title: 'Active Tests',
      value: activeTests,
      icon: PlayCircle,
      color: 'bg-amber-500 text-amber-500 bg-amber-50 border-amber-200',
    },
    {
      title: 'Completed Tests',
      value: completedTests,
      icon: CheckCircle2,
      color: 'bg-indigo-500 text-indigo-500 bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Recent Attempts',
      value: recentAttemptsCount,
      icon: Clock,
      color: 'bg-violet-500 text-violet-500 bg-violet-50 border-violet-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition-shadow"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl border ${card.color.split(' ').slice(2).join(' ')}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {card.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
