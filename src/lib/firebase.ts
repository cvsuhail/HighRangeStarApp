// Firebase initialization (client-safe)
import { initializeApp, type FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, type Analytics, isSupported } from 'firebase/analytics';
import { getFirestore as fbGetFirestore, type Firestore } from 'firebase/firestore';

// NOTE: Consider moving these to environment variables in production.
const firebaseConfig = {
  apiKey: 'AIzaSyA7RwwQT7XD1Sc8pMfV5LDvuFxX6pPCFaI',
  authDomain: 'bid-app-9e1cc.firebaseapp.com',
  projectId: 'bid-app-9e1cc',
  storageBucket: 'bid-app-9e1cc.firebasestorage.app',
  messagingSenderId: '942174252213',
  appId: '1:942174252213:web:e590fa77c193645e5022fc',
  measurementId: 'G-V60VN8GW2Y',
};

let app: FirebaseApp | undefined;
let analytics: Analytics | undefined;
let firestore: Firestore | undefined;

export function getFirebaseApp(): FirebaseApp | undefined {
  if (typeof window === 'undefined') return undefined;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirestore(): Firestore | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const appInstance = getFirebaseApp();
    if (!appInstance) return undefined;
    if (!firestore) firestore = fbGetFirestore(appInstance);
    return firestore;
  } catch {
    return undefined;
  }
}

export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  if (typeof window === 'undefined') return undefined;
  try {
    // Guard for environments where analytics isn't supported (e.g., SSR, some browsers)
    const supported = await isSupported();
    if (!supported) return undefined;
    const appInstance = getFirebaseApp();
    if (!appInstance) return undefined;
    if (!analytics) analytics = getAnalytics(appInstance);
    return analytics;
  } catch {
    return undefined;
  }
}

export type { Analytics } from 'firebase/analytics';
export type { FirebaseApp } from 'firebase/app';
export type { Firestore } from 'firebase/firestore';


