import React from 'react'
import { Select } from '@/components/ui/select'

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
        <Select
          value={selectedServerId ?? ''}
          onValueChange={(value) => onServerChange(Number(value))}
          className="min-w-48"
        >
          {servers.map((server) => (
            <option key={server.id} value={server.id}>{server.name}</option>
          ))}
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Library Type:</label>
        <Select
          aria-label="Library Type"
          value={libraryType}
          onValueChange={(value) => onLibraryTypeChange(value as 'movies' | 'shows')}
          className="min-w-44"
        >
          <option value="movies">Movies</option>
          <option value="shows">TV Shows</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-muted-foreground">Library:</label>
        <Select
          value={selectedLibrary ?? ''}
          onValueChange={(value) => onLibraryChange(value === '' ? null : value)}
          className="min-w-52"
        >
          {libraries.map((library) => (
            <option key={library.title} value={library.title}>{library.title}</option>
          ))}
          <option value="">All libraries</option>
        </Select>
      </div>

      {children}
    </div>
  )
}
