import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { onAuthStateChanged, type FirebaseUser };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  await syncUserProfileToFirestore(result.user);
  return result.user;
}

export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

// Sanitize document IDs to match ^[a-zA-Z0-9_\-]+$ (1..128 chars)
export function sanitizeFirestoreId(rawId: string): string {
  const cleaned = String(rawId || 'doc')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : 'doc_default';
}

export function memoryDocId(uid: string, key: string): string {
  return sanitizeFirestoreId(`${uid}_mem_${key}`);
}

const docWriteLocks = new Map<string, Promise<unknown>>();

async function withDocWriteLock<T>(path: string, task: () => Promise<T>): Promise<T> {
  const previous = docWriteLocks.get(path) || Promise.resolve();
  const next = previous.catch(() => undefined).then(() => task());
  docWriteLocks.set(path, next);
  try {
    return await next;
  } finally {
    if (docWriteLocks.get(path) === next) {
      docWriteLocks.delete(path);
    }
  }
}

// 1. User Profile Sync (/users/{userId})
export async function syncUserProfileToFirestore(user: FirebaseUser): Promise<void> {
  if (!user?.uid) return;
  const path = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(userRef);
      const displayName = (user.displayName || user.email?.split('@')[0] || 'Researcher').slice(0, 120);
      const photoURL = user.photoURL ? user.photoURL.slice(0, 1024) : undefined;

      if (!snap.exists()) {
        const payload: Record<string, unknown> = {
          uid: user.uid,
          displayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (photoURL) payload.photoURL = photoURL;
        await setDoc(userRef, payload);
      } else {
        const updatePayload: Record<string, unknown> = {
          displayName,
          updatedAt: serverTimestamp(),
        };
        if (photoURL) updatePayload.photoURL = photoURL;
        await updateDoc(userRef, updatePayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  });
}

// 2. Chat Session Sync (/sessions/{sessionId})
export async function saveSessionToFirestore(session: {
  id: string;
  name: string;
  folderId?: string | null;
  isPinned?: boolean;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(`${user.uid}_${session.id}`);
  const path = `sessions/${docId}`;
  const sessionRef = doc(db, 'sessions', docId);

  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(sessionRef);
      const name = (session.name || 'New Chat').slice(0, 200);
      const isPinned = Boolean(session.isPinned);
      const folderId = session.folderId ? String(session.folderId).slice(0, 128) : undefined;

      if (!snap.exists()) {
        const payload: Record<string, unknown> = {
          id: docId,
          ownerId: user.uid,
          name,
          isPinned,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        if (folderId) payload.folderId = folderId;
        await setDoc(sessionRef, payload);
      } else {
        const updatePayload: Record<string, unknown> = {
          name,
          isPinned,
          folderId: folderId ? folderId : deleteField(),
          updatedAt: serverTimestamp(),
        };
        await updateDoc(sessionRef, updatePayload);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  });
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const docId = sanitizeFirestoreId(`${user.uid}_${sessionId}`);
  const path = `sessions/${docId}`;
  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(doc(db, 'sessions', docId));
      if (snap.exists()) {
        await deleteDoc(doc(db, 'sessions', docId));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  });
}

// 3. Chat Message Sync (/sessions/{sessionId}/messages/{messageId})
export async function saveMessageToFirestore(
  rawSessionId: string,
  message: { id?: string | number; role: 'user' | 'model'; content: string }
): Promise<void> {
  const user = auth.currentUser;
  if (!user || !message.content?.trim()) return;
  const sessionDocId = sanitizeFirestoreId(`${user.uid}_${rawSessionId}`);
  const msgDocId = sanitizeFirestoreId(String(message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`));
  const path = `sessions/${sessionDocId}/messages/${msgDocId}`;
  const msgRef = doc(db, 'sessions', sessionDocId, 'messages', msgDocId);

  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(msgRef);
      const content = message.content.slice(0, 99000);
      if (!snap.exists()) {
        await setDoc(msgRef, {
          sessionId: sessionDocId,
          ownerId: user.uid,
          role: message.role === 'user' ? 'user' : 'model',
          content,
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(msgRef, {
          content,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  });
}

// 4. User Memory Sync (/memories/{memoryId})
export async function saveMemoryToFirestore(memory: {
  id?: string | number;
  key: string;
  value: string;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !memory.key?.trim() || !memory.value?.trim()) return;
  const memDocId = memoryDocId(user.uid, memory.key);
  const path = `memories/${memDocId}`;
  const memRef = doc(db, 'memories', memDocId);

  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(memRef);
      const key = memory.key.trim().slice(0, 120);
      const value = memory.value.trim().slice(0, 2000);
      if (!snap.exists()) {
        await setDoc(memRef, {
          ownerId: user.uid,
          key,
          value,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(memRef, {
          key,
          value,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  });
}

export async function deleteMemoryFromFirestore(key: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const memDocId = memoryDocId(user.uid, key);
  const path = `memories/${memDocId}`;
  return withDocWriteLock(path, async () => {
    try {
      const snap = await getDoc(doc(db, 'memories', memDocId));
      if (snap.exists()) {
        await deleteDoc(doc(db, 'memories', memDocId));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  });
}

// 5. Bioscience Record Persistence (/bioscienceRecords/{recordId})
export interface SavedBioscienceRecord {
  id: string;
  ownerId: string;
  category: 'protein' | 'genomics' | 'chemistry' | 'literature';
  identifier: string;
  title: string;
  summary: string;
  sourceUrl?: string;
  createdAt?: unknown;
}

export async function saveBioscienceRecordToFirestore(record: {
  category: 'protein' | 'genomics' | 'chemistry' | 'literature';
  identifier: string;
  title: string;
  summary: string;
  sourceUrl?: string;
}): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const recordId = sanitizeFirestoreId(`${user.uid}_bio_${record.category}_${record.identifier}`);
  const path = `bioscienceRecords/${recordId}`;
  const recordRef = doc(db, 'bioscienceRecords', recordId);

  try {
    const snap = await getDoc(recordRef);
    const title = record.title.trim().slice(0, 300);
    const summary = record.summary.trim().slice(0, 19500);
    const sourceUrl = record.sourceUrl ? record.sourceUrl.trim().slice(0, 1024) : undefined;

    if (!snap.exists()) {
      const payload: Record<string, unknown> = {
        ownerId: user.uid,
        category: record.category,
        identifier: record.identifier.trim().slice(0, 120),
        title,
        summary,
        createdAt: serverTimestamp(),
      };
      if (sourceUrl) payload.sourceUrl = sourceUrl;
      await setDoc(recordRef, payload);
    } else {
      const updatePayload: Record<string, unknown> = {
        title,
        summary,
      };
      if (sourceUrl) updatePayload.sourceUrl = sourceUrl;
      await updateDoc(recordRef, updatePayload);
    }
    return recordId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteBioscienceRecordFromFirestore(recordId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = sanitizeFirestoreId(recordId);
  const path = `bioscienceRecords/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'bioscienceRecords', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeToBioscienceRecords(
  userId: string,
  onRecords: (records: SavedBioscienceRecord[]) => void
): () => void {
  const q = query(collection(db, 'bioscienceRecords'), where('ownerId', '==', userId));
  return onSnapshot(
    q,
    snapshot => {
      const items: SavedBioscienceRecord[] = snapshot.docs.map(d => ({
        id: d.id,
        ...(d.data() as Omit<SavedBioscienceRecord, 'id'>),
      }));
      onRecords(items);
    },
    error => {
      console.error('Bioscience records snapshot error:', error);
      onRecords([]);
    }
  );
}

export async function fetchCloudMemoriesForUser(userId: string): Promise<Array<{ key: string; value: string }>> {
  const path = 'memories';
  try {
    const q = query(collection(db, 'memories'), where('ownerId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        key: String(data.key || ''),
        value: String(data.value || ''),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export interface BidirectionalSyncReport {
  hydratedSessions: number;
  hydratedMessages: number;
  hydratedMemories: number;
  pushedSessions: number;
  pushedMemories: number;
}

/**
 * Two-Way Cloud Sync Engine:
 * 1. Pulls all user-owned sessions, session messages, and memories from Firestore.
 * 2. Hydrates them atomically into local SQLite via /api/cloud-sync/hydrate.
 * 3. Pushes any local-only SQLite sessions and memories back to Firestore.
 */
export async function reconcileBidirectionalCloudSync(localUserId: string): Promise<BidirectionalSyncReport> {
  const user = auth.currentUser;
  if (!user || !localUserId) {
    return {
      hydratedSessions: 0,
      hydratedMessages: 0,
      hydratedMemories: 0,
      pushedSessions: 0,
      pushedMemories: 0,
    };
  }

  const uidPrefix = `${sanitizeFirestoreId(user.uid)}_`;
  const stripUidPrefix = (docId: string): string => {
    if (docId.startsWith(uidPrefix)) {
      return docId.slice(uidPrefix.length) || docId;
    }
    return docId;
  };

  // 1. Pull Cloud Sessions
  let cloudSessionDocs: Array<{
    docId: string;
    id: string;
    name: string;
    isPinned: boolean;
    folderId?: string;
  }> = [];

  try {
    const sessionsQuery = query(collection(db, 'sessions'), where('ownerId', '==', user.uid));
    const sessionsSnap = await getDocs(sessionsQuery);
    cloudSessionDocs = sessionsSnap.docs.map(d => {
      const data = d.data();
      return {
        docId: d.id,
        id: stripUidPrefix(String(data.id || d.id)),
        name: String(data.name || 'Cloud Chat'),
        isPinned: Boolean(data.isPinned),
        folderId: data.folderId ? String(data.folderId) : undefined,
      };
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'sessions');
  }

  // 2. Pull Cloud Messages for top 15 sessions in parallel
  const cloudMessages: Array<{ sessionId: string; role: 'user' | 'model'; content: string }> = [];
  const sessionsToFetchMsgs = cloudSessionDocs.slice(0, 15);
  const msgResults = await Promise.allSettled(
    sessionsToFetchMsgs.map(async s => {
      const msgsQuery = query(
        collection(db, 'sessions', s.docId, 'messages'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'asc')
      );
      const msgsSnap = await getDocs(msgsQuery);
      return msgsSnap.docs
        .map(md => {
          const mData = md.data();
          if (!mData.content) return null;
          return {
            sessionId: s.id,
            role: (mData.role === 'user' ? 'user' : 'model') as 'user' | 'model',
            content: String(mData.content),
          };
        })
        .filter((item): item is { sessionId: string; role: 'user' | 'model'; content: string } => item !== null);
    })
  );
  for (const res of msgResults) {
    if (res.status === 'fulfilled') {
      cloudMessages.push(...res.value);
    }
  }

  // 3. Pull Cloud Memories
  const cloudMemories = await fetchCloudMemoriesForUser(user.uid);

  // 4. Hydrate into Local SQLite
  const res = await fetch('/api/cloud-sync/hydrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: localUserId,
      cloudSessions: cloudSessionDocs,
      cloudMessages,
      cloudMemories,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to hydrate cloud data into local database');
  }

  const hydrationResult = await res.json().catch(() => ({} as any));

  // 5. Push Local-Only Sessions & Memories back to Firestore
  const cloudSessionIds = new Set(cloudSessionDocs.map(cs => cs.id));
  const cloudMemoryKeys = new Set(cloudMemories.map(cm => cm.key.toLowerCase().trim()));

  let pushedSessions = 0;
  let pushedMemories = 0;

  const localSessions: any[] = Array.isArray(hydrationResult.localSessions) ? hydrationResult.localSessions : [];
  for (const ls of localSessions.slice(0, 20)) {
    if (ls && ls.id && !cloudSessionIds.has(ls.id)) {
      await saveSessionToFirestore({
        id: ls.id,
        name: ls.name || 'Chat',
        folderId: ls.folder_id || undefined,
        isPinned: Boolean(ls.is_pinned),
      }).catch(() => {});
      pushedSessions++;
    }
  }

  const localMemories: any[] = Array.isArray(hydrationResult.localMemories) ? hydrationResult.localMemories : [];
  for (const lm of localMemories.slice(0, 30)) {
    if (lm && lm.key && lm.value && !cloudMemoryKeys.has(String(lm.key).toLowerCase().trim())) {
      await saveMemoryToFirestore({
        key: lm.key,
        value: lm.value,
      }).catch(() => {});
      pushedMemories++;
    }
  }

  return {
    hydratedSessions: Number(hydrationResult.hydratedSessions || 0),
    hydratedMessages: Number(hydrationResult.hydratedMessages || 0),
    hydratedMemories: Number(hydrationResult.hydratedMemories || 0),
    pushedSessions,
    pushedMemories,
  };
}
