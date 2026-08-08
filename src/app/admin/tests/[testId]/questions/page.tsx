'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  updateDoc,
  increment,
} from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { Question, Test, QuestionOptionKey } from '@/types';
import { CSVQuestionImporter } from '@/components/admin/CSVQuestionImporter';
import { exportToCSV } from '@/lib/csvHelper';
import { TestModal } from '@/components/admin/TestModal';
import {
  HelpCircle,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  Edit,
  ArrowLeft,
  Save,
  X,
  CheckCircle,
  Settings,
} from 'lucide-react';

export default function QuestionManagementPage() {
  const params = useParams();
  const testId = params.testId as string;
  const router = useRouter();

  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Single Question Add/Edit
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [isEditTestModalOpen, setIsEditTestModalOpen] = useState(false);

  // Form Fields
  const [qText, setQText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState<QuestionOptionKey>('A');
  const [marks, setMarks] = useState(1);
  const [explanation, setExplanation] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const fetchTestAndQuestions = async () => {
    setLoading(true);
    try {
      // Fetch Test Meta
      const testSnap = await getDoc(doc(db, 'tests', testId));
      if (testSnap.exists()) {
        setTest({ id: testSnap.id, ...testSnap.data() } as Test);
      }

      // Fetch Subcollection Questions
      const qSnap = await getDocs(collection(db, 'tests', testId, 'questions'));
      const qList: Question[] = [];
      qSnap.forEach((d) => {
        qList.push({ id: d.id, ...d.data() } as Question);
      });
      qList.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      setQuestions(qList);
    } catch (err) {
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (testId) fetchTestAndQuestions();
  }, [testId]);

  const openAddModal = () => {
    setEditingQuestion(null);
    setQText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrect('A');
    setMarks(test?.marksPerQuestion || 1);
    setExplanation('');
    setImageUrl('');
    setIsQuestionModalOpen(true);
  };

  const openEditModal = (q: Question) => {
    setEditingQuestion(q);
    setQText(q.question);
    setOptA(q.optionA);
    setOptB(q.optionB);
    setOptC(q.optionC);
    setOptD(q.optionD);
    setCorrect(q.correctAnswer);
    setMarks(q.marks || 1);
    setExplanation(q.explanation || '');
    setImageUrl(q.imageUrl || '');
    setIsQuestionModalOpen(true);
  };

  const handleEditTestSave = async (testData: Partial<Test>) => {
    try {
      await setDoc(doc(db, 'tests', testId), testData, { merge: true });
      setIsEditTestModalOpen(false);
      await fetchTestAndQuestions();
    } catch (err) {
      console.error('Failed to update test:', err);
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qId = editingQuestion?.id || `q_${Date.now()}`;
      const qRef = doc(db, 'tests', testId, 'questions', qId);

      const payload: Question = {
        id: qId,
        question: qText,
        optionA: optA,
        optionB: optB,
        optionC: optC,
        optionD: optD,
        correctAnswer: correct,
        marks: Number(marks) || test?.marksPerQuestion || 1,
        explanation,
        imageUrl,
        orderIndex: editingQuestion?.orderIndex ?? questions.length,
      };

      const isNew = !editingQuestion;
      const prevMarks = editingQuestion?.marks || 0;
      const newMarks = Number(marks) || test?.marksPerQuestion || 1;
      const markDiff = newMarks - (isNew ? 0 : prevMarks);

      await setDoc(qRef, payload, { merge: true });
      if (isNew || markDiff !== 0) {
        const updateData: any = {};
        if (isNew) updateData.questionCount = increment(1);
        if (markDiff !== 0) updateData.maxMarks = increment(markDiff);
        await updateDoc(doc(db, 'tests', testId), updateData);
      }
      setIsQuestionModalOpen(false);
      await fetchTestAndQuestions();
    } catch (err) {
      console.error('Failed to save question:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const q = questions.find((x) => x.id === id);
      const qMarks = q?.marks || test?.marksPerQuestion || 1;
      await deleteDoc(doc(db, 'tests', testId, 'questions', id));
      await updateDoc(doc(db, 'tests', testId), { 
        questionCount: increment(-1),
        maxMarks: increment(-qMarks)
      });
      setQuestions((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Warning! Delete all ${questions.length} questions from this test?`)) return;
    try {
      const batch = writeBatch(db);
      questions.forEach((q) => {
        batch.delete(doc(db, 'tests', testId, 'questions', q.id));
      });
      await batch.commit();
      await updateDoc(doc(db, 'tests', testId), { questionCount: 0, maxMarks: 0 });
      setQuestions([]);
    } catch (err) {
      console.error('Failed to bulk delete questions:', err);
    }
  };

  const handleCSVImport = async (newQuestions: Omit<Question, 'id'>[]) => {
    try {
      const batch = writeBatch(db);
      newQuestions.forEach((q, idx) => {
        const qId = `q_${Date.now()}_${idx}`;
        const ref = doc(db, 'tests', testId, 'questions', qId);
        batch.set(ref, {
          ...q,
          id: qId,
          orderIndex: questions.length + idx,
        });
      });
      await batch.commit();
      
      let totalImportMarks = 0;
      newQuestions.forEach(q => { totalImportMarks += Number(q.marks || test?.marksPerQuestion || 1); });

      await updateDoc(doc(db, 'tests', testId), { 
        questionCount: increment(newQuestions.length),
        maxMarks: increment(totalImportMarks)
      });
      await fetchTestAndQuestions();
    } catch (err) {
      console.error('Failed batch question import:', err);
      throw err;
    }
  };

  const handleExportCSV = () => {
    if (questions.length === 0) return;
    const exportRows = questions.map((q) => ({
      Question: q.question,
      'Option A': q.optionA,
      'Option B': q.optionB,
      'Option C': q.optionC,
      'Option D': q.optionD,
      'Correct Answer': q.correctAnswer,
      Marks: q.marks || test?.marksPerQuestion || 1,
      Explanation: q.explanation || '',
      'Image URL': q.imageUrl || '',
    }));
    exportToCSV(`questions_${test?.name || testId}`, exportRows);
  };

  return (
    <div className="space-y-6">
      {/* Back & Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/tests"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-brand-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Tests
        </Link>
        <span className="text-xs text-slate-400 font-mono">Test ID: {testId}</span>
      </div>

      {/* Main Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
            MCQ Question Bank Manager
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {test?.name || 'Examination Test Questions'}
            </h1>
            <button
              onClick={() => setIsEditTestModalOpen(true)}
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
              title="Edit Test Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Total Questions: <strong className="text-slate-800">{questions.length}</strong> | Duration: {test?.durationMinutes} Mins | Max Marks: {test?.maxMarks}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {questions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Bulk Delete
            </button>
          )}

          {questions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}

          <button
            onClick={() => setIsCSVModalOpen(true)}
            className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Bulk CSV Import
          </button>

          <button
            onClick={openAddModal}
            className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add MCQ Question
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium bg-white rounded-3xl border border-slate-200">
            Loading question bank...
          </div>
        ) : questions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Questions Added Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add individual MCQ questions manually or import hundreds in seconds via CSV file.
            </p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-soft hover:border-slate-300 transition-all space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-xl bg-brand-50 text-brand-700 font-black text-xs flex items-center justify-center border border-brand-200 shrink-0">
                    Q{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 leading-snug">
                      {q.question}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(q)}
                    className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
                    title="Edit Question"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium pt-2">
                {[
                  { key: 'A', text: q.optionA },
                  { key: 'B', text: q.optionB },
                  { key: 'C', text: q.optionC },
                  { key: 'D', text: q.optionD },
                ].map((opt) => {
                  const isCorrect = q.correctAnswer === opt.key;
                  return (
                    <div
                      key={opt.key}
                      className={`p-3 rounded-2xl border flex items-start gap-2.5 transition-all ${
                        isCorrect
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span className="pt-0.5">{opt.text}</span>
                      {isCorrect && (
                        <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 font-medium">
                  <strong>Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Question Add / Edit Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">
                {editingQuestion ? 'Edit MCQ Question' : 'Add New MCQ Question'}
              </h3>
              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  required
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  placeholder="Enter the MCQ question problem statement..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Option A *
                  </label>
                  <input
                    type="text"
                    required
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Option B *
                  </label>
                  <input
                    type="text"
                    required
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Option C *
                  </label>
                  <input
                    type="text"
                    required
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Option D *
                  </label>
                  <input
                    type="text"
                    required
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Correct Option *
                </label>
                <select
                  value={correct}
                  onChange={(e) => setCorrect(e.target.value as QuestionOptionKey)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs bg-white font-bold text-brand-700"
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  <option value="C">Option C</option>
                  <option value="D">Option D</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Detailed solution or hint shown in results..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 outline-none text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Bulk Importer */}
      <CSVQuestionImporter
        isOpen={isCSVModalOpen}
        onClose={() => setIsCSVModalOpen(false)}
        onImport={handleCSVImport}
      />

      {/* Edit Test Settings Modal */}
      <TestModal
        isOpen={isEditTestModalOpen}
        onClose={() => setIsEditTestModalOpen(false)}
        onSave={handleEditTestSave}
        initialData={test}
      />
    </div>
  );
}
