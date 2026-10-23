/**
 * Firestore Security Rules Test Suite (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'create' | 'update' | 'get' | 'list' | 'delete';
  path: string;
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED' | 'ALLOWED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on Session Create',
    operation: 'create',
    path: '/sessions/sess_1',
    auth: { uid: 'attacker_1', email_verified: true },
    payload: { id: 'sess_1', ownerId: 'victim_1', name: 'Chat', isPinned: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified Email Write',
    operation: 'create',
    path: '/users/user_1',
    auth: { uid: 'user_1', email_verified: false },
    payload: { uid: 'user_1', displayName: 'Test User' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Shadow Field Injection on Memory Create',
    operation: 'create',
    path: '/memories/mem_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { ownerId: 'user_1', key: 'Topic', value: 'TP53', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Orphaned Message Write to Non-Existent Session',
    operation: 'create',
    path: '/sessions/ghost_session/messages/msg_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { sessionId: 'ghost_session', ownerId: 'user_1', role: 'user', content: 'Hello' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-Tenant Subcollection Message Write',
    operation: 'create',
    path: '/sessions/victim_session/messages/msg_1',
    auth: { uid: 'attacker_1', email_verified: true },
    payload: { sessionId: 'victim_session', ownerId: 'attacker_1', role: 'user', content: 'Injected' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Immutable ownerId Mutation on Session Update',
    operation: 'update',
    path: '/sessions/sess_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { id: 'sess_1', ownerId: 'attacker_1', name: 'Renamed', isPinned: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Immutable createdAt Mutation on Session Update',
    operation: 'update',
    path: '/sessions/sess_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { id: 'sess_1', ownerId: 'user_1', name: 'Renamed', isPinned: false, createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Forged Client Timestamp on BioscienceRecord Create',
    operation: 'create',
    path: '/bioscienceRecords/rec_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: {
      ownerId: 'user_1',
      category: 'protein',
      identifier: 'P04637',
      title: 'TP53',
      summary: 'Tumor suppressor p53',
      createdAt: '2000-01-01T00:00:00Z',
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Denial-of-Wallet Oversized String on Session Name',
    operation: 'create',
    path: '/sessions/sess_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { id: 'sess_1', ownerId: 'user_1', name: 'X'.repeat(500), isPinned: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'ID Poisoning Attack with Invalid Characters',
    operation: 'create',
    path: '/sessions/invalid$id!@#',
    auth: { uid: 'user_1', email_verified: true },
    payload: { id: 'invalid$id!@#', ownerId: 'user_1', name: 'Valid Name', isPinned: false },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Unauthorized Cross-User List Query on Memories',
    operation: 'list',
    path: '/memories',
    auth: { uid: 'attacker_1', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Value Poisoning on Session Update (Boolean Replaced by String)',
    operation: 'update',
    path: '/sessions/sess_1',
    auth: { uid: 'user_1', email_verified: true },
    payload: { id: 'sess_1', ownerId: 'user_1', name: 'Valid', isPinned: 'yes_string' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
