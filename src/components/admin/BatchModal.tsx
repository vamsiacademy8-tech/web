'use client';

import React, { useState, useEffect } from 'react';
import { Batch, StudentProfile } from '@/types';
import { X, BookOpen, Save, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (batchData: Partial<Batch>) => Promise<void>;
  initialData?: Batch | null;
  students: StudentProfile[];
}

export const BatchModal: React.FC<BatchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  students,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setSelectedStudentIds(initialData.studentIds || []);
    } else {
      setName('');
      setDescription('');
      setSelectedStudentIds([]);
    }
    setSearchQuery('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const filteredStudents = students.filter(
    (s) =>
      (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentIdCode || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        name,
        description,
        studentIds: selectedStudentIds,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save batch:', err);
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
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">
              {initialData ? 'Edit Batch' : 'Create New Batch'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Batch Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Class 10 Science Batch A"
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
              placeholder="Optional description..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-sm transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              Select Students ({selectedStudentIds.length} Selected)
            </label>
            
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students to add..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 focus:border-brand-500 outline-none text-sm transition-all"
              />
            </div>

            <div className="h-64 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1 bg-slate-50">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-xs font-medium text-slate-400">
                  No students found.
                </div>
              ) : (
                filteredStudents.map((s) => {
                  const isSelected = selectedStudentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border",
                        isSelected 
                          ? "bg-brand-50 border-brand-200" 
                          : "bg-white border-transparent hover:border-slate-300 hover:shadow-sm"
                      )}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-900">{s.name}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">{s.studentIdCode || s.email}</div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                        isSelected ? "bg-brand-600 border-brand-600 text-white" : "border-slate-300 text-transparent"
                      )}>
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
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
              {loading ? 'Saving...' : 'Save Batch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
