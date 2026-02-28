import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveFilter, Section, SortKey, SortDir } from '@/lib/types'
import { matchesFilter } from '@/lib/filters'
import { sortMovies } from '@/lib/sorting'
import {
  titleMatchesPath,
  titleMatchesFilename,
  pathContainsYear,
  pathYearMatchesMetadata,
  fileIsInSubfolder,
} from '@/lib/pathMatching'

const STORAGE_KEY = 'pladi.filters'

function loadFiltersFromStorage(): {
  multiOnly: boolean
  unmatchedOnly: boolean
  filenameMismatch: boolean
  originalTitleMismatch: boolean
  noYearInPath: boolean
  yearPathMismatch: boolean
  notInSubfolder: boolean
  sortKey: SortKey
  sortDir: SortDir
  filters: ActiveFilter[]
} {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    multiOnly: false,
    unmatchedOnly: false,
    filenameMismatch: false,
    originalTitleMismatch: false,
    noYearInPath: false,
    yearPathMismatch: false,
    notInSubfolder: false,
    sortKey: 'title',
    sortDir: 'asc',
    filters: [],
  }
}

export function useMoviesFilter(sections: Section[], selectedTitle: string | null) {
  const saved = useMemo(() => loadFiltersFromStorage(), [])
  const [multiOnly, setMultiOnly] = useState(saved.multiOnly)
  const [unmatchedOnly, setUnmatchedOnly] = useState(saved.unmatchedOnly)
  const [filenameMismatch, setFilenameMismatch] = useState(saved.filenameMismatch)
  const [originalTitleMismatch, setOriginalTitleMismatch] = useState(saved.originalTitleMismatch)
  const [noYearInPath, setNoYearInPath] = useState(saved.noYearInPath)
  const [yearPathMismatch, setYearPathMismatch] = useState(saved.yearPathMismatch)
  const [notInSubfolder, setNotInSubfolder] = useState(saved.notInSubfolder)
  const [sortKey, setSortKey] = useState<SortKey>(saved.sortKey)
  const [sortDir, setSortDir] = useState<SortDir>(saved.sortDir)
  const [filters, setFilters] = useState<ActiveFilter[]>(saved.filters)
  const nextId = useRef(saved.filters.length > 0 ? Math.max(...saved.filters.map((f) => f.id)) + 1 : 1)

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, noYearInPath, yearPathMismatch, notInSubfolder, sortKey, sortDir, filters })
      )
    } catch {}
  }, [multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, noYearInPath, yearPathMismatch, notInSubfolder, sortKey, sortDir, filters])

  const visibleMovies = useMemo(() => {
    let movies = selectedTitle === null
      ? sections.flatMap((s) => s.movies)
      : (sections.find((s) => s.title === selectedTitle)?.movies ?? [])

    if (multiOnly) {
      const counts = new Map<string, number>()
      for (const m of movies) counts.set(m.id, (counts.get(m.id) ?? 0) + 1)
      movies = movies.filter((m) => (counts.get(m.id) ?? 0) > 1)
    }

    if (unmatchedOnly) movies = movies.filter((m) => !titleMatchesPath(m))
    if (filenameMismatch) movies = movies.filter((m) => !titleMatchesFilename(m))
    if (originalTitleMismatch) movies = movies.filter((m) => m.original_title != null && m.original_title !== m.title)
    if (noYearInPath) movies = movies.filter((m) => !pathContainsYear(m))
    if (yearPathMismatch) movies = movies.filter((m) => !pathYearMatchesMetadata(m))
    if (notInSubfolder) movies = movies.filter((m) => !fileIsInSubfolder(m))

    if (filters.length > 0) {
      movies = movies.filter((m) => filters.every((f) => matchesFilter(m, f)))
    }

    return sortMovies(movies, sortKey, sortDir)
  }, [sections, selectedTitle, multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, noYearInPath, yearPathMismatch, notInSubfolder, filters, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function addFilter() {
    setFilters((prev) => [
      ...prev,
      { id: nextId.current++, field: 'title', op: 'includes', value: '' },
    ])
  }

  function updateFilter(id: number, updated: ActiveFilter) {
    setFilters((prev) => prev.map((f) => (f.id === id ? updated : f)))
  }

  function removeFilter(id: number) {
    setFilters((prev) => prev.filter((f) => f.id !== id))
  }

  function clearAllFilters() {
    setMultiOnly(false)
    setUnmatchedOnly(false)
    setFilenameMismatch(false)
    setOriginalTitleMismatch(false)
    setNoYearInPath(false)
    setYearPathMismatch(false)
    setNotInSubfolder(false)
    setFilters([])
  }

  return {
    multiOnly, setMultiOnly,
    unmatchedOnly, setUnmatchedOnly,
    filenameMismatch, setFilenameMismatch,
    originalTitleMismatch, setOriginalTitleMismatch,
    noYearInPath, setNoYearInPath,
    yearPathMismatch, setYearPathMismatch,
    notInSubfolder, setNotInSubfolder,
    sortKey, sortDir, handleSort,
    filters, addFilter, updateFilter, removeFilter, clearAllFilters,
    visibleMovies,
  }
}
