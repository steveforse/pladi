import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Movie } from '@/lib/types'

type TagField = 'genres' | 'directors' | 'writers' | 'producers' | 'collections' | 'labels' | 'country'

const TAG_FIELDS: { field: TagField; label: string }[] = [
  { field: 'genres', label: 'Genres' },
  { field: 'directors', label: 'Directors' },
  { field: 'writers', label: 'Writers' },
  { field: 'producers', label: 'Producers' },
  { field: 'collections', label: 'Collections' },
  { field: 'labels', label: 'Labels' },
  { field: 'country', label: 'Country' },
]

interface BulkEditModalProps {
  selectedItems: Movie[]
  onSave: (tagValues: Partial<Record<TagField, string[]>>, mode: 'append' | 'replace') => Promise<void>
  onClose: () => void
  tagFields?: Array<{ field: TagField; label: string }>
  mediaLabelSingular?: string
  mediaLabelPlural?: string
}

function TagInput({
  tags,
  inputValue,
  onAddTag,
  onRemoveTag,
  onInputChange,
}: {
  tags: string[]
  inputValue: string
  onAddTag: (tag: string) => void
  onRemoveTag: (index: number) => void
  onInputChange: (value: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const trimmed = inputValue.trim().replace(/,$/, '')
      if (trimmed) { onAddTag(trimmed); onInputChange('') }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onRemoveTag(tags.length - 1)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val.includes(',')) {
      const parts = val.split(',').map((s) => s.trim()).filter(Boolean)
      if (parts.length > 0) {
        parts.forEach((p) => onAddTag(p))
        onInputChange('')
      }
    } else {
      onInputChange(val)
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1 items-center min-h-[2rem] px-2 py-1 border rounded bg-background cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary">
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemoveTag(i) }}
            className="hover:text-primary/60 ml-0.5"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="flex-1 min-w-[6rem] bg-transparent outline-none text-sm"
        placeholder={tags.length === 0 ? 'Type and press Enter…' : ''}
      />
    </div>
  )
}

export function BulkEditModal({
  selectedItems,
  onSave,
  onClose,
  tagFields = TAG_FIELDS,
  mediaLabelSingular = 'movie',
  mediaLabelPlural = 'movies',
}: BulkEditModalProps) {
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [tags, setTags] = useState<Record<TagField, string[]>>({
    genres: [], directors: [], writers: [], producers: [], collections: [], labels: [], country: [],
  })
  const [tagInputs, setTagInputs] = useState<Record<TagField, string>>({
    genres: '', directors: '', writers: '', producers: '', collections: '', labels: '', country: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function addTag(field: TagField, tag: string) {
    setTags((prev) => ({ ...prev, [field]: [...prev[field], tag] }))
  }

  function removeTag(field: TagField, index: number) {
    setTags((prev) => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }))
  }

  function setInput(field: TagField, value: string) {
    setTagInputs((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const patch: Partial<Record<TagField, string[]>> = {}
    for (const { field } of tagFields) {
      if (tags[field].length > 0) patch[field] = tags[field]
    }
    if (Object.keys(patch).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(patch, mode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setSaving(false)
    }
  }

  const n = selectedItems.length

  return createPortal(
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background border rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">Bulk Edit ({n} {n === 1 ? mediaLabelSingular : mediaLabelPlural})</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-4">
            {/* Mode */}
            <div className="space-y-1">
              <p className="text-sm font-medium">Mode</p>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="mode" value="append" checked={mode === 'append'} onChange={() => setMode('append')} />
                  Append
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="mode" value="replace" checked={mode === 'replace'} onChange={() => setMode('replace')} />
                  Replace
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'append'
                  ? 'Append merges new tags with existing values.'
                  : 'Replace overwrites existing values entirely.'}
              </p>
            </div>

            {/* Tag fields */}
            <div className="space-y-3">
              {tagFields.map(({ field, label }) => (
                <div key={field} className="space-y-1">
                  <label className="text-sm font-medium">{label}</label>
                  <TagInput
                    tags={tags[field]}
                    inputValue={tagInputs[field]}
                    onAddTag={(tag) => addTag(field, tag)}
                    onRemoveTag={(i) => removeTag(field, i)}
                    onInputChange={(v) => setInput(field, v)}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">Fields left empty are not changed.</p>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t">
            <button type="button" onClick={onClose} className="btn px-3 py-1.5 text-sm" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn px-3 py-1.5 text-sm" disabled={saving}>
              {saving ? 'Applying…' : `Apply to ${n} ${n === 1 ? mediaLabelSingular : mediaLabelPlural}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
