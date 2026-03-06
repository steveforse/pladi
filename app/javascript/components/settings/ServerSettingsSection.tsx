import React from 'react'
import { TokenInput } from '@/components/ui/TokenInput'
import type { z } from 'zod'
import { PlexServerInfoListSchema } from '@/lib/apiSchemas'

type PlexServer = z.infer<typeof PlexServerInfoListSchema>[number]

type EditState = {
  name: string
  url: string
  token: string
}

export default function ServerSettingsSection({
  error,
  loading,
  servers,
  editingId,
  editState,
  newServer,
  addingNew,
  fetchingName,
  onEditStateChange,
  onNewServerChange,
  onCreate,
  onStartEdit,
  onUpdate,
  onDelete,
  onCancelEdit,
  onToggleAddNew,
  onFetchNameFromNewServerUrl,
  onFetchNameFromNewServerToken,
}: {
  error: string | null
  loading: boolean
  servers: PlexServer[]
  editingId: number | null
  editState: EditState
  newServer: EditState
  addingNew: boolean
  fetchingName: boolean
  onEditStateChange: (patch: Partial<EditState>) => void
  onNewServerChange: (patch: Partial<EditState>) => void
  onCreate: (event: React.FormEvent) => Promise<void>
  onStartEdit: (server: PlexServer) => void
  onUpdate: (event: React.FormEvent, id: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onCancelEdit: () => void
  onToggleAddNew: (open: boolean) => void
  onFetchNameFromNewServerUrl: (url: string) => void
  onFetchNameFromNewServerToken: (token: string) => void
}) {
  return (
    <div className="px-8 py-6 space-y-6 max-w-2xl mx-auto">
      {error && (
        <div className="text-sm text-destructive border border-destructive/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          {servers.length > 0 && (
            <div className="rounded-md border overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">URL</th>
                    <th className="px-4 py-3 text-left font-medium w-40">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {servers.map((server) =>
                    editingId === server.id ? (
                      <tr key={server.id} className="border-b last:border-0">
                        <td className="px-4 py-2" colSpan={3}>
                          <form onSubmit={(event) => onUpdate(event, server.id)} className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={editState.name}
                              onChange={(event) => onEditStateChange({ name: event.target.value })}
                              placeholder="Name"
                              required
                              className="border rounded px-2 py-1 text-sm bg-background w-40"
                            />
                            <input
                              type="url"
                              value={editState.url}
                              onChange={(event) => onEditStateChange({ url: event.target.value })}
                              placeholder="URL"
                              required
                              className="border rounded px-2 py-1 text-sm bg-background w-56"
                            />
                            <TokenInput
                              value={editState.token}
                              onChange={(value) => onEditStateChange({ token: value })}
                              placeholder="Token (leave blank to keep)"
                              className="border rounded px-2 py-1 text-sm bg-background w-52"
                            />
                            <button type="submit" className="btn px-3 py-1 text-sm">Save</button>
                            <button type="button" onClick={onCancelEdit} className="btn px-3 py-1 text-sm text-muted-foreground">Cancel</button>
                          </form>
                        </td>
                      </tr>
                    ) : (
                      <tr key={server.id} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                        <td className="px-4 py-2 font-medium">{server.name}</td>
                        <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{server.url}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button onClick={() => onStartEdit(server)} className="btn px-2 py-1 text-xs">Edit</button>
                            <button onClick={() => onDelete(server.id)} className="btn px-2 py-1 text-xs text-destructive hover:bg-destructive/10">Delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {servers.length === 0 && !addingNew && (
            <p className="text-sm text-muted-foreground">No Plex servers configured yet.</p>
          )}

          {addingNew ? (
            <form onSubmit={onCreate} className="space-y-3">
              <h3 className="text-sm font-semibold">Add Server</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="url"
                  value={newServer.url}
                  onChange={(event) => onNewServerChange({ url: event.target.value })}
                  onBlur={(event) => onFetchNameFromNewServerUrl(event.target.value)}
                  placeholder="URL (e.g. https://plex.example.com)"
                  required
                  className="border rounded px-2 py-1 text-sm bg-background w-72"
                />
                <TokenInput
                  value={newServer.token}
                  onChange={(value) => onNewServerChange({ token: value })}
                  onBlur={onFetchNameFromNewServerToken}
                  placeholder="Plex token"
                  className="border rounded px-2 py-1 text-sm bg-background w-52"
                />
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(event) => onNewServerChange({ name: event.target.value })}
                  placeholder={fetchingName ? 'Fetching name…' : 'Name (e.g. Home Server)'}
                  required
                  className="border rounded px-2 py-1 text-sm bg-background w-48"
                />
                <button type="submit" className="btn px-3 py-1.5 text-sm">Add</button>
                <button type="button" onClick={() => onToggleAddNew(false)} className="btn px-3 py-1.5 text-sm text-muted-foreground">Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => onToggleAddNew(true)} className="btn px-3 py-1.5 text-sm">
              + Add Server
            </button>
          )}
        </>
      )}
    </div>
  )
}
