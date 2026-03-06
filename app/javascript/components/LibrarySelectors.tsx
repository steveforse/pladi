import React from 'react'

type ServerOption = { id: number; name: string }
type LibraryOption = { title: string }

export default function LibrarySelectors({
  servers,
  selectedServerId,
  onServerChange,
  libraryType,
  onLibraryTypeChange,
  selectedLibrary,
  libraries,
  onLibraryChange,
  children,
}: {
  servers: ServerOption[]
  selectedServerId: number | null
  onServerChange: (serverId: number) => void
  libraryType: 'movies' | 'shows'
  onLibraryTypeChange: (type: 'movies' | 'shows') => void
  selectedLibrary: string | null
  libraries: LibraryOption[]
  onLibraryChange: (library: string | null) => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Server:</label>
        <select
          value={selectedServerId ?? ''}
          onChange={(e) => onServerChange(Number(e.target.value))}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          {servers.map((server) => (
            <option key={server.id} value={server.id}>{server.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Library Type:</label>
        <select
          aria-label="Library Type"
          value={libraryType}
          onChange={(e) => onLibraryTypeChange(e.target.value as 'movies' | 'shows')}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          <option value="movies">Movies</option>
          <option value="shows">TV Shows</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Library:</label>
        <select
          value={selectedLibrary ?? ''}
          onChange={(e) => onLibraryChange(e.target.value === '' ? null : e.target.value)}
          className="border rounded px-3 py-1.5 text-sm bg-background"
        >
          {libraries.map((library) => (
            <option key={library.title} value={library.title}>{library.title}</option>
          ))}
          <option value="">All libraries</option>
        </select>
      </div>

      {children}
    </div>
  )
}
