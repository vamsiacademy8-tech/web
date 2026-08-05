'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { StudentProfile, StudentStatus } from '@/types';
import { StudentModal } from '@/components/admin/StudentModal';
import { StudentPDFExportModal } from '@/components/admin/StudentPDFExportModal';
import {
  Users,
  UserPlus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Phone,
  Mail,
  ShieldAlert,
  Download,
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const list: StudentProfile[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as StudentProfile);
      });
      setStudents(list);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSaveStudent = async (data: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    phone?: string;
    studentIdCode: string;
    status: StudentStatus;
  }) => {
    try {
      const studentId = data.id || `stu_${Date.now()}`;
      const docRef = doc(db, 'students', studentId);

      const payload: Partial<StudentProfile> = {
        id: studentId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || '',
        studentIdCode: data.studentIdCode,
        status: data.status,
        createdAt: new Date().toISOString(),
      };

      await setDoc(docRef, payload, { merge: true });
      await fetchStudents();
    } catch (err) {
      console.error('Failed to save student:', err);
      throw err;
    }
  };

  const handleToggleStatus = async (student: StudentProfile) => {
    const newStatus: StudentStatus = student.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'students', student.id), { status: newStatus });
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student profile?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  const handlePurgeDuplicates = async () => {
    if (!confirm('Clean up all auto-created duplicate student records from the database?')) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'students'));
      const deletePromises: Promise<void>[] = [];

      snap.forEach((d) => {
        const data = d.data() as StudentProfile;
        const sName = data.name || '';
        const sCode = data.studentIdCode || '';
        const sPhone = data.phone || '';

        // Identify auto-generated dummy profiles (starts with s_, STU-XXXXXX, or missing phone)
        if (
          sName.startsWith('s_') ||
          sName === 'flyggoagency' ||
          (sCode.startsWith('STU-') && (!sPhone || sPhone === 'N/A'))
        ) {
          deletePromises.push(deleteDoc(doc(db, 'students', d.id)));
        }
      });

      await Promise.all(deletePromises);
      await fetchStudents();
      alert(`Cleaned up ${deletePromises.length} duplicate record(s) successfully!`);
    } catch (err) {
      console.error('Failed to purge duplicates:', err);
      alert('Failed to purge duplicate records.');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.studentIdCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNextStudentIdCode = (): string => {
    let maxNum = 99;
    students.forEach((s) => {
      if (s.studentIdCode) {
        const matches = s.studentIdCode.match(/\d+/);
        if (matches) {
          const num = parseInt(matches[0], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    return String(maxNum + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-brand-600" />
            Student Roster Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Create student profiles, assign IDs, toggle exam access status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePurgeDuplicates}
            title="Clean Up Auto-Created Duplicate Records"
            className="py-2.5 px-3.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Purge Duplicates
          </button>

          <button
            onClick={() => setIsPDFModalOpen(true)}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl shadow-sm border border-slate-200 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <button
            onClick={() => {
              setSelectedStudent(null);
              setIsModalOpen(true);
            }}
            className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Add New Student
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Name, Email, or Student ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-xs font-medium transition-all"
        />
      </div>

      {/* Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-medium">
            Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 font-medium">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Mobile Number (Password)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600">
                      {student.studentIdCode || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {student.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-brand-500" />
                        <span>{student.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                          student.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {student.status === 'active' ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-500" /> Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsModalOpen(true);
                          }}
                          title="Edit Student"
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          title="Delete Student"
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
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

      <StudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStudent}
        initialData={selectedStudent}
        defaultStudentIdCode={getNextStudentIdCode()}
      />

      <StudentPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        students={filteredStudents}
      />
    </div>
  );
}
