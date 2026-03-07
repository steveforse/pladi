import React, { useEffect, useRef, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import DatePicker from '@/components/ui/date-picker'

interface Props {
  value: string | string[] | null
  fieldType: 'text' | 'number' | 'date' | 'tags'
  onSave: (newValue: string | string[]) => Promise<void>
  renderView: () => React.ReactNode
  className?: string
}

export function EditableCell({ value, fieldType, onSave, renderView, className }: Props) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEditing() {
    if (fieldType === 'tags') {
      setTags(Array.isArray(value) ? [...value] : (value ? value.split(', ').filter(Boolean) : []))
      setTagInput('')
    } else {
      setEditValue(Array.isArray(value) ? value.join(', ') : (value ?? ''))
    }
    setError(null)
    setEditing(true)
  }

  useEffect(() => {
    if (editing && fieldType !== 'tags') {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing, fieldType])

  async function handleSave() {
    if (!editing || saving) return

    let newValue: string | string[]
    if (fieldType === 'tags') {
      const finalTags = tagInput.trim() ? [...tags, tagInput.trim()] : tags
      const originalTags = Array.isArray(value) ? value : (value ? value.split(', ').filter(Boolean) : [])
      const unchanged = finalTags.length === originalTags.length && finalTags.every((t, i) => t === originalTags[i])
      if (unchanged) { setEditing(false); return }
      newValue = finalTags
    } else {
      const originalScalar = Array.isArray(value) ? value.join(', ') : (value ?? '')
      if (editValue === originalScalar) { setEditing(false); return }
      newValue = editValue
    }

    setSaving(true)
    try {
      await onSave(newValue)
      setEditing(false)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveScalar(nextValue: string) {
    if (saving) return
    const originalScalar = Array.isArray(value) ? value.join(', ') : (value ?? '')
    if (nextValue === originalScalar) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      await onSave(nextValue)
      setEditing(false)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setEditing(false)
    setError(null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(/,$/, '')
      if (val && !tags.includes(val)) setTags([...tags, val])
      setTagInput('')
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  if (!editing) {
    return (
      <td
        className={`${className ?? ''} cursor-text relative`}
        onDoubleClick={startEditing}
        title={error ? `Error: ${error}` : undefined}
      >
        {renderView()}
        {error && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive" />}
      </td>
    )
  }

  if (fieldType === 'tags') {
    return (
      <td className={`${className ?? ''} ring-1 ring-primary p-1`}>
        <div
          className="flex flex-wrap gap-1 min-w-[120px] items-center"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) handleSave()
          }}
        >
          {tags.map((tag) => (
            <span key={tag} className="bg-muted text-xs rounded-full px-2 py-0.5 flex items-center gap-1">
              {tag}
              <button
                type="button"
                className="hover:text-destructive"
                onMouseDown={(e) => { e.preventDefault(); removeTag(tag) }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          {saving ? (
            <Loader2 size={12} className="animate-spin text-muted-foreground" />
          ) : (
            <input
              ref={inputRef}
              autoFocus
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagInputKeyDown}
              className="bg-transparent outline-none text-xs min-w-[60px] flex-1"
              placeholder="Add tag…"
            />
          )}
        </div>
        {error && <p className="text-destructive text-xs mt-0.5">{error}</p>}
      </td>
    )
  }

  return (
    <td className={`${className ?? ''} ring-1 ring-primary p-1`}>
      {saving ? (
        <div className="flex items-center gap-1">
          <span className="text-xs">{editValue}</span>
          <Loader2 size={12} className="animate-spin text-muted-foreground" />
        </div>
      ) : fieldType === 'date' ? (
        <div className="flex items-center gap-1">
          <DatePicker
            value={editValue}
            onChange={(nextValue) => {
              setEditValue(nextValue)
              void handleSaveScalar(nextValue)
            }}
            defaultOpen
            allowClear
            buttonClassName="h-8 min-w-[172px] justify-start bg-transparent text-xs"
          />
          <button
            type="button"
            onClick={handleCancel}
            className="btn px-2 py-1 text-xs"
          >
            Cancel
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type={fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="bg-transparent outline-none text-xs w-full min-w-[80px]"
        />
      )}
      {error && <p className="text-destructive text-xs mt-0.5">{error}</p>}
    </td>
  )
}
