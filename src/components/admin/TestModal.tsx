'use client';

import React, { useState, useEffect } from 'react';
import { Test } from '@/types';
import { generateShareCode } from '@/lib/utils';
import { X, FilePlus2, Save, Link as LinkIcon } from 'lucide-react';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (testData: Partial<Test>) => Promise<void>;
  initialData?: Test | null;
}

export const TestModal: React.FC<TestModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [marksPerQuestion, setMarksPerQuestion] = useState(1);
  const [passingMarks, setPassingMarks] = useState(40);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [allowBackNav, setAllowBackNav] = useState(true);
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [instructions, setInstructions] = useState(
    '1. Ensure you have a stable internet connection.\n2. Do not switch tabs or minimize the browser window during the test.\n3. Anti-cheating monitors tab switches and visibility loss.\n4. Click Submit when completed.'
  );
  const [shareCode, setShareCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setDurationMinutes(initialData.durationMinutes || 60);
      setStartDateTime(
        initialData.startDateTime
          ? new Date(initialData.startDateTime).toISOString().slice(0, 16)
          : ''
      );
      setEndDateTime(
        initialData.endDateTime
          ? new Date(initialData.endDateTime).toISOString().slice(0, 16)
          : ''
      );
      setMarksPerQuestion(initialData.marksPerQuestion || 1);
      setPassingMarks(initialData.passingMarks || 40);
      setRandomizeQuestions(initialData.randomizeQuestions ?? false);
      setRandomizeOptions(initialData.randomizeOptions ?? false);
      setAllowBackNav(initialData.allowBackNav ?? true);
      setShowResultImmediately(initialData.showResultImmediately ?? true);
      setInstructions(initialData.instructions || '');
      setShareCode(initialData.shareCode || generateShareCode());
    } else {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setName('');
      setDescription('');
      setDurationMinutes(60);
      setStartDateTime(now.toISOString().slice(0, 16));
      setEndDateTime(nextWeek.toISOString().slice(0, 16));
      setMarksPerQuestion(1);
      setPassingMarks(40);
      setRandomizeQuestions(false);
      setRandomizeOptions(false);
      setAllowBackNav(true);
      setShowResultImmediately(true);
      setShareCode(generateShareCode());
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        name,
        description,
        durationMinutes: Number(durationMinutes),
        startDateTime: new Date(startDateTime).toISOString(),
        endDateTime: new Date(endDateTime).toISOString(),
        marksPerQuestion: Number(marksPerQuestion),
        maxMarks: Number(marksPerQuestion) * (initialData?.questionCount || 0),
        passingMarks: Number(passingMarks),
        randomizeQuestions: true,
        randomizeOptions: false,
        allowBackNav: false,
        showResultImmediately: true,
        negativeMarking: 0,
        instructions,
        shareCode: shareCode || generateShareCode(),
        isPublished: initialData?.isPublished ?? false,
        assignedStudentIds: initialData?.assignedStudentIds || 'all',
      });
      onClose();
    } catch (err) {
      console.error('Failed to save test:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 rounded-xl">
              <FilePlus2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {initialData ? 'Edit Examination Test' : 'Create New Test'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Test Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mathematics Final Mock Assessment 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive test covering Algebra, Calculus, and Trigonometry"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Duration (Mins) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                 Marks per Question
              </label>
              <input
                type="number"
                required
                min={1}
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1">
                <LinkIcon className="w-3.5 h-3.5 text-brand-600" /> Share Code
              </label>
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                placeholder="abc123xyz"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Start Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                End Date & Time *
              </label>
              <input
                type="datetime-local"
                required
                value={endDateTime}
                onChange={(e) => setEndDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm"
              />
            </div>
          </div>



          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Test Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 outline-none text-sm transition-all font-sans"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Test'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
