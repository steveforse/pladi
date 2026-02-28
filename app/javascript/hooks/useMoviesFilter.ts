import { useMemo, useRef, useState } from 'react'
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

export function useMoviesFilter(sections: Section[], selectedTitle: string | null) {
  const [multiOnly, setMultiOnly] = useState(false)
  const [unmatchedOnly, setUnmatchedOnly] = useState(false)
  const [filenameMismatch, setFilenameMismatch] = useState(false)
  const [originalTitleMismatch, setOriginalTitleMismatch] = useState(false)
  const [noYearInPath, setNoYearInPath] = useState(false)
  const [yearPathMismatch, setYearPathMismatch] = useState(false)
  const [notInSubfolder, setNotInSubfolder] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filters, setFilters] = useState<ActiveFilter[]>([])
  const nextId = useRef(1)

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
