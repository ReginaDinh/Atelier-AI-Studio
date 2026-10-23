# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: No read or write is permitted to any path unless explicitly matched and validated.
2. **Verified Identity**: All write operations require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document path variable (`userId`, `sessionId`, `messageId`, `memoryId`, `recordId`) must satisfy `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Master Gate Relational Sync**: Every message in `/sessions/{sessionId}/messages/{messageId}` can only be read or written if the parent `/sessions/{sessionId}` exists and `get(/databases/$(database)/documents/sessions/$(sessionId)).data.ownerId == request.auth.uid`.
5. **Anti-Update-Gap & Immutable Fields**: All `create` and `update` operations must pass the entity's `isValid[Entity](incoming())` blueprint helper. Immutable fields (`ownerId`, `uid`, `sessionId`, `createdAt`) cannot be modified on update.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation, and `updatedAt` must equal `request.time` on update.
7. **Secure List Queries**: Every `allow list` rule explicitly enforces `resource.data.ownerId == request.auth.uid` (without calling `get()` or `exists()` inside `list`).

## 2. The "Dirty Dozen" Payloads
1. **Payload 1 (Identity Spoofing on Session Create)**: `{ id: "sess-1", ownerId: "victim-uid", name: "Spoofed", isPinned: false, createdAt: request.time, updatedAt: request.time }` -> Must return `PERMISSION_DENIED`.
2. **Payload 2 (Unverified Email Write)**: Authenticated user with `email_verified: false` creating `/users/{uid}` -> Must return `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection on Memory Create)**: `{ ownerId: auth.uid, key: "Role", value: "Researcher", isAdmin: true, createdAt: request.time, updatedAt: request.time }` -> Must return `PERMISSION_DENIED`.
4. **Payload 4 (Orphaned Message Write)**: Creating `/sessions/non_existent_session/messages/msg1` where parent session does not exist -> Must return `PERMISSION_DENIED`.
5. **Payload 5 (Cross-Tenant Message Write)**: Creating `/sessions/other_user_session/messages/msg1` where parent session belongs to another user -> Must return `PERMISSION_DENIED`.
6. **Payload 6 (Immutable `ownerId` Mutation on Session Update)**: Updating `ownerId` from `auth.uid` to `attacker_uid` -> Must return `PERMISSION_DENIED`.
7. **Payload 7 (Immutable `createdAt` Mutation on Session Update)**: Modifying `createdAt` during an update -> Must return `PERMISSION_DENIED`.
8. **Payload 8 (Forged Client Timestamp on Create)**: Creating a `BioscienceRecord` with `createdAt` set to a past timestamp instead of `request.time` -> Must return `PERMISSION_DENIED`.
9. **Payload 9 (Denial-of-Wallet Oversized String)**: Creating a `ChatSession` with a 10,000-character `name` (exceeding `maxLength: 200`) -> Must return `PERMISSION_DENIED`.
10. **Payload 10 (ID Poisoning Attack)**: Creating a document with path ID containing spaces/slashes or >128 chars -> Must return `PERMISSION_DENIED`.
11. **Payload 11 (Unauthorized Blanket List Query)**: Listing `/memories` or `/bioscienceRecords` without `where('ownerId', '==', auth.uid)` -> Must return `PERMISSION_DENIED`.
12. **Payload 12 (Value Poisoning on Update)**: Updating `isPinned` on `/sessions/{sessionId}` with a string `"yes"` instead of a boolean -> Must return `PERMISSION_DENIED`.
