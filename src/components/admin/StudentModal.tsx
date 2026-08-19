'use client';

import React, { useState, useEffect } from 'react';
import { StudentProfile, StudentStatus } from '@/types';
import { X, UserPlus, Save, AlertCircle } from 'lucide-react';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    phone?: string;
    studentIdCode: string;
    status: StudentStatus;
  }) => Promise<void>;
  initialData?: StudentProfile | null;
  defaultStudentIdCode?: string;
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultStudentIdCode = '',
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentIdCode, setStudentIdCode] = useState('');
  const [status, setStatus] = useState<StudentStatus>('active');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setStudentIdCode(initialData.studentIdCode || '');
      setStatus(initialData.status || 'active');
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setStudentIdCode(defaultStudentIdCode);
      setStatus('active');
    }
    setError('');
  }, [initialData, isOpen, defaultStudentIdCode]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !studentIdCode || !phone) {
      setError('Please fill in Full Name and Mobile Number.');
      return;
    }

    const formattedEmail = `${studentIdCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@student.vamsiacademy.com`;

    setLoading(true);
    setError('');
    try {
      await onSave({
        id: initialData?.id,
        name,
        email: formattedEmail,
        password: phone,
        phone,
        studentIdCode,
        status,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save student record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 animate-fadeIn">
      <div className="dark-panel rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-500/10 text-brand-400 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white font-jakarta">
              {initialData ? 'Edit Student Profile' : 'Add New Student'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all text-white placeholder-slate-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                Student ID *
              </label>
              <input
                type="text"
                required
                value={studentIdCode}
                onChange={(e) => setStudentIdCode(e.target.value)}
                placeholder="e.g. 101"
                className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm font-mono font-bold transition-all text-white placeholder-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
                Mobile / Pass *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all font-mono text-white placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 tracking-wider">
              Account Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StudentStatus)}
              className="w-full px-4 py-3 bg-slate-900/50 rounded-xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm transition-all font-medium text-white"
            >
              <option value="active">Active (Can take exams)</option>
              <option value="disabled">Disabled (Access Blocked)</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-800 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800/50 hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white brand-gradient brand-gradient-hover rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
