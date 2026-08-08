'use client';

import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore/lite';
import { db } from '@/lib/firebase';
import { Batch, StudentProfile } from '@/types';
import { BatchModal } from '@/components/admin/BatchModal';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
} from 'lucide-react';

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesSnap, studentsSnap] = await Promise.all([
        getDocs(collection(db, 'batches')),
        getDocs(collection(db, 'students'))
      ]);

      const bList: Batch[] = [];
      batchesSnap.forEach((d) => {
        bList.push({ ...d.data(), id: d.id } as Batch);
      });
      
      const sList: StudentProfile[] = [];
      studentsSnap.forEach((d) => {
        const student = { ...d.data(), id: d.id } as StudentProfile;
        if (student.status !== 'disabled') {
          sList.push(student);
        }
      });

      setBatches(bList);
      setStudents(sList);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveBatch = async (data: Partial<Batch>) => {
    try {
      const batchId = data.id || `batch_${Date.now()}`;
      const docRef = doc(db, 'batches', batchId);

      const payload: Partial<Batch> = {
        id: batchId,
        name: data.name,
        description: data.description || '',
        studentIds: data.studentIds || [],
        createdAt: data.id ? data.createdAt : new Date().toISOString(),
      };

      // Also update the students' batchIds array
      // To be completely safe and avoid huge batches, we can just fetch and update.
      // But since we are updating student profiles, let's use writeBatch if we really want to keep student records in sync,
      // However, it's easier to just rely on the Batch's studentIds array to know who is in the batch,
      // and when evaluating test eligibility, we check if the student is in the batch.
      // Wait, we decided to check batch assignment by intersecting test.assignedBatchIds with student.batchIds?
      // Or we can just check if test.assignedBatchIds intersects with any batch that contains the student.
      // Yes, if we just check batches where student is present, we don't need to duplicate `batchIds` on `student`.
      // Let's store batchIds on students anyway for faster querying later if needed.
      
      const firestoreBatch = writeBatch(db);
      firestoreBatch.set(docRef, payload, { merge: true });

      // Find students that were added or removed
      const oldStudentIds = selectedBatch?.studentIds || [];
      const newStudentIds = data.studentIds || [];
      
      const addedIds = newStudentIds.filter(id => !oldStudentIds.includes(id));
      const removedIds = oldStudentIds.filter(id => !newStudentIds.includes(id));

      for (const sId of addedIds) {
        const student = students.find(s => s.id === sId);
        if (student) {
          const updatedBatchIds = [...(student.batchIds || []), batchId];
          firestoreBatch.update(doc(db, 'students', sId), { batchIds: updatedBatchIds });
        }
      }

      for (const sId of removedIds) {
        const student = students.find(s => s.id === sId);
        if (student) {
          const updatedBatchIds = (student.batchIds || []).filter(id => id !== batchId);
          firestoreBatch.update(doc(db, 'students', sId), { batchIds: updatedBatchIds });
        }
      }

      await firestoreBatch.commit();
      await fetchData();
    } catch (err) {
      console.error('Failed to save batch:', err);
      throw err;
    }
  };

  const handleDeleteBatch = async (batch: Batch) => {
    if (!confirm(`Are you sure you want to delete the batch "${batch.name}"?`)) return;
    try {
      const firestoreBatch = writeBatch(db);
      firestoreBatch.delete(doc(db, 'batches', batch.id));
      
      // Remove batchId from students
      batch.studentIds.forEach(sId => {
        const student = students.find(s => s.id === sId);
        if (student) {
          const updatedBatchIds = (student.batchIds || []).filter(id => id !== batch.id);
          firestoreBatch.update(doc(db, 'students', sId), { batchIds: updatedBatchIds });
        }
      });
      
      await firestoreBatch.commit();
      setBatches((prev) => prev.filter((b) => b.id !== batch.id));
    } catch (err) {
      console.error('Failed to delete batch:', err);
    }
  };

  const filteredBatches = batches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-brand-600" />
            Batch & Group Management
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Group students into batches to schedule exams specifically for them.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setSelectedBatch(null);
              setIsModalOpen(true);
            }}
            className="py-2.5 px-4 bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Batch
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
          placeholder="Search batches by name..."
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none text-xs font-medium transition-all"
        />
      </div>

      {/* Batches Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-xs text-slate-400 font-medium shadow-soft">
          Loading batches...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-soft">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Batches Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Create a batch to easily group and assign exams to multiple students at once.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map((batch) => (
            <div key={batch.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{batch.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{batch.description || 'No description'}</p>
                </div>
                <div className="flex gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedBatch(batch);
                      setIsModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBatch(batch)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200">
                  <Users className="w-3.5 h-3.5" />
                  {batch.studentIds?.length || 0} Students
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {new Date(batch.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <BatchModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveBatch}
          initialData={selectedBatch}
          students={students}
        />
      )}
    </div>
  );
}
