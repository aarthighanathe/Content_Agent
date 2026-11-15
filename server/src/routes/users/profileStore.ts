// WHY: thin re-export — canonical implementation lives in lib/profileStore.ts
// so workers (feedMonitorWorker) and user routes share cache-aside helpers
// without workers importing routes/users.
export {
  userProfiles,
  getUserProfile,
  saveUserProfile,
  seedUserProfilesFromDB,
  invalidateUserProfileCache,
  type UserProfile,
} from '../../lib/profileStore.js';
