import React, { useEffect, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import AccountSettingsSection from '@/components/settings/AccountSettingsSection'
import PreferenceSettingsSection from '@/components/settings/PreferenceSettingsSection'
import ServerSettingsSection from '@/components/settings/ServerSettingsSection'
import SettingsTabs from '@/components/settings/SettingsTabs'
import { isValidEmail } from '@/lib/utils'
import { ApiError, api } from '@/lib/apiClient'
import { LookupNameResponseSchema, MeResponseSchema, PlexServerInfoListSchema } from '@/lib/apiSchemas'
import type { z } from 'zod'

type PlexServer = z.infer<typeof PlexServerInfoListSchema>[number]

interface EditState {
  name: string
  url: string
  token: string
}

interface ErrorResponse {
  errors?: string[]
}
type MeResponse = z.infer<typeof MeResponseSchema>
type LookupNameResponse = z.infer<typeof LookupNameResponseSchema>

export type SettingsTab = 'account' | 'preferences' | 'servers'

export default function SettingsPage({ onBack, downloadImages, onDownloadImagesChange, activeTab, onTabChange }: {
  onBack: () => void
  downloadImages: boolean
  onDownloadImagesChange: (value: boolean) => void
  activeTab?: SettingsTab
  onTabChange?: (tab: SettingsTab) => void
}) {
  const [tab, setTab] = useState<SettingsTab>(activeTab ?? 'account')
  const [servers, setServers] = useState<PlexServer[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', url: '', token: '' })
  const [newServer, setNewServer] = useState<EditState>({ name: '', url: '', token: '' })
  const [addingNew, setAddingNew] = useState(false)
  const [fetchingName, setFetchingName] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Account section
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailSaving, setEmailSaving] = useState(false)
  const [emailServerError, setEmailServerError] = useState<string | null>(null)

  const [downloadImagesSaving, setDownloadImagesSaving] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    api.get<MeResponse>('/api/me', { throwOnError: false, responseSchema: MeResponseSchema }).then((res) => {
      if (res.ok && res.data) setEmail(res.data.email_address ?? '')
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (activeTab && activeTab !== tab) setTab(activeTab)
  }, [activeTab, tab])

  function handleEmailChange(value: string) {
    setEmail(value)
    setEmailSuccess(false)
    setEmailServerError(null)
    if (emailError && isValidEmail(value.trim())) setEmailError(null)
  }

  function handleEmailBlur() {
    const trimmed = email.trim()
    setEmail(trimmed)
    if (trimmed && !isValidEmail(trimmed)) setEmailError('Please enter a valid email address.')
    else setEmailError(null)
  }

  async function handleDownloadImagesChange(value: boolean) {
    onDownloadImagesChange(value)
    setDownloadImagesSaving(true)
    try {
      await api.patch('/api/account', { user: { download_images: value } }, { csrf: true, throwOnError: false })
    } finally {
      setDownloadImagesSaving(false)
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    setEmail(trimmed)
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError(null)
    setEmailServerError(null)
    setEmailSaving(true)
    try {
      await api.patch('/api/account', { user: { email_address: trimmed } }, { csrf: true })
      setEmailSuccess(true)
    } catch (err: unknown) {
      if (err instanceof ApiError) setEmailServerError(err.message || 'Failed to update email.')
      else setEmailServerError('Network error. Please try again.')
    } finally {
      setEmailSaving(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    setPasswordError(null)
    setPasswordSuccess(false)
    setPasswordSaving(true)
    try {
      await api.patch('/api/account', {
        user: { password: newPassword, password_confirmation: confirmPassword },
      }, { csrf: true })
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSuccess(true)
    } catch (err: unknown) {
      if (err instanceof ApiError) setPasswordError(err.message || 'Failed to update password.')
      else setPasswordError('Network error. Please try again.')
    } finally {
      setPasswordSaving(false)
    }
  }

  async function fetchName(url: string, token: string) {
    const trimmedUrl = url.trim()
    const trimmedToken = token.trim()
    if (!trimmedUrl || !trimmedToken) return
    setFetchingName(true)
    try {
      const res = await api.get<LookupNameResponse>('/api/plex_servers/lookup_name', {
        query: { url: trimmedUrl, token: trimmedToken },
        throwOnError: false,
        responseSchema: LookupNameResponseSchema,
      })
      if (res.ok && res.data?.name) setNewServer((s) => ({ ...s, name: res.data?.name ?? s.name }))
    } finally {
      setFetchingName(false)
    }
  }

  async function fetchServers() {
    const res = await api.get<PlexServer[]>('/api/plex_servers', {
      throwOnError: false,
      responseSchema: PlexServerInfoListSchema,
    })
    if (res.ok && res.data) setServers(res.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchServers()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/api/plex_servers', {
        plex_server: { ...newServer, token: newServer.token.trim() },
      }, { csrf: true })
      setNewServer({ name: '', url: '', token: '' })
      setAddingNew(false)
      await fetchServers()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to create server')
      } else {
        setError('Failed to create server')
      }
    }
  }

  function startEdit(server: PlexServer) {
    setEditingId(server.id)
    setEditState({ name: server.name, url: server.url, token: '' })
  }

  async function handleUpdate(e: React.FormEvent, id: number) {
    e.preventDefault()
    setError(null)
    try {
      await api.patch(`/api/plex_servers/${id}`, {
        plex_server: { ...editState, token: editState.token.trim() },
      }, { csrf: true })
      setEditingId(null)
      await fetchServers()
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const apiData = err.data as ErrorResponse | null
        setError(apiData?.errors?.join(', ') ?? err.message ?? 'Failed to update server')
      } else {
        setError('Failed to update server')
      }
    }
  }

  async function handleDelete(id: number) {
    setError(null)
    try {
      await api.del(`/api/plex_servers/${id}`, { csrf: true })
      await fetchServers()
    } catch {
      setError('Failed to delete server')
    }
  }

  function selectTab(next: SettingsTab) {
    setTab(next)
    onTabChange?.(next)
  }

  return (
    <div>
      <PageHeader title="Settings" onBack={onBack} />
      <SettingsTabs activeTab={tab} onSelectTab={selectTab} />

      {tab === 'account' && (
        <AccountSettingsSection
          email={email}
          emailError={emailError}
          emailServerError={emailServerError}
          emailSuccess={emailSuccess}
          emailSaving={emailSaving}
          onEmailChange={handleEmailChange}
          onEmailBlur={handleEmailBlur}
          onEmailSubmit={handleEmailSubmit}
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          passwordError={passwordError}
          passwordSuccess={passwordSuccess}
          passwordSaving={passwordSaving}
          onNewPasswordChange={(value) => { setNewPassword(value); setPasswordSuccess(false) }}
          onConfirmPasswordChange={(value) => { setConfirmPassword(value); setPasswordSuccess(false) }}
          onPasswordSubmit={handlePasswordSubmit}
        />
      )}

      {tab === 'preferences' && (
        <PreferenceSettingsSection
          downloadImages={downloadImages}
          saving={downloadImagesSaving}
          onChange={handleDownloadImagesChange}
        />
      )}

      {tab === 'servers' && (
        <ServerSettingsSection
          error={error}
          loading={loading}
          servers={servers}
          editingId={editingId}
          editState={editState}
          newServer={newServer}
          addingNew={addingNew}
          fetchingName={fetchingName}
          onEditStateChange={(patch) => setEditState((state) => ({ ...state, ...patch }))}
          onNewServerChange={(patch) => setNewServer((state) => ({ ...state, ...patch }))}
          onCreate={handleCreate}
          onStartEdit={startEdit}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onCancelEdit={() => setEditingId(null)}
          onToggleAddNew={setAddingNew}
          onFetchNameFromNewServerUrl={(url) => fetchName(url, newServer.token)}
          onFetchNameFromNewServerToken={(token) => fetchName(newServer.url, token)}
        />
      )}
    </div>
  )
}
