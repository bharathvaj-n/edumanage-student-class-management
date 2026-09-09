import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from './firebase-config';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Fetch Firestore user profile: users/{uid}
  const fetchUserProfile = useCallback(async (uid, email) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setUserProfile(snap.data());
      } else {
        // Fallback default profile if missing
        const fallback = {
          name: email ? email.split('@')[0] : 'Teacher',
          email: email || '',
          role: 'teacher',
          created_at: serverTimestamp()
        };
        await setDoc(userDocRef, fallback, { merge: true });
        setUserProfile(fallback);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setUserProfile({
        name: email ? email.split('@')[0] : 'Teacher',
        email: email || '',
        role: 'teacher'
      });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid, user.email);
      } else {
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return unsubscribe;
  }, [fetchUserProfile]);

  // Sign In
  const login = async (email, password) => {
    return await signInWithEmailAndPassword(auth, email, password);
  };

  // Sign Up & Create Profile in users/{uid}
  const signup = async (email, password, fullName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    const profile = {
      name: fullName.trim(),
      email: email.trim(),
      role: 'teacher',
      created_at: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.uid), profile);
    setUserProfile(profile);

    // Send email verification
    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('Could not send email verification automatically:', e);
    }

    return userCredential;
  };

  // Resend Email Verification
  const sendVerification = async () => {
    if (auth.currentUser) {
      return await sendEmailVerification(auth.currentUser);
    }
  };

  // Password Reset Email
  const resetPassword = async (email) => {
    return await sendPasswordResetEmail(auth, email);
  };

  // Sign Out
  const logout = async () => {
    setUserProfile(null);
    return await signOut(auth);
  };

  // Reload user object to refresh emailVerified status
  const reloadUser = async () => {
    if (auth.currentUser) {
      await reload(auth.currentUser);
      setCurrentUser({ ...auth.currentUser });
    }
  };

  const value = {
    currentUser,
    userProfile,
    loadingAuth,
    login,
    signup,
    logout,
    resetPassword,
    sendVerification,
    reloadUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
