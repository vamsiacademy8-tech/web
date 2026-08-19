'use client';

import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, deleteDoc, writeBatch } from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { Attempt, Test } from '@/types';
import { formatDateTime } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Award,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Trophy,
  UserCheck,
  Eye,
  X,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export default function AdminResultsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Tests for Filter Dropdown
      const testsSnap = await getDocs(collection(db, 'tests'));
      const tList: Test[] = [];
      testsSnap.forEach((d) => tList.push({ ...d.data(), id: d.id } as Test));
      setTests(tList);

      // Fetch All Attempts (Sorted in-memory to prevent Firestore missing index errors)
      const attemptsSnap = await getDocs(collection(db, 'attempts'));
      const aList: Attempt[] = [];
      attemptsSnap.forEach((d) => aList.push({ ...d.data(), id: d.id } as Attempt));
      aList.sort((a, b) => new Date(b.startTime || 0).getTime() - new Date(a.startTime || 0).getTime());
      setAttempts(aList);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAttempts = attempts.filter((a) => {
    const matchesTest = selectedTestId === 'all' || a.testId === selectedTestId;
    const matchesSearch =
      a.studentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.studentIdCode || a.studentEmail)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.testName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTest && matchesSearch;
  });

  // Calculate Leaderboard (sorted by score/percentage desc)
  const leaderboard = [...filteredAttempts]
    .filter((a) => a.result)
    .sort((a, b) => (b.result?.percentage ?? 0) - (a.result?.percentage ?? 0));

  const handleExportPDF = () => {
    if (!filteredAttempts.length) return;
    
    const doc = new jsPDF('landscape');
    doc.text('Results, Leaderboards & Analytics Report', 14, 20);
    
    const tableCols = [
      'Student Name',
      'Student ID',
      'Test ID',
      'Status',
      'Score',
      'Percentage',
      'Passed',
      'Violations'
    ];
    
    const tableRows = filteredAttempts.map((a) => {
      const row: string[] = [];
      row.push(a.studentName || 'N/A');
      row.push(a.studentIdCode || a.studentEmail || 'N/A');
      row.push(a.testName || a.testId || 'N/A');
      row.push(a.status || 'N/A');
      row.push(String(a.result?.score ?? 0));
      row.push(`${a.result?.percentage ?? 0}%`);
      row.push(a.result?.passed ? 'YES' : 'NO');
      row.push(String(a.violationsCount || 0));
      return row;
    });

    autoTable(doc, {
      startY: 30,
      head: [tableCols],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 9 },
    });

    doc.save(`vamsi_academy_results_${Date.now()}.pdf`);
  };

  const handleResetAttempt = async (attempt: Attempt) => {
    if (
      !confirm(
        `Allow student "${attempt.studentName}" to rewrite test "${attempt.testName || attempt.testId}"?\n\nThis will reset their previous attempt so they can take the exam fresh.`
      )
    ) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'attempts', attempt.id));
      setAttempts((prev) => prev.filter((a) => a.id !== attempt.id));
      if (selectedAttempt?.id === attempt.id) {
        setSelectedAttempt(null);
      }
      alert(`Attempt reset successfully! ${attempt.studentName} can now rewrite the test.`);
    } catch (err) {
      console.error('Failed to reset attempt:', err);
      alert('Failed to reset attempt for rewrite.');
    }
  };

  const handleClearAll = async () => {
    if (!filteredAttempts.length) return;
    if (!confirm('Are you absolutely sure you want to delete ALL result records currently shown? This action cannot be undone.')) return;

    try {
      setLoading(true);
      const batch = writeBatch(db);
      filteredAttempts.forEach((a) => {
        batch.delete(doc(db, 'attempts', a.id));
      });
      await batch.commit();
      
      const remaining = attempts.filter(a => !filteredAttempts.find(f => f.id === a.id));
      setAttempts(remaining);
      setSelectedAttempt(null);
      alert('Result records cleared successfully.');
    } catch (err) {
      console.error('Failed to clear records:', err);
      alert('Failed to clear records.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 font-jakarta">
            <Award className="w-6 h-6 text-brand-400" />
            Results, Leaderboards & Analytics
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1.5">
            Review detailed student marks, anti-cheating violation logs, and export reports to PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-extrabold text-sm rounded-xl border border-slate-700 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {filteredAttempts.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="py-2.5 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-extrabold text-sm rounded-xl border border-red-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={!filteredAttempts.length}
            className="py-2.5 px-4 brand-gradient brand-gradient-hover text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 dark-panel p-4 rounded-2xl">
        <div className="flex-1 relative w-full">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name, ID, or Test..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 outline-none text-sm font-medium focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all text-white placeholder-slate-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 outline-none text-sm font-bold text-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 transition-all"
          >
            <option value="all">All Examinations ({tests.length})</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Leaderboard Cards */}
      {leaderboard.length > 0 && (
        <div className="dark-panel rounded-3xl p-6 text-white shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold tracking-tight font-jakarta">Examination Top Rankers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((item, index) => (
              <div
                key={item.id}
                className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800 flex items-center gap-3"
              >
                <div
                  className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                    index === 0
                      ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/30'
                      : index === 1
                      ? 'bg-slate-300 text-slate-900'
                      : 'bg-amber-700 text-white'
                  }`}
                >
                  #{index + 1}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-sm truncate text-white">{item.studentName}</h4>
                  <span className="text-xs text-brand-400 font-mono font-extrabold block">
                    Score: {item.result?.score} ({item.result?.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Attempts Table */}
      <div className="dark-panel rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            Loading examination attempts...
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium">
            No exam attempts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider font-jakarta">
                  <th className="py-4 px-6">Student</th>
                  <th className="py-4 px-6">Test</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Score & %</th>
                  <th className="py-4 px-6">Breakdown (C / W / S)</th>
                  <th className="py-4 px-6">Violations</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm font-medium">
                {filteredAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-bold text-white">{attempt.studentName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{attempt.studentIdCode || attempt.studentEmail}</div>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-300">
                      {attempt.testName || 'Test'}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                          attempt.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {attempt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-sm">
                      {attempt.result ? (
                        <span className={attempt.result.passed ? 'text-emerald-400' : 'text-red-400'}>
                          {attempt.result.score} ({attempt.result.percentage}%)
                        </span>
                      ) : (
                        <span className="text-slate-500">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">
                      {attempt.result ? (
                        <span>
                          <strong className="text-emerald-400">{attempt.result.correct}</strong> /{' '}
                          <strong className="text-red-400">{attempt.result.wrong}</strong> /{' '}
                          <strong className="text-slate-500">{attempt.result.skipped}</strong>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {attempt.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-md border border-red-500/20">
                          <AlertTriangle className="w-3.5 h-3.5" /> {attempt.violationsCount}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">0</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleResetAttempt(attempt)}
                          className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-bold text-xs rounded-lg border border-amber-500/20 transition-colors flex items-center gap-1.5"
                          title="Allow Student to Rewrite Test"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Allow Re-write
                        </button>
                        <button
                          onClick={() => setSelectedAttempt(attempt)}
                          className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                          title="View Detailed Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Attempt Inspector Modal */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
          <div className="dark-panel rounded-3xl max-w-lg w-full p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white font-jakarta">
                Attempt Evaluation & Security Logs
              </h3>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs font-medium">
              <div className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-base text-white">{selectedAttempt.studentName}</div>
                  <button
                    onClick={() => handleResetAttempt(selectedAttempt)}
                    className="py-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Allow Re-write Test
                  </button>
                </div>
                <div className="text-slate-500 font-mono mb-4">ID: {selectedAttempt.studentIdCode || selectedAttempt.studentEmail}</div>
                <div className="grid grid-cols-2 gap-4 text-slate-400">
                  <div>Status: <strong className="uppercase text-white">{selectedAttempt.status}</strong></div>
                  <div>Final Score: <strong className="text-brand-400 font-bold">{selectedAttempt.result?.score} Marks</strong></div>
                  <div>Percentage: <strong className="text-white">{selectedAttempt.result?.percentage}%</strong></div>
                  <div>Pass Status: <strong className={selectedAttempt.result?.passed ? 'text-emerald-400' : 'text-red-400'}>{selectedAttempt.result?.passed ? 'PASSED' : 'FAILED'}</strong></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Proctoring Violation History ({selectedAttempt.violationsCount || 0})
                </h4>
                {selectedAttempt.violationLogs && selectedAttempt.violationLogs.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {selectedAttempt.violationLogs.map((v, i) => (
                      <div
                        key={i}
                        className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between text-red-400 font-bold"
                      >
                        <span className="capitalize">{v.type.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px] text-red-500/80">
                          {formatDateTime(v.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold text-center">
                    Clean Security Record (Zero Cheating Flags)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
