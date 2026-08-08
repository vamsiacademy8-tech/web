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
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-6 h-6 text-brand-600" />
            Results, Leaderboards & Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review detailed student marks, anti-cheating violation logs, and export reports to PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchData}
            disabled={loading}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm border border-slate-200 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {filteredAttempts.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={loading}
              className="py-2.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl shadow-sm border border-red-200 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear All
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={!filteredAttempts.length}
            className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Export PDF Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
        <div className="flex-1 relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Student Name, ID, or Test..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none text-xs font-medium focus:border-brand-500 transition-all"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="w-full px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 outline-none text-xs font-bold text-slate-700"
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
        <div className="bg-gradient-to-r from-navy-800 via-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold tracking-tight">Examination Top Rankers</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((item, index) => (
              <div
                key={item.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex items-center gap-3"
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
                  <h4 className="font-bold text-sm truncate">{item.studentName}</h4>
                  <span className="text-xs text-brand-300 font-mono font-extrabold block">
                    Score: {item.result?.score} ({item.result?.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Attempts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            Loading examination attempts...
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            No exam attempts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Test</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Score & %</th>
                  <th className="py-3 px-4">Breakdown (C / W / S)</th>
                  <th className="py-3 px-4">Violations</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{attempt.studentName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{attempt.studentIdCode || attempt.studentEmail}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {attempt.testName || 'Test'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          attempt.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {attempt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sm">
                      {attempt.result ? (
                        <span className={attempt.result.passed ? 'text-emerald-600' : 'text-red-600'}>
                          {attempt.result.score} ({attempt.result.percentage}%)
                        </span>
                      ) : (
                        <span className="text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {attempt.result ? (
                        <span>
                          <strong className="text-emerald-600">{attempt.result.correct}</strong> /{' '}
                          <strong className="text-red-600">{attempt.result.wrong}</strong> /{' '}
                          <strong className="text-slate-400">{attempt.result.skipped}</strong>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {attempt.violationsCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> {attempt.violationsCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleResetAttempt(attempt)}
                          className="py-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-lg border border-amber-200 transition-colors flex items-center gap-1"
                          title="Allow Student to Rewrite Test"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Allow Re-write
                        </button>
                        <button
                          onClick={() => setSelectedAttempt(attempt)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                Attempt Evaluation & Security Logs
              </h3>
              <button
                onClick={() => setSelectedAttempt(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-sm text-slate-900">{selectedAttempt.studentName}</div>
                  <button
                    onClick={() => handleResetAttempt(selectedAttempt)}
                    className="py-1 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Allow Re-write Test
                  </button>
                </div>
                <div className="text-slate-500 font-mono mb-2">ID: {selectedAttempt.studentIdCode || selectedAttempt.studentEmail}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-700 font-medium">
                  <div>Status: <strong className="uppercase">{selectedAttempt.status}</strong></div>
                  <div>Final Score: <strong className="text-brand-600 font-bold">{selectedAttempt.result?.score} Marks</strong></div>
                  <div>Percentage: <strong>{selectedAttempt.result?.percentage}%</strong></div>
                  <div>Pass Status: <strong className={selectedAttempt.result?.passed ? 'text-emerald-600' : 'text-red-600'}>{selectedAttempt.result?.passed ? 'PASSED' : 'FAILED'}</strong></div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Proctoring Violation History ({selectedAttempt.violationsCount || 0})
                </h4>
                {selectedAttempt.violationLogs && selectedAttempt.violationLogs.length > 0 ? (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedAttempt.violationLogs.map((v, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800 font-medium"
                      >
                        <span className="capitalize">{v.type.replace('_', ' ')}</span>
                        <span className="font-mono text-[10px] text-red-600">
                          {formatDateTime(v.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-semibold text-center">
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
