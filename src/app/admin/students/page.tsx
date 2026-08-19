'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
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
      // Check for duplicate student ID
      const q = query(
        collection(db, 'students'),
        where('studentIdCode', '==', data.studentIdCode)
      );
      const qSnap = await getDocs(q);
      const duplicate = qSnap.docs.find(d => d.id !== data.id);
      
      if (duplicate) {
        throw new Error(`A student with ID "${data.studentIdCode}" already exists.`);
      }

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
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5 font-jakarta">
            <Users className="w-6 h-6 text-brand-400" />
            Student Roster Management
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-1.5">
            Create student profiles, assign IDs, toggle exam access status.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handlePurgeDuplicates}
            title="Clean Up Auto-Created Duplicate Records"
            className="py-2.5 px-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm rounded-xl border border-red-500/20 transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Purge Duplicates
          </button>

          <button
            onClick={() => setIsPDFModalOpen(true)}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <button
            onClick={() => {
              setSelectedStudent(null);
              setIsModalOpen(true);
            }}
            className="py-2.5 px-4 brand-gradient brand-gradient-hover text-sm font-bold rounded-xl flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Add New Student
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by Name, Email, or Student ID..."
          className="w-full pl-12 pr-4 py-3 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none text-sm font-medium transition-all text-white placeholder-slate-500"
        />
      </div>

      {/* Roster Table */}
      <div className="dark-panel rounded-3xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium flex items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            Loading student records...
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-400 font-medium">
            No students found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider font-jakarta">
                  <th className="py-4 px-6">Student ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Mobile Number (Password)</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm font-medium">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-brand-400">
                      {student.studentIdCode || 'N/A'}
                    </td>
                    <td className="py-4 px-6 font-bold text-white">
                      {student.name}
                    </td>
                    <td className="py-4 px-6 text-slate-400 font-mono font-bold">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-brand-500" />
                        <span>{student.phone || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                          student.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {student.status === 'active' ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-slate-400" /> Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsModalOpen(true);
                          }}
                          title="Edit Student"
                          className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          title="Delete Student"
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
      />

      <StudentPDFExportModal
        isOpen={isPDFModalOpen}
        onClose={() => setIsPDFModalOpen(false)}
        students={filteredStudents}
      />
    </div>
  );
}
