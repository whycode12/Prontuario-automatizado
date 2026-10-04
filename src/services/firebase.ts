import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import type { SavedPatientRecord, SystemTemplates, SystemPrompts } from '../types';
import { encryptData, decryptData } from './crypto';

// Configuracao fornecida pelo usuario
export const firebaseConfig = {
  apiKey: "AIzaSyANpSQZGQAeB5h19HIlkbu_fZ2ONinSRkQ",
  authDomain: "prontuario-automatizado.firebaseapp.com",
  projectId: "prontuario-automatizado",
  storageBucket: "prontuario-automatizado.firebasestorage.app",
  messagingSenderId: "248381832136",
  appId: "1:248381832136:web:bafeb92e851c84c6745efd"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Garante que o usuario esteja autenticado de forma transparente via Firebase Auth
export async function ensureAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });

    signInAnonymously(auth).catch((err) => {
      unsubscribe();
      reject(err);
    });
  });
}

// Salva ou atualiza um prontuario de paciente criptografado no Firestore
export async function saveRecordToCloud(
  record: SavedPatientRecord,
  encryptionKey: string
): Promise<void> {
  await ensureAuth();
  const jsonString = JSON.stringify(record);
  const encryptedPayload = await encryptData(jsonString, encryptionKey);

  const docRef = doc(db, 'records', record.id);
  await setDoc(
    docRef,
    {
      id: record.id,
      encryptedPayload,
      updatedAt: serverTimestamp(),
      savedAt: record.savedAt,
      // Marcador de integridade
      isEncrypted: Boolean(encryptionKey)
    },
    { merge: true }
  );
}

// Carrega todos os prontuarios da nuvem e descriptografa usando a chave
export async function fetchRecordsFromCloud(
  encryptionKey: string
): Promise<SavedPatientRecord[]> {
  await ensureAuth();
  const snapshot = await getDocs(collection(db, 'records'));
  const records: SavedPatientRecord[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.encryptedPayload) {
      try {
        const decryptedJson = await decryptData(data.encryptedPayload, encryptionKey);
        const parsed = JSON.parse(decryptedJson) as SavedPatientRecord;
        records.push(parsed);
      } catch (err) {
        console.warn(`Nao foi possivel descriptografar o registro ${docSnap.id}: chave incorreta`);
      }
    }
  }

  // Ordena por data decrescente
  records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return records;
}

// Remove um prontuario da nuvem
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  await ensureAuth();
  const docRef = doc(db, 'records', recordId);
  await deleteDoc(docRef);
}

// Salva configuracoes (templates e prompts) na nuvem
export async function saveConfigToCloud(
  templates: SystemTemplates,
  prompts: SystemPrompts,
  encryptionKey: string
): Promise<void> {
  await ensureAuth();
  const configPayload = JSON.stringify({ templates, prompts });
  const encryptedPayload = await encryptData(configPayload, encryptionKey);

  const docRef = doc(db, 'settings', 'user_config');
  await setDoc(docRef, {
    encryptedPayload,
    updatedAt: serverTimestamp()
  });
}

// Carrega configuracoes da nuvem
export async function fetchConfigFromCloud(
  encryptionKey: string
): Promise<{ templates?: SystemTemplates; prompts?: SystemPrompts } | null> {
  await ensureAuth();
  const snapshot = await getDocs(collection(db, 'settings'));
  const configDoc = snapshot.docs.find((d) => d.id === 'user_config');
  if (!configDoc) return null;

  const data = configDoc.data();
  if (data.encryptedPayload) {
    try {
      const decrypted = await decryptData(data.encryptedPayload, encryptionKey);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }
  return null;
}
