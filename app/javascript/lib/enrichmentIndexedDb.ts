import type { Movie } from './types'

export type EnrichmentScope = 'movies' | 'shows' | 'episodes'

type EnrichmentRecord = {
  cacheId: string
  serverId: number
  scope: EnrichmentScope
  library: string
  movieId: string
  rowKey: string
  data: Partial<Movie>
  updatedAt: number
  sizeBytes: number
}

type EnrichmentEntry = {
  library: string
  movieId: string
  rowKey: string
  data: Partial<Movie>
}

type CacheStats = {
  relevantBytes: number
  records: number
  keys: Array<{ key: string; bytes: number }>
}

const DB_NAME = 'pladi-cache'
const DB_VERSION = 1
const STORE_NAME = 'enrichment_rows'
const MAX_RECORDS_PER_LIBRARY = 1500
const MAX_BYTES_PER_LIBRARY = 1024 * 1024

function supportsIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function cacheId(serverId: number, scope: EnrichmentScope, library: string, rowKey: string) {
  return `${serverId}:${scope}:${library}:${rowKey}`
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

async function openDb() {
  if (!supportsIndexedDb()) return null

  const request = indexedDB.open(DB_NAME, DB_VERSION)
  request.onupgradeneeded = () => {
    const db = request.result
    if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME)
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheId' })
    store.createIndex('by_scope_library', ['serverId', 'scope', 'library'], { unique: false })
    store.createIndex('by_scope_movie', ['serverId', 'scope', 'movieId'], { unique: false })
  }

  return requestToPromise(request)
}

async function getRecordsForLibrary(db: IDBDatabase, serverId: number, scope: EnrichmentScope, library: string) {
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('by_scope_library')
  const rows = await requestToPromise(index.getAll(IDBKeyRange.only([serverId, scope, library])) as IDBRequest<EnrichmentRecord[]>)
  await transactionDone(transaction)
  return rows
}

async function getRecordsForMovie(db: IDBDatabase, serverId: number, scope: EnrichmentScope, movieId: string) {
  const transaction = db.transaction(STORE_NAME, 'readonly')
  const store = transaction.objectStore(STORE_NAME)
  const index = store.index('by_scope_movie')
  const rows = await requestToPromise(index.getAll(IDBKeyRange.only([serverId, scope, movieId])) as IDBRequest<EnrichmentRecord[]>)
  await transactionDone(transaction)
  return rows
}

function recordSizeBytes(record: Pick<EnrichmentRecord, 'cacheId' | 'library' | 'movieId' | 'rowKey' | 'data'>) {
  return JSON.stringify(record).length
}

async function pruneLibrary(db: IDBDatabase, serverId: number, scope: EnrichmentScope, library: string) {
  const rows = await getRecordsForLibrary(db, serverId, scope, library)
  if (rows.length <= MAX_RECORDS_PER_LIBRARY && rows.reduce((sum, row) => sum + row.sizeBytes, 0) <= MAX_BYTES_PER_LIBRARY) return

  const sorted = [...rows].sort((a, b) => b.updatedAt - a.updatedAt)
  let retained = 0
  let retainedBytes = 0
  const toDelete: string[] = []

  for (const row of sorted) {
    if (retained < MAX_RECORDS_PER_LIBRARY && retainedBytes + row.sizeBytes <= MAX_BYTES_PER_LIBRARY) {
      retained += 1
      retainedBytes += row.sizeBytes
      continue
    }
    toDelete.push(row.cacheId)
  }

  if (toDelete.length === 0) return

  const transaction = db.transaction(STORE_NAME, 'readwrite')
  const store = transaction.objectStore(STORE_NAME)
  for (const key of toDelete) store.delete(key)
  await transactionDone(transaction)
}

export async function loadIndexedDbEnrichmentRecords(serverId: number, scope: EnrichmentScope, libraries: string[]) {
  const db = await openDb()
  if (!db) return null

  try {
    const records = new Map<string, Record<string, Partial<Movie>>>()
    for (const library of libraries) {
      const rows = await getRecordsForLibrary(db, serverId, scope, library)
      records.set(
        library,
        Object.fromEntries(rows.map((row) => [row.rowKey, row.data]))
      )
    }
    return records
  } finally {
    db.close()
  }
}

export async function saveIndexedDbEnrichmentRecords(serverId: number, scope: EnrichmentScope, entries: EnrichmentEntry[]) {
  const db = await openDb()
  if (!db) return false

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const touchedLibraries = new Set<string>()

    for (const entry of entries) {
      const record: EnrichmentRecord = {
        cacheId: cacheId(serverId, scope, entry.library, entry.rowKey),
        serverId,
        scope,
        library: entry.library,
        movieId: entry.movieId,
        rowKey: entry.rowKey,
        data: entry.data,
        updatedAt: Date.now(),
        sizeBytes: recordSizeBytes({
          cacheId: cacheId(serverId, scope, entry.library, entry.rowKey),
          library: entry.library,
          movieId: entry.movieId,
          rowKey: entry.rowKey,
          data: entry.data,
        }),
      }
      touchedLibraries.add(entry.library)
      store.put(record)
    }

    await transactionDone(transaction)
    for (const library of touchedLibraries) {
      await pruneLibrary(db, serverId, scope, library)
    }
    return true
  } finally {
    db.close()
  }
}

export async function updateIndexedDbMovieRecords(serverId: number, scope: EnrichmentScope, movieId: string, patch: Partial<Movie>) {
  const db = await openDb()
  if (!db) return false

  try {
    const rows = await getRecordsForMovie(db, serverId, scope, movieId)
    if (rows.length === 0) return true

    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    for (const row of rows) {
      const data = { ...row.data, ...patch }
      store.put({
        ...row,
        data,
        updatedAt: Date.now(),
        sizeBytes: recordSizeBytes({
          cacheId: row.cacheId,
          library: row.library,
          movieId: row.movieId,
          rowKey: row.rowKey,
          data,
        }),
      })
    }
    await transactionDone(transaction)
    return true
  } finally {
    db.close()
  }
}

export async function getIndexedDbEnrichmentStats(serverId: number) {
  const db = await openDb()
  if (!db) return null

  try {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const rows = await requestToPromise(store.getAll() as IDBRequest<EnrichmentRecord[]>)
    await transactionDone(transaction)

    const relevant = rows.filter((row) => row.serverId === serverId)
    return {
      relevantBytes: relevant.reduce((sum, row) => sum + row.sizeBytes, 0),
      records: relevant.length,
      keys: relevant
        .map((row) => ({ key: `${row.scope}:${row.library}`, bytes: row.sizeBytes }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 8),
    } satisfies CacheStats
  } finally {
    db.close()
  }
}

export async function clearIndexedDbEnrichmentScope(serverId: number, scope: EnrichmentScope) {
  const db = await openDb()
  if (!db) return false

  try {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const index = store.index('by_scope_library')
    const cursorRequest = index.openCursor()
    await new Promise<void>((resolve, reject) => {
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) {
          resolve()
          return
        }
        const [cursorServerId, cursorScope] = cursor.key as [number, EnrichmentScope, string]
        if (cursorServerId === serverId && cursorScope === scope) cursor.delete()
        cursor.continue()
      }
      cursorRequest.onerror = () => reject(cursorRequest.error ?? new Error('IndexedDB cursor failed'))
    })
    await transactionDone(transaction)
    return true
  } finally {
    db.close()
  }
}
