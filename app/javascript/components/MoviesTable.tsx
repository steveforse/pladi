import React, { useEffect, useState } from 'react'

interface Movie {
  title: string
  file_path: string | null
}

interface Section {
  title: string
  movies: Movie[]
}

export default function MoviesTable() {
  const [sections, setSections] = useState<Section[]>([])
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/movies')
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`)
        return res.json()
      })
      .then((data: Section[]) => {
        setSections(data)
        if (data.length > 0) setSelectedTitle(data[0].title)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const [multiOnly, setMultiOnly] = useState(false)

  const activeSection = sections.find((s) => s.title === selectedTitle)

  const visibleMovies = (() => {
    if (!activeSection) return []
    if (!multiOnly) return activeSection.movies
    const counts = new Map<string, number>()
    for (const m of activeSection.movies) counts.set(m.title, (counts.get(m.title) ?? 0) + 1)
    return activeSection.movies.filter((m) => (counts.get(m.title) ?? 0) > 1)
  })()

  if (loading) {
    return (
      <div className="p-8 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-8 bg-muted animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Failed to load movies: {error}
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Plex Movie Library</h1>
        <select
          value={selectedTitle ?? ''}
          onChange={(e) => setSelectedTitle(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          {sections.map((s) => (
            <option key={s.title} value={s.title}>{s.title}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiOnly}
            onChange={(e) => setMultiOnly(e.target.checked)}
          />
          Multiple files only
        </label>
      </div>

      {activeSection && (
        <div>
          <div className="rounded-md border overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium w-64">Title</th>
                  <th className="px-4 py-3 text-left font-medium">File Path</th>
                </tr>
              </thead>
              <tbody>
                {visibleMovies.map((movie, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">{movie.title}</td>
                    <td className="px-4 py-2 text-muted-foreground font-mono text-xs break-all">
                      {movie.file_path ?? <span className="italic">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{visibleMovies.length} movies</p>
        </div>
      )}
    </div>
  )
}
