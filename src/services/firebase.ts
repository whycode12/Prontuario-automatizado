import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
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

// Converte login simples (CRM ou usuario) em formato aceito pelo Firebase Auth
export function normalizeUserEmail(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  // Se digitar apenas CRM ou nome de usuario (ex: thiago ou 123456sp), converte para login seguro
  return `${clean.replace(/[^a-z0-9]/g, '')}@prontuario.med.br`;
}

// Cria conta para novo medico
export async function registerDoctor(usernameOrEmail: string, password: string): Promise<User> {
  const email = normalizeUserEmail(usernameOrEmail);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Faz login do medico
export async function loginDoctor(usernameOrEmail: string, password: string): Promise<User> {
  const email = normalizeUserEmail(usernameOrEmail);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// Faz logout
export async function logoutDoctor(): Promise<void> {
  await signOut(auth);
}

// Retorna o UID do medico conectado
export function getCurrentUserId(): string | null {
  return auth.currentUser ? auth.currentUser.uid : null;
}

// Salva prontuario isolado no espaco deste medico especifico
// Path: users/{userId}/records/{recordId}
export async function saveRecordToCloud(
  record: SavedPatientRecord,
  encryptionKey: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const jsonString = JSON.stringify(record);
  const encryptedPayload = await encryptData(jsonString, encryptionKey);

  const docRef = doc(db, 'users', user.uid, 'records', record.id);
  await setDoc(
    docRef,
    {
      id: record.id,
      encryptedPayload,
      updatedAt: serverTimestamp(),
      savedAt: record.savedAt,
      isEncrypted: Boolean(encryptionKey)
    },
    { merge: true }
  );
}

// Carrega somente os pacientes do medico conectado
export async function fetchRecordsFromCloud(
  encryptionKey: string
): Promise<SavedPatientRecord[]> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const recordsCol = collection(db, 'users', user.uid, 'records');
  const snapshot = await getDocs(recordsCol);
  const records: SavedPatientRecord[] = [];

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.encryptedPayload) {
      try {
        const decryptedJson = await decryptData(data.encryptedPayload, encryptionKey);
        const parsed = JSON.parse(decryptedJson) as SavedPatientRecord;
        records.push(parsed);
      } catch (err) {
        console.warn(`Registro ${docSnap.id} não pôde ser decifrado`);
      }
    }
  }

  records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  return records;
}

// Remove prontuario do espaco deste medico
export async function deleteRecordFromCloud(recordId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const docRef = doc(db, 'users', user.uid, 'records', recordId);
  await deleteDoc(docRef);
}

// Salva configuracoes individuais deste medico
export async function saveConfigToCloud(
  templates: SystemTemplates,
  prompts: SystemPrompts,
  encryptionKey: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const configPayload = JSON.stringify({ templates, prompts });
  const encryptedPayload = await encryptData(configPayload, encryptionKey);

  const docRef = doc(db, 'users', user.uid, 'settings', 'config');
  await setDoc(docRef, {
    encryptedPayload,
    updatedAt: serverTimestamp()
  });
}

// Carrega configuracoes individuais deste medico
export async function fetchConfigFromCloud(
  encryptionKey: string
): Promise<{ templates?: SystemTemplates; prompts?: SystemPrompts } | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const snapshot = await getDocs(collection(db, 'users', user.uid, 'settings'));
  const configDoc = snapshot.docs.find((d) => d.id === 'config');
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
