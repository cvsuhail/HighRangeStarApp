"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getFirebaseApp } from "@/lib/firebase";
import {
  getAuth,
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
    const app = getFirebaseApp();
    if (!app) {
      setLoading(false);
      return;
    }
    const auth = getAuth(app);
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithEmail = async (email: string, password: string, remember: boolean) => {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized on client");
    const auth = getAuth(app);
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const sendPasswordReset = async (email: string) => {
    const app = getFirebaseApp();
    if (!app) throw new Error("Firebase not initialized on client");
    const auth = getAuth(app);
    const { sendPasswordResetEmail } = await import("firebase/auth");
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    const app = getFirebaseApp();
    if (!app) return;
    const auth = getAuth(app);
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


