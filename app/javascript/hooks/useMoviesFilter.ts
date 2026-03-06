import { useEffect, useMemo, useState } from 'react'
import type { Section, SortDir, SortKey } from '@/lib/types'
import { FILTER_FIELDS, matchesFilter } from '@/lib/filters'
import { sortMovies } from '@/lib/sorting'
import { useAdvancedFilters } from '@/hooks/useAdvancedFilters'
import { useStoredSort } from '@/hooks/useStoredSort'
import {
  titleMatchesPath,
  titleMatchesFilename,
  pathContainsYear,
  pathYearMatchesMetadata,
  fileIsInSubfolder,
} from '@/lib/pathMatching'
import { loadStoredJson, saveStoredJson } from '@/lib/storage'

const STORAGE_KEY = 'pladi.filters'
const MOVIE_SORT_KEYS = new Set<SortKey>([
  'id', 'title', 'original_title', 'year', 'file_path', 'container', 'video_codec', 'video_resolution',
  'width', 'height', 'aspect_ratio', 'frame_rate', 'audio_codec', 'audio_channels', 'overall_bitrate',
  'size', 'duration', 'updated_at', 'content_rating', 'imdb_rating', 'rt_critics_rating', 'rt_audience_rating',
  'tmdb_rating', 'genres', 'directors', 'sort_title', 'edition', 'originally_available', 'studio', 'tagline',
  'country', 'writers', 'producers', 'collections', 'labels', 'subtitles', 'audio_tracks', 'audio_language',
  'audio_bitrate', 'video_bitrate',
] as const)

type MovieQuickFilterState = {
  multiOnly: boolean
  unmatchedOnly: boolean
  filenameMismatch: boolean
  originalTitleMismatch: boolean
  noYearInPath: boolean
  yearPathMismatch: boolean
  notInSubfolder: boolean
}

type MovieFilterStorage = MovieQuickFilterState & {
  sortKey: SortKey
  sortDir: SortDir
}

function loadMovieFilterStorage(): MovieFilterStorage {
  return loadStoredJson('local', STORAGE_KEY, {
    multiOnly: false,
    unmatchedOnly: false,
    filenameMismatch: false,
    originalTitleMismatch: false,
    noYearInPath: false,
    yearPathMismatch: false,
    notInSubfolder: false,
    sortKey: 'title' as const,
    sortDir: 'asc' as const,
  })
}

export function useMoviesFilter(sections: Section[], selectedTitle: string | null) {
  const saved = useMemo(() => loadMovieFilterStorage(), [])
  const [multiOnly, setMultiOnly] = useState(saved.multiOnly)
  const [unmatchedOnly, setUnmatchedOnly] = useState(saved.unmatchedOnly)
  const [filenameMismatch, setFilenameMismatch] = useState(saved.filenameMismatch)
  const [originalTitleMismatch, setOriginalTitleMismatch] = useState(saved.originalTitleMismatch)
  const [noYearInPath, setNoYearInPath] = useState(saved.noYearInPath)
  const [yearPathMismatch, setYearPathMismatch] = useState(saved.yearPathMismatch)
  const [notInSubfolder, setNotInSubfolder] = useState(saved.notInSubfolder)
  const { sortKey, sortDir, handleSort, persistSort } = useStoredSort({
    storageKey: `${STORAGE_KEY}.sort`,
    defaultSortKey: saved.sortKey,
    validSortKeys: MOVIE_SORT_KEYS,
    storage: 'local',
  })
  const {
    activeFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearFilters,
    persistFilters,
  } = useAdvancedFilters({
    storageKey: `${STORAGE_KEY}.advanced`,
    fieldDefs: FILTER_FIELDS,
    initialField: 'title',
  })

  useEffect(() => {
    saveStoredJson('local', STORAGE_KEY, {
      multiOnly,
      unmatchedOnly,
      filenameMismatch,
      originalTitleMismatch,
      noYearInPath,
      yearPathMismatch,
      notInSubfolder,
      sortKey,
      sortDir,
    })
  }, [multiOnly, unmatchedOnly, filenameMismatch, originalTitleMismatch, noYearInPath, yearPathMismatch, notInSubfolder, sortKey, sortDir])

  useEffect(() => {
    persistFilters(activeFilters)
  }, [activeFilters, persistFilters])

  useEffect(() => {
    persistSort(sortKey, sortDir)
  }, [sortKey, sortDir, persistSort])

  const visibleMovies = useMemo(() => {
    let movies = selectedTitle === null
      ? sections.flatMap((section) => section.items)
      : (sections.find((section) => section.title === selectedTitle)?.items ?? [])

    if (multiOnly) {
      const counts = new Map<string, number>()
      for (const movie of movies) counts.set(movie.id, (counts.get(movie.id) ?? 0) + 1)
      movies = movies.filter((movie) => (counts.get(movie.id) ?? 0) > 1)
    }

    if (unmatchedOnly) movies = movies.filter((movie) => !titleMatchesPath(movie))
    if (filenameMismatch) movies = movies.filter((movie) => !titleMatchesFilename(movie))
    if (originalTitleMismatch) movies = movies.filter((movie) => movie.original_title != null && movie.original_title !== movie.title)
    if (noYearInPath) movies = movies.filter((movie) => !pathContainsYear(movie))
    if (yearPathMismatch) movies = movies.filter((movie) => !pathYearMatchesMetadata(movie))
    if (notInSubfolder) movies = movies.filter((movie) => !fileIsInSubfolder(movie))
    if (activeFilters.length > 0) movies = movies.filter((movie) => activeFilters.every((filter) => matchesFilter(movie, filter)))

    return sortMovies(movies, sortKey, sortDir)
  }, [
    sections,
    selectedTitle,
    multiOnly,
    unmatchedOnly,
    filenameMismatch,
    originalTitleMismatch,
    noYearInPath,
    yearPathMismatch,
    notInSubfolder,
    activeFilters,
    sortKey,
    sortDir,
  ])

  function clearAllFilters() {
    setMultiOnly(false)
    setUnmatchedOnly(false)
    setFilenameMismatch(false)
    setOriginalTitleMismatch(false)
    setNoYearInPath(false)
    setYearPathMismatch(false)
    setNotInSubfolder(false)
    clearFilters()
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
    filters: activeFilters, addFilter, updateFilter, removeFilter, clearAllFilters,
    visibleMovies,
  }
}
