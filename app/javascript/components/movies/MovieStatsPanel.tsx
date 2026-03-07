import React, { useMemo } from 'react'
import type { Movie, Section } from '@/lib/types'

export default function MovieStatsPanel({
  sections,
  selectedTitle,
}: {
  sections: Section[]
  selectedTitle: string | null
}) {
  const stats = useMemo(() => buildMovieStats(sections, selectedTitle), [sections, selectedTitle])

  return (
    <section
      aria-label="Movie statistics"
      className="w-full rounded-md border border-white/10 bg-[linear-gradient(90deg,rgba(36,36,39,0.98),rgba(19,19,21,0.98))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div className="rounded-t-md bg-white/12 px-4 py-2 text-center text-sm font-semibold tracking-wide text-white/90">
        Statistics For Movies
      </div>

      <div className="space-y-6 px-5 py-5">
        <div className="grid gap-4 md:grid-cols-3">
          <StatBlock label="Total Size" value={stats.totalSize} />
          <StatBlock label="Watched" value={stats.watched} />
          <StatBlock label="Total Duration" value={stats.totalDuration} />
        </div>

        <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
          <StatBlock label="Longest Movie" value={stats.longestMovie} />
          <StatBlock label="Oldest Movie" value={stats.oldestMovie} />
          <StatBlock label="Earliest Addition" value={stats.earliestAddition} />
          <StatBlock label="Latest Addition" value={stats.latestAddition} />
        </div>
      </div>
    </section>
  )
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[0.95rem] font-semibold leading-tight text-[#f0a11a]">{label}:</div>
      <div className="mt-1 text-[0.95rem] leading-snug text-white">{value}</div>
    </div>
  )
}

function buildMovieStats(sections: Section[], selectedTitle: string | null) {
  const items = selectedTitle === null
    ? sections.flatMap((section) => section.items)
    : (sections.find((section) => section.title === selectedTitle)?.items ?? [])

  const uniqueMovies = dedupeMovies(items)
  const totalBytes = uniqueMovies.reduce((sum, movie) => sum + (movie.size ?? 0), 0)
  const totalDurationMs = uniqueMovies.reduce((sum, movie) => sum + (movie.duration ?? 0), 0)
  const watchedCount = uniqueMovies.filter((movie) => (movie.view_count ?? 0) > 0).length
  const watchedPercent = uniqueMovies.length === 0 ? 0 : Math.round((watchedCount / uniqueMovies.length) * 100)

  return {
    totalSize: formatCompactSize(totalBytes),
    watched: `${watchedCount.toLocaleString()} / ${uniqueMovies.length.toLocaleString()} (${watchedPercent}%)`,
    totalDuration: formatLongDuration(totalDurationMs),
    longestMovie: formatMovieWithDetail(maxBy(uniqueMovies, (movie) => movie.duration ?? -1), (movie) => formatMinutes(movie.duration)),
    oldestMovie: formatMovieWithDetail(minBy(uniqueMovies, (movie) => movie.year ?? Number.POSITIVE_INFINITY), (movie) => formatYearOrDate(movie)),
    earliestAddition: formatMovieWithDetail(minBy(uniqueMovies, (movie) => movie.added_at ?? Number.POSITIVE_INFINITY), (movie) => formatAddedAt(movie)),
    latestAddition: formatMovieWithDetail(maxBy(uniqueMovies, (movie) => movie.added_at ?? -1), (movie) => formatAddedAt(movie)),
  }
}

function dedupeMovies(items: Movie[]) {
  const byId = new Map<string, Movie>()
  for (const item of items) {
    const existing = byId.get(item.id)
    if (!existing || (item.size ?? 0) > (existing.size ?? 0)) byId.set(item.id, item)
  }
  return [...byId.values()]
}

function maxBy<T>(items: T[], valueFor: (item: T) => number) {
  let winner: T | null = null
  let winnerValue = -Infinity
  for (const item of items) {
    const value = valueFor(item)
    if (value > winnerValue) {
      winner = item
      winnerValue = value
    }
  }
  return winner
}

function minBy<T>(items: T[], valueFor: (item: T) => number) {
  let winner: T | null = null
  let winnerValue = Infinity
  for (const item of items) {
    const value = valueFor(item)
    if (value < winnerValue) {
      winner = item
      winnerValue = value
    }
  }
  return winner
}

function formatCompactSize(bytes: number) {
  if (bytes <= 0) return '0 GB'
  const tebibytes = bytes / 1_099_511_627_776
  if (tebibytes >= 1) return `${tebibytes.toFixed(2)} TB`
  const gibibytes = bytes / 1_073_741_824
  return `${gibibytes.toFixed(2)} GB`
}

function formatLongDuration(milliseconds: number) {
  if (milliseconds <= 0) return '0 Days, 0 Hours, 0 Mins'
  const totalMinutes = Math.round(milliseconds / 60_000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  return `${days} Days, ${hours} Hours, ${minutes} Mins`
}

function formatMinutes(milliseconds: number | null) {
  if (milliseconds == null || milliseconds <= 0) return '—'
  return `${Math.round(milliseconds / 60_000)} mins`
}

function formatMovieWithDetail(movie: Movie | null, detailFor: (movie: Movie) => string) {
  if (!movie) return '—'
  const detail = detailFor(movie)
  return detail === '—' ? movie.title : `${movie.title} (${detail})`
}

function formatYearOrDate(movie: Movie) {
  if (movie.year != null) return String(movie.year)
  return formatReleaseDate(movie)
}

function formatReleaseDate(movie: Movie) {
  if (!movie.originally_available) return '—'
  const [year, month, day] = movie.originally_available.split('-')
  if (!year || !month || !day) return movie.originally_available
  return `${Number(month)}-${Number(day)}-${year}`
}

function formatAddedAt(movie: Movie) {
  if (movie.added_at == null) return '—'
  const date = new Date(movie.added_at * 1000)
  if (Number.isNaN(date.getTime())) return '—'
  return `${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCFullYear()}`
}
