/**
 * Versioned localStorage wrapper.
 * 
 * All localStorage reads/writes should go through this module.
 * When STORAGE_VERSION is bumped, legacy keys are auto-cleared on app boot.
 * 
 * EXCEPTION: Impersonation state (useImpersonation.tsx) uses its own
 * synchronous localStorage via useSyncExternalStore and is excluded
 * from versioning to preserve session stability.
 */

const STORAGE_VERSION = "v2";
const VERSION_META_KEY = "__storage_version__";

/**
 * Build a versioned key: "v2:dashboard_prefs_abc"
 */
export function getVersionedKey(key: string): string {
  return `${STORAGE_VERSION}:${key}`;
}

/**
 * Write a value to versioned localStorage.
 */
export function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(getVersionedKey(key), JSON.stringify(value));
  } catch (e) {
    // Storage full or unavailable — fail silently
    console.warn("[versionedStorage] setStorage failed:", e);
  }
}

/**
 * Read a value from versioned localStorage.
 */
export function getStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(getVersionedKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (e) {
    console.warn("[versionedStorage] getStorage parse failed:", e);
    return null;
  }
}

/**
 * Remove a specific versioned key.
 */
export function removeStorage(key: string): void {
  localStorage.removeItem(getVersionedKey(key));
}

/**
 * Keys that should NEVER be cleared by version migration.
 * These are managed by other subsystems with their own lifecycle.
 */
const PROTECTED_KEY_PREFIXES = [
  "impersonation_", // managed by useSyncExternalStore
  "sb-",            // Supabase auth tokens
];

/**
 * Clear all localStorage entries that don't match the current version.
 * Preserves protected keys (auth tokens, impersonation state).
 * Should be called once on app boot.
 */
export function clearLegacyStorage(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    // Skip keys that match current version
    if (key.startsWith(`${STORAGE_VERSION}:`)) continue;

    // Skip protected keys
    if (PROTECTED_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) continue;

    // Skip the version meta key itself
    if (key === VERSION_META_KEY) continue;

    keysToRemove.push(key);
  }

  keysToRemove.forEach(k => localStorage.removeItem(k));

  // Stamp current version
  localStorage.setItem(VERSION_META_KEY, STORAGE_VERSION);

  if (keysToRemove.length > 0) {
    console.info(`[versionedStorage] Cleared ${keysToRemove.length} legacy keys`);
  }
}

/**
 * Force-clear ALL versioned storage (user-triggered reset).
 * Preserves protected keys only.
 */
export function resetAllStorage(): void {
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (PROTECTED_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
    if (key === VERSION_META_KEY) continue;
    keysToRemove.push(key);
  }

  keysToRemove.forEach(k => localStorage.removeItem(k));
  console.info(`[versionedStorage] Reset ${keysToRemove.length} keys`);
}

export const CURRENT_STORAGE_VERSION = STORAGE_VERSION;
