'use client';

import React, { useState } from 'react';
import { Question } from '@/types';
import { parseCSVQuestions } from '@/lib/csvHelper';
import { Upload, X, Check, FileSpreadsheet, AlertCircle } from 'lucide-react';

interface CSVQuestionImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questions: Omit<Question, 'id'>[]) => Promise<void>;
}

export const CSVQuestionImporter: React.FC<CSVQuestionImporterProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<Omit<Question, 'id'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError('');
    try {
      const questions = await parseCSVQuestions(selected);
      if (!questions.length) {
        setError('No valid question rows found in CSV file.');
        setParsedQuestions([]);
      } else {
        setParsedQuestions(questions);
      }
    } catch (err: any) {
      setError(err?.message || 'Error parsing CSV file format.');
      setParsedQuestions([]);
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedQuestions.length) return;
    setLoading(true);
    setError('');
    try {
      await onImport(parsedQuestions);
      setParsedQuestions([]);
      setFile(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload questions.');
    } finally {
      setLoading(false);
    }
  };

  const sampleCSVFormat = `Question,Option A,Option B,Option C,Option D,Correct Answer,Marks,Explanation
What is 2 + 2?,3,4,5,6,B,1,Basic addition
What is the capital of India?,Mumbai,Chennai,New Delhi,Kolkata,C,1,New Delhi is the capital`;

  const downloadSampleCSV = () => {
    const blob = new Blob([sampleCSVFormat], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'vamsi_academy_sample_questions.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Bulk Import MCQ Questions via CSV</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-xs text-slate-600 font-medium">
              Need a template? Download our formatted sample CSV file:
            </span>
            <button
              onClick={downloadSampleCSV}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Download Sample CSV
            </button>
          </div>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors cursor-pointer bg-slate-50/50">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-upload"
            />
            <label htmlFor="csv-file-upload" className="cursor-pointer block">
              <Upload className="w-8 h-8 text-brand-500 mx-auto mb-2" />
              <span className="text-sm font-bold text-slate-800 block">
                {file ? file.name : 'Click or Drag CSV file here'}
              </span>
              <span className="text-xs text-slate-400 block mt-1">
                CSV header format: Question, Option A, Option B, Option C, Option D, Correct Answer, Marks, Explanation
              </span>
            </label>
          </div>

          {parsedQuestions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Preview parsed questions ({parsedQuestions.length})
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl text-xs">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 font-bold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Question</th>
                      <th className="p-2">Correct</th>
                      <th className="p-2">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedQuestions.map((q, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-2 font-mono">{idx + 1}</td>
                        <td className="p-2 font-medium truncate max-w-xs">{q.question}</td>
                        <td className="p-2 font-bold text-emerald-600">Option {q.correctAnswer}</td>
                        <td className="p-2">{q.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={loading || !parsedQuestions.length}
            className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {loading ? 'Importing...' : `Import ${parsedQuestions.length} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
};
