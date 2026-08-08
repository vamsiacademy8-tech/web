'use client';

import React, { useState, useEffect } from 'react';
import { Test } from '@/types';
import { generateShareCode } from '@/lib/utils';
import { X, FilePlus2, Save, Link as LinkIcon, Users, BookOpen, Check } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import { Batch, StudentProfile } from '@/types';

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

  const [assignmentType, setAssignmentType] = useState<'all' | 'batches' | 'students'>('all');
  const [assignedBatchIds, setAssignedBatchIds] = useState<string[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchSelectableData = async () => {
      setDataLoading(true);
      try {
        const [bSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'batches')),
          getDocs(collection(db, 'students'))
        ]);
        const bList: Batch[] = [];
        bSnap.forEach(d => bList.push({ ...d.data(), id: d.id } as Batch));
        
        const sList: StudentProfile[] = [];
        sSnap.forEach(d => {
          const st = { ...d.data(), id: d.id } as StudentProfile;
          if (st.status !== 'disabled') sList.push(st);
        });

        setBatches(bList);
        setStudents(sList);
      } catch (err) {
        console.error('Error fetching batches/students:', err);
      } finally {
        setDataLoading(false);
      }
    };
    fetchSelectableData();
  }, [isOpen]);

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
      
      const sIds = initialData.assignedStudentIds;
      const bIds = initialData.assignedBatchIds || [];
      if (bIds.length > 0) {
        setAssignmentType('batches');
        setAssignedBatchIds(bIds);
        setAssignedStudentIds([]);
      } else if (Array.isArray(sIds) && sIds.length > 0) {
        setAssignmentType('students');
        setAssignedStudentIds(sIds);
        setAssignedBatchIds([]);
      } else {
        setAssignmentType('all');
        setAssignedBatchIds([]);
        setAssignedStudentIds([]);
      }
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
      setAssignmentType('all');
      setAssignedBatchIds([]);
      setAssignedStudentIds([]);
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
        assignedStudentIds: assignmentType === 'students' ? assignedStudentIds : 'all',
        assignedBatchIds: assignmentType === 'batches' ? assignedBatchIds : [],
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

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Assign Test To:
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAssignmentType('all')}
                className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all", assignmentType === 'all' ? "bg-brand-600 text-white border-brand-600" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200")}
              >
                All Students
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType('batches')}
                className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5", assignmentType === 'batches' ? "bg-brand-600 text-white border-brand-600" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200")}
              >
                <BookOpen className="w-3.5 h-3.5" /> Specific Batches
              </button>
              <button
                type="button"
                onClick={() => setAssignmentType('students')}
                className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5", assignmentType === 'students' ? "bg-brand-600 text-white border-brand-600" : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200")}
              >
                <Users className="w-3.5 h-3.5" /> Selective Students
              </button>
            </div>
          </div>

          {assignmentType === 'batches' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm transition-all bg-slate-50"
              />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                {dataLoading ? (
                  <div className="text-xs text-center text-slate-400 py-2">Loading...</div>
                ) : batches.length === 0 ? (
                  <div className="text-xs text-center text-slate-400 py-2">No batches created yet.</div>
                ) : (
                  batches
                    .filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((b) => {
                    const isSel = assignedBatchIds.includes(b.id);
                    return (
                      <div key={b.id} onClick={() => setAssignedBatchIds(prev => isSel ? prev.filter(x => x !== b.id) : [...prev, b.id])} className={cn("flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors", isSel ? "bg-brand-50 border-brand-200" : "bg-white border-slate-100 hover:border-slate-300")}>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{b.name}</div>
                          <div className="text-[10px] text-slate-500">{b.studentIds?.length || 0} students</div>
                        </div>
                        {isSel && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </div>
                    );
                  })
                )}
                {batches.length > 0 && batches.filter(b => (b.name || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="text-xs text-center text-slate-400 py-2">No matches found.</div>
                )}
              </div>
            </div>
          )}

          {assignmentType === 'students' && (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm transition-all bg-slate-50"
              />
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1">
                {dataLoading ? (
                  <div className="text-xs text-center text-slate-400 py-2">Loading...</div>
                ) : students.length === 0 ? (
                  <div className="text-xs text-center text-slate-400 py-2">No active students found.</div>
                ) : (
                  students
                    .filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.studentIdCode || '').toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((s) => {
                    const isSel = assignedStudentIds.includes(s.id);
                    return (
                      <div key={s.id} onClick={() => setAssignedStudentIds(prev => isSel ? prev.filter(x => x !== s.id) : [...prev, s.id])} className={cn("flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors", isSel ? "bg-brand-50 border-brand-200" : "bg-white border-slate-100 hover:border-slate-300")}>
                        <div>
                          <div className="font-bold text-xs text-slate-800">{s.name}</div>
                          <div className="text-[10px] text-slate-500">{s.studentIdCode || s.email}</div>
                        </div>
                        {isSel && <Check className="w-3.5 h-3.5 text-brand-600" />}
                      </div>
                    );
                  })
                )}
                {students.length > 0 && students.filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.studentIdCode || '').toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                  <div className="text-xs text-center text-slate-400 py-2">No matches found.</div>
                )}
              </div>
            </div>
          )}

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
