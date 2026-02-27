import type { Movie } from '@/lib/types'

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/\(\d{4}\)/g, '')    // strip (year)
    .replace(/\b\d{4}\b/g, '')    // strip bare 4-digit years
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation/dots with space
    .replace(/\s+/g, ' ')
    .trim()
}

export function titleMatchesFilename(movie: Movie): boolean {
  if (!movie.file_path || !movie.title) return true
  const parts = movie.file_path.replace(/\\/g, '/').split('/')
  const filename = parts[parts.length - 1] ?? ''
  const nameNoExt = filename.replace(/\.[^.]+$/, '') // strip extension
  const normTitle = normalizeForMatch(movie.title)
  const normFile  = normalizeForMatch(nameNoExt)
  if (!normFile) return false
  return normFile.includes(normTitle) || normTitle.includes(normFile)
}

export function titleMatchesPath(movie: Movie): boolean {
  if (!movie.file_path || !movie.title) return true
  const parts = movie.file_path.replace(/\\/g, '/').split('/')
  const folderName = parts.length >= 2 ? parts[parts.length - 2] : ''
  const normTitle  = normalizeForMatch(movie.title)
  const normFolder = normalizeForMatch(folderName)
  if (!normFolder) return false
  return normFolder.includes(normTitle) || normTitle.includes(normFolder)
}

// Matches a plausible release year in a file path (1900–2099)
export const PATH_YEAR_RE = /\b(19|20)\d{2}\b/

export function pathContainsYear(movie: Movie): boolean {
  if (!movie.file_path) return false
  return PATH_YEAR_RE.test(movie.file_path)
}

export function pathYearMatchesMetadata(movie: Movie): boolean {
  if (!movie.file_path || movie.year == null) return true
  const parts = movie.file_path.replace(/\\/g, '/')
  const segments = parts.split('/')
  const searchIn = segments.slice(-2).join('/')
  const match = searchIn.match(/\b((?:19|20)\d{2})\b/g)
  if (!match) return true // no year in path — handled by a separate filter
  const pathYear = parseInt(match[match.length - 1], 10)
  return pathYear === movie.year
}

export function fileIsInSubfolder(movie: Movie): boolean {
  if (!movie.file_path) return true
  const parts = movie.file_path.replace(/\\/g, '/').split('/')
  if (parts.length < 3) return false // needs at least root/folder/file.ext
  const parentFolder = parts[parts.length - 2]
  return PATH_YEAR_RE.test(parentFolder)
}
