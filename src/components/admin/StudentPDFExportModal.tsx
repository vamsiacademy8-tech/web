import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, X } from 'lucide-react';
import { StudentProfile } from '@/types';

interface StudentPDFExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProfile[];
}

export const StudentPDFExportModal: React.FC<StudentPDFExportModalProps> = ({
  isOpen,
  onClose,
  students,
}) => {
  const [fields, setFields] = useState({
    id: true,
    name: true,
    phone: true,
    status: true,
  });

  if (!isOpen) return null;

  const handleDownload = () => {
    const doc = new jsPDF();

    const tableCols = [];
    if (fields.id) tableCols.push('Student ID');
    if (fields.name) tableCols.push('Name');
    if (fields.phone) tableCols.push('Phone Number');
    if (fields.status) tableCols.push('Status');

    const tableRows = students.map((s) => {
      const row = [];
      if (fields.id) row.push(s.studentIdCode || s.id);
      if (fields.name) row.push(s.name);
      if (fields.phone) row.push(s.phone);
      if (fields.status) row.push(s.isActive ? 'Active' : 'Inactive');
      return row;
    });

    doc.setFontSize(16);
    doc.text('Vamsi Academy - Student Roster', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Total Students: ${students.length}`, 14, 22);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);

    autoTable(doc, {
      startY: 35,
      head: [tableCols],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }, // brand-600 color
      styles: { fontSize: 9 },
    });

    doc.save(`vamsi_students_${Date.now()}.pdf`);
    onClose();
  };

  const toggleField = (field: keyof typeof fields) => {
    setFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const isDownloadEnabled = Object.values(fields).some(v => v);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <h3 className="font-extrabold text-slate-900 flex items-center gap-2">
            <Download className="w-5 h-5 text-brand-600" />
            Export Students PDF
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500 mb-4 font-medium">
            Select the fields you want to include in the PDF export:
          </p>
          <div className="space-y-3">
            {[
              { id: 'id', label: 'Student ID' },
              { id: 'name', label: 'Student Name' },
              { id: 'phone', label: 'Mobile Number' },
              { id: 'status', label: 'Account Status' },
            ].map((f) => (
              <label
                key={f.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  fields[f.id as keyof typeof fields]
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                    fields[f.id as keyof typeof fields]
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white border-slate-300'
                  }`}
                >
                  {fields[f.id as keyof typeof fields] && (
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm font-bold ${
                    fields[f.id as keyof typeof fields] ? 'text-brand-900' : 'text-slate-700'
                  }`}
                >
                  {f.label}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={handleDownload}
              disabled={!isDownloadEnabled}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
