export type StorageScope = 'local' | 'session'

function getStorage(scope: StorageScope): Storage {
  return scope === 'local' ? localStorage : sessionStorage
}

export function loadStoredJson<T>(scope: StorageScope, key: string, fallback: T): T {
  try {
    const raw = getStorage(scope).getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function saveStoredJson(scope: StorageScope, key: string, value: unknown): void {
  try {
    getStorage(scope).setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable
  }
}

export function loadStoredBoolean(scope: StorageScope, key: string, fallback = false): boolean {
  try {
    const raw = getStorage(scope).getItem(key)
    return raw == null ? fallback : raw === 'true'
  } catch {
    return fallback
  }
}

export function saveStoredString(scope: StorageScope, key: string, value: string): void {
  try {
    getStorage(scope).setItem(key, value)
  } catch {
    // storage unavailable
  }
}

export function loadStoredString(scope: StorageScope, key: string, fallback: string | null = null): string | null {
  try {
    const raw = getStorage(scope).getItem(key)
    return raw ?? fallback
  } catch {
    return fallback
  }
}
