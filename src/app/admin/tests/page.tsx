'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Test } from '@/types';
import { TestModal } from '@/components/admin/TestModal';
import { formatDateTime, generateShareCode } from '@/lib/utils';
import {
  FileCheck2,
  Plus,
  Edit,
  Copy,
  Trash2,
  Globe,
  Lock,
  Clock,
  HelpCircle,
  Share2,
  Check,
  Calendar,
} from 'lucide-react';

export default function AdminTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tests'));
      const list: Test[] = [];
      for (const document of snap.docs) {
        const data = document.data() as Test;
        const qSnap = await getDocs(collection(db, 'tests', document.id, 'questions'));
        list.push({
          ...data,
          id: document.id,
          totalQuestions: qSnap.size,
        });
      }
      setTests(list);
    } catch (err) {
      console.error('Error fetching tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, []);

  const handleSaveTest = async (testData: Partial<Test>) => {
    try {
      const testId = testData.id || `test_${Date.now()}`;
      const docRef = doc(db, 'tests', testId);

      const payload: Test = {
        id: testId,
        name: testData.name || 'Untitled Test',
        description: testData.description || '',
        durationMinutes: testData.durationMinutes || 60,
        startDateTime: testData.startDateTime || new Date().toISOString(),
        endDateTime: testData.endDateTime || new Date().toISOString(),
        maxMarks: testData.maxMarks || 100,
        passingMarks: testData.passingMarks || 40,
        randomizeQuestions: testData.randomizeQuestions ?? false,
        randomizeOptions: testData.randomizeOptions ?? false,
        allowBackNav: testData.allowBackNav ?? true,
        showResultImmediately: testData.showResultImmediately ?? true,
        negativeMarking: testData.negativeMarking ?? 0.25,
        instructions: testData.instructions || '',
        assignedStudentIds: testData.assignedStudentIds || 'all',
        isPublished: testData.isPublished ?? false,
        shareCode: testData.shareCode || generateShareCode(),
        createdAt: testData.createdAt || new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      await fetchTests();
    } catch (err) {
      console.error('Error saving test:', err);
    }
  };

  const handleTogglePublish = async (test: Test) => {
    try {
      const newStatus = !test.isPublished;
      await updateDoc(doc(db, 'tests', test.id), { isPublished: newStatus });
      setTests((prev) =>
        prev.map((t) => (t.id === test.id ? { ...t, isPublished: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to toggle publication:', err);
    }
  };

  const handleDuplicateTest = async (test: Test) => {
    try {
      const newId = `test_${Date.now()}`;
      const newTest: Test = {
        ...test,
        id: newId,
        name: `${test.name} (Copy)`,
        shareCode: generateShareCode(),
        isPublished: false,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'tests', newId), newTest);

      // Copy subcollection questions
      const qSnap = await getDocs(collection(db, 'tests', test.id, 'questions'));
      for (const qDoc of qSnap.docs) {
        await setDoc(doc(db, 'tests', newId, 'questions', qDoc.id), qDoc.data());
      }

      await fetchTests();
    } catch (err) {
      console.error('Failed to duplicate test:', err);
    }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test and all its questions?')) return;
    try {
      await deleteDoc(doc(db, 'tests', id));
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete test:', err);
    }
  };

  const copyShareLink = (test: Test) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/test/${test.id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(test.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileCheck2 className="w-6 h-6 text-brand-600" />
            Examination & Test Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create exams, manage questions, set timing windows, and copy unique student share links.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedTest(null);
            setIsModalOpen(true);
          }}
          className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create New Test
        </button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((n) => (
            <div key={n} className="bg-white rounded-3xl p-6 h-56 border border-slate-200 animate-pulse"></div>
          ))
        ) : tests.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-slate-200">
            <FileCheck2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Tests Created Yet</h3>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;Create New Test&quot; above to set up your first examination.
            </p>
          </div>
        ) : (
          tests.map((test) => (
            <div
              key={test.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft hover:shadow-card transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => handleTogglePublish(test)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                      test.isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {test.isPublished ? (
                      <>
                        <Globe className="w-3.5 h-3.5" /> Published
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Draft / Hidden
                      </>
                    )}
                  </button>

                  <span className="text-xs font-mono font-bold text-brand-600 bg-brand-50 px-2.5 py-0.5 rounded-full border border-brand-100">
                    {test.totalQuestions || 0} Questions
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 leading-snug mb-1">
                  {test.name}
                </h3>

                <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">
                  {test.description || 'Vamsi Academy Online Test'}
                </p>

                <div className="space-y-2 text-xs text-slate-600 mb-6 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="w-3.5 h-3.5" /> Duration
                    </span>
                    <span className="font-bold text-slate-800">{test.durationMinutes} Mins</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <HelpCircle className="w-3.5 h-3.5" /> Questions
                    </span>
                    <span className="font-bold text-brand-600">{test.totalQuestions || 0} Questions</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" /> Schedule Window
                    </span>
                    <span className="font-mono text-[10px] text-slate-600">
                      {formatDateTime(test.startDateTime)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Link
                  href={`/admin/tests/${test.id}/questions`}
                  className="w-full py-2.5 px-3 bg-brand-50 hover:bg-brand-100 text-brand-700 font-extrabold text-xs rounded-xl border border-brand-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4" /> Manage Questions ({test.totalQuestions || 0})
                </Link>

                <div className="flex items-center justify-between gap-1 pt-1">
                  <button
                    onClick={() => copyShareLink(test)}
                    className="flex-1 py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1"
                    title="Copy Share Link"
                  >
                    {copiedId === test.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" /> Share Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedTest(test);
                      setIsModalOpen(true);
                    }}
                    title="Edit Test Settings"
                    className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDuplicateTest(test)}
                    title="Duplicate Test"
                    className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTest(test.id)}
                    title="Delete Test"
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTest}
        initialData={selectedTest}
      />
    </div>
  );
}
