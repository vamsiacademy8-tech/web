'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { StudentProfile, AdminProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  profile: StudentProfile | AdminProfile | null;
  isAdmin: boolean;
  isStudent: boolean;
  loading: boolean;
  loginAdmin: (e: string, p: string) => Promise<void>;
  loginStudent: (e: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isAdmin: false,
  isStudent: false,
  loading: true,
  loginAdmin: async () => {},
  loginStudent: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

const isAuthorizedAdminEmail = (email: string) => {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return clean.includes('admin') || clean === 'flyggoagency@gmail.com' || clean.startsWith('flyggoagency');
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StudentProfile | AdminProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStudent, setIsStudent] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (currentUser: User) => {
    const userEmail = currentUser.email?.toLowerCase() || '';

    // If user is Admin based on email convention or explicit admin list
    if (isAuthorizedAdminEmail(userEmail)) {
      const adminData: AdminProfile = {
        id: currentUser.uid,
        name: currentUser.displayName || 'Vamsi Admin',
        email: currentUser.email || '',
        role: 'admin',
      };
      setProfile(adminData);
      setIsAdmin(true);
      setIsStudent(false);

      // Persist profile to Firestore asynchronously
      try {
        const adminRef = doc(db, 'admins', currentUser.uid);
        await setDoc(adminRef, adminData, { merge: true });
      } catch (e) {
        // Safe silent catch if Firestore is initializing
      }
      return;
    }

    // Student profile processing - search Firestore for pre-added record
    try {
      const snap = await getDocs(collection(db, 'students'));
      let foundStudent: StudentProfile | null = null;

      // Extract possible studentIdCode and phone from auth email (e.g. s_100_9965490227@...)
      const match = userEmail.match(/^s_([a-z0-9]+)_([0-9]+)@/i);
      const extractedId = match ? match[1] : '';
      const extractedPhone = match ? match[2] : '';

      snap.forEach((d) => {
        const data = d.data() as StudentProfile;
        const sId = (data.studentIdCode || '').trim().toLowerCase();
        const sPhone = (data.phone || '').replace(/[^0-9]/g, '');

        if (
          d.id === currentUser.uid ||
          data.id === currentUser.uid ||
          data.authUid === currentUser.uid ||
          (extractedId && sId === extractedId.toLowerCase()) ||
          (extractedPhone && sPhone === extractedPhone) ||
          (data.email && data.email.toLowerCase() === userEmail)
        ) {
          foundStudent = { id: d.id, ...data };
        }
      });

      if (foundStudent) {
        setProfile(foundStudent);
        setIsAdmin(false);
        setIsStudent(true);
        return;
      }

      setProfile(null);
      setIsAdmin(false);
      setIsStudent(false);
    } catch (err) {
      console.error('Error resolving student profile:', err);
      setProfile(null);
      setIsAdmin(false);
      setIsStudent(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      try {
        if (currentUser) {
          await loadUserProfile(currentUser);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setIsStudent(false);
        }
      } catch (err) {
        console.error('Error during auth listener resolution:', err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginAdmin = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const isEmailAdmin = isAuthorizedAdminEmail(cleanEmail);

      if (auth.currentUser) {
        await signOut(auth);
      }

      let res;
      try {
        res = await signInWithEmailAndPassword(auth, email, pass);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential'
        ) {
          if (!isEmailAdmin) {
            throw new Error('Invalid administrator credentials.');
          }
          res = await createUserWithEmailAndPassword(auth, email, pass);
        } else if (authErr.code === 'auth/operation-not-allowed') {
          throw new Error('Email/Password Sign-In is disabled in your Firebase Console. Go to Firebase Console -> Authentication -> Sign-in method and enable Email/Password.');
        } else {
          throw authErr;
        }
      }

      // Verify if authenticated user is actually an Admin
      const adminRef = doc(db, 'admins', res.user.uid);
      const adminSnap = await getDoc(adminRef);

      if (!isEmailAdmin && !adminSnap.exists()) {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        setIsStudent(false);
        throw new Error('Invalid administrator credentials. Access denied.');
      }

      await loadUserProfile(res.user);
    } catch (err: any) {
      console.error('Admin login error:', err);
      throw new Error(err?.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loginStudent = async (studentIdCodeInput: string, mobileInput: string) => {
    setLoading(true);
    try {
      const cleanStudentId = studentIdCodeInput.trim();
      const cleanMobile = mobileInput.trim().replace(/[^0-9]/g, '');

      if (!cleanStudentId || !cleanMobile) {
        throw new Error('Please enter both Student ID and Mobile Number.');
      }

      // 1. Fetch Student Records from Firestore to verify Admin Pre-Registration
      let preAddedStudent: (StudentProfile & { docId: string }) | null = null;
      try {
        const snap = await getDocs(collection(db, 'students'));
        snap.forEach((d) => {
          const data = d.data() as StudentProfile;
          const sId = (data.studentIdCode || '').trim();
          if (sId === cleanStudentId) {
            preAddedStudent = { docId: d.id, id: d.id, ...data };
          }
        });
      } catch (fsErr: any) {
        console.error('Firestore pre-check error:', fsErr);
      }

      if (!preAddedStudent) {
        throw new Error(
          `Student ID "${cleanStudentId}" is not registered. Only students pre-added by the administrator can log in.`
        );
      }

      // 2. Check if Student Account is active
      const studentData = preAddedStudent as (StudentProfile & { docId: string });
      if (studentData.status === 'disabled') {
        throw new Error('Your student account has been disabled by the administrator.');
      }

      // 3. Verify Mobile Number matches Admin pre-registered Phone
      const registeredPhone = (studentData.phone || '').replace(/[^0-9]/g, '');
      if (registeredPhone && registeredPhone !== cleanMobile) {
        throw new Error(`Incorrect Mobile Number for Student ID "${cleanStudentId}".`);
      }

      // 4. Authenticate via Firebase Auth using deterministic student email
      const authEmail = `s_${cleanStudentId.toLowerCase().replace(/[^a-z0-9]/g, '')}_${cleanMobile}@student.vamsiacademy.com`;
      const password = cleanMobile;

      let res;
      try {
        res = await signInWithEmailAndPassword(auth, authEmail, password);
      } catch (authErr: any) {
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/wrong-password'
        ) {
          try {
            res = await createUserWithEmailAndPassword(auth, authEmail, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              res = await signInWithEmailAndPassword(auth, authEmail, password);
            } else {
              throw createErr;
            }
          }
        } else {
          throw authErr;
        }
      }

      // Link pre-added student document to Firebase Auth UID so future lookups match directly
      if (res.user) {
        try {
          await setDoc(
            doc(db, 'students', studentData.docId),
            { id: res.user.uid, email: authEmail },
            { merge: true }
          );
        } catch (e) {
          // ignore doc update errors
        }
      }

      await loadUserProfile(res.user);
    } catch (err: any) {
      console.error('Student login validation error:', err);
      throw new Error(
        err?.message || 'Invalid Student ID or Mobile Number. Only registered students can log in.'
      );
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
    setIsStudent(false);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        isStudent,
        loading,
        loginAdmin,
        loginStudent,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
