# Security Specification: Yemen Vanguard Tactical Firestore

## 1. Data Invariants
- A user can only access and modify their own `userProfile` (identified by their UID).
- `leaderboardEntry` documents are publicly readable but can only be created by the user whose `userId` matches the document's content.
- `totalScore` and `score` must be non-negative integers.
- `updatedAt` and `timestamp` must be validated against `request.time`.
- `userId` field in data must always match `request.auth.uid`.

## 2. The "Dirty Dozen" Payloads (Attacks)
1. **Identity Spoofing**: User A tries to overwrite User B's profile.
2. **Ghost Field Injection**: Adding an `isAdmin: true` field to the user profile.
3. **Negative Score**: Setting a score of `-1000`.
4. **Future Timestamp**: Setting `updatedAt` to a time in the future to bypass decay or order logic.
5. **Score Bloating**: Setting a score that is not an integer or is impossibly high (resource exhaustion).
6. **Theater Poisoning**: Adding a non-existent theater ID to `unlockedTheaters` with a 1MB string.
7. **Leaderboard Spam**: User A tries to delete User B's leaderboard entry.
8. **Orphaned Save**: Creating a save without a valid `userId`.
9. **PII Leak**: Storing raw emails in the `displayName` field.
10. **Array Explosion**: Adding 10,000 items to the `unlockedTheaters` array.
11. **Path variable injection**: Using a path like `/users/../../system_config` as a userId.
12. **Unauthorized List Query**: Trying to list all `users` profiles (should be denied).

## 3. Test Runner (Draft)
```ts
// firestore.rules.test.ts (logic summary)
// - test('User A cannot write to User B profile')
// - test('User cannot write with negative score')
// - test('User cannot inject unknown fields via hasOnly()')
// - test('Public can read leaderboard but not write arbitrary entries')
```
