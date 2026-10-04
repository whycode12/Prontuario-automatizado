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
  getDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
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

// Ouve em tempo real as mudanças no Firestore e atualiza automaticamente em outros PCs
export function subscribeToCloudRecords(
  encryptionKey: string,
  onRecordsUpdated: (records: SavedPatientRecord[]) => void
): () => void {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[Sync] subscribeToCloudRecords: nenhum médico autenticado no momento.');
    return () => {};
  }

  const recordsCol = collection(db, 'users', user.uid, 'records');
  console.log('[Sync] Conectando ouvinte em tempo real para usuário:', user.uid);

  return onSnapshot(
    recordsCol,
    async (snapshot) => {
      console.log(`[Sync] Recebida atualização do Firestore: ${snapshot.docs.length} documentos`);
      const decryptPromises = snapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.encryptedPayload) {
          try {
            const decryptedJson = await decryptData(data.encryptedPayload, encryptionKey);
            return JSON.parse(decryptedJson) as SavedPatientRecord;
          } catch (err) {
            console.warn(`[Sync] Não foi possível decifrar registro ${docSnap.id}:`, err);
            return null;
          }
        }
        return null;
      });

      const results = await Promise.all(decryptPromises);
      const records = results.filter((r): r is SavedPatientRecord => r !== null);
      records.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      console.log(`[Sync] Disparando atualização local com ${records.length} pacientes`);
      onRecordsUpdated(records);
    },
    (error) => {
      console.error('[Sync] Erro na escuta em tempo real do Firestore:', error);
    }
  );
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

// Ouve em tempo real as alteracoes nos templates e prompts deste medico
export function subscribeToCloudConfig(
  encryptionKey: string,
  onConfigUpdated: (config: { templates?: SystemTemplates; prompts?: SystemPrompts }) => void
): () => void {
  const user = auth.currentUser;
  if (!user) return () => {};

  const configDocRef = doc(db, 'users', user.uid, 'settings', 'config');
  return onSnapshot(
    configDocRef,
    async (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (data?.encryptedPayload) {
        try {
          const decrypted = await decryptData(data.encryptedPayload, encryptionKey);
          const parsed = JSON.parse(decrypted);
          onConfigUpdated(parsed);
        } catch (err) {
          console.warn('[Sync] Não foi possível decifrar configurações da nuvem:', err);
        }
      }
    },
    (error) => {
      console.error('[Sync] Erro na escuta de configurações:', error);
    }
  );
}

// Salva a chave de API individual deste usuário na nuvem (Firebase)
export async function saveUserApiKey(apiKey: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Nenhum médico autenticado.');

  const docRef = doc(db, 'users', user.uid, 'settings', 'apiKey');
  await setDoc(
    docRef,
    {
      apiKey: apiKey.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: user.email || user.uid
    },
    { merge: true }
  );
}

// Carrega a chave de API salva deste médico na nuvem
export async function fetchUserApiKey(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const docRef = doc(db, 'users', user.uid, 'settings', 'apiKey');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return typeof data.apiKey === 'string' ? data.apiKey : null;
  } catch (err) {
    console.warn('[Sync] Erro ao carregar apiKey do usuário:', err);
    return null;
  }
}

// Ouve atualizações em tempo real da chave de API do médico conectado
export function subscribeToUserApiKey(onApiKeyUpdated: (key: string) => void): () => void {
  const user = auth.currentUser;
  if (!user) return () => {};

  const docRef = doc(db, 'users', user.uid, 'settings', 'apiKey');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (data && typeof data.apiKey === 'string') {
        onApiKeyUpdated(data.apiKey);
      }
    },
    (err) => {
      console.warn('[Sync] Erro na escuta em tempo real da chave de API:', err);
    }
  );
}

// Helper para limpar campos undefined antes de enviar ao Firestore (o Firestore não aceita valores undefined)
function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(removeUndefinedFields) as unknown as T;
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Salva configuracoes como PADRÃO GLOBAL do sistema (para todos os usuarios do app)
// Path: system/default_config
export async function saveGlobalDefaultConfig(
  templates: SystemTemplates,
  prompts: SystemPrompts
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('É necessário estar autenticado para definir o padrão global.');

  const docRef = doc(db, 'system', 'default_config');
  const payload = removeUndefinedFields({
    templates,
    prompts,
    updatedAt: serverTimestamp(),
    updatedBy: user.email || user.uid
  });

  await setDoc(docRef, payload, { merge: true });
}

// Carrega configuracoes do PADRÃO GLOBAL do sistema
export async function fetchGlobalDefaultConfig(): Promise<{
  templates?: SystemTemplates;
  prompts?: SystemPrompts;
} | null> {
  try {
    const docRef = doc(db, 'system', 'default_config');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    const data = docSnap.data();
    return {
      templates: data.templates,
      prompts: data.prompts
    };
  } catch (err) {
    console.warn('[Sync] Não foi possível carregar padrão global:', err);
    return null;
  }
}

// Ouve em tempo real alteracoes no PADRAO GLOBAL
export function subscribeToGlobalDefaultConfig(
  onConfigUpdated: (config: { templates?: SystemTemplates; prompts?: SystemPrompts }) => void
): () => void {
  const docRef = doc(db, 'system', 'default_config');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();
      if (data) {
        onConfigUpdated({
          templates: data.templates,
          prompts: data.prompts
        });
      }
    },
    (error) => {
      console.warn('[Sync] Escuta de padrão global inativa ou com erro:', error);
    }
  );
}
