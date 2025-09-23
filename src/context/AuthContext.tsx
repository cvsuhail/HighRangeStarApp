"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string, remember: boolean) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithEmail = async (email: string, password: string, remember: boolean) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized on client");
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const sendPasswordReset = async (email: string) => {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase not initialized on client");
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signOut(auth);
  };

  const value = useMemo<AuthContextValue>(() => ({ user, loading, signInWithEmail, sendPasswordReset, logout }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


