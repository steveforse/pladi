import React from 'react'
import type { ActiveFilter, FilterFieldId, FilterOp } from '@/lib/types'
import { FILTER_FIELD_GROUPS, FILTER_FIELDS, STRING_OPS, NUMERIC_OPS, NULL_OPS, defaultOp } from '@/lib/filters'

export function FilterRow({
  filter,
  onChange,
  onRemove,
}: {
  filter: ActiveFilter
  onChange: (updated: ActiveFilter) => void
  onRemove: () => void
}) {
  const fieldDef = FILTER_FIELDS.find((f) => f.id === filter.field)!
  const typeOps = fieldDef.type === 'string' ? STRING_OPS : NUMERIC_OPS
  const isNullOp = filter.op === 'present' || filter.op === 'missing'

  function handleFieldChange(newField: FilterFieldId) {
    const newDef = FILTER_FIELDS.find((f) => f.id === newField)!
    let newOp: FilterOp
    if (newDef.nullOnly) newOp = 'present'
    else if (isNullOp) newOp = filter.op
    else newOp = defaultOp(newDef.type)
    onChange({ ...filter, field: newField, op: newOp, value: '' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filter.field}
        onChange={(e) => handleFieldChange(e.target.value as FilterFieldId)}
        className="border rounded px-2 py-1 text-sm bg-background"
      >
        {FILTER_FIELD_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.fields.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      <select
        value={filter.op}
        onChange={(e) => onChange({ ...filter, op: e.target.value as FilterOp, value: '' })}
        className="border rounded px-2 py-1 text-sm bg-background"
      >
        {!fieldDef.nullOnly && typeOps.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
        {!fieldDef.nullOnly && <optgroup label="—" />}
        {NULL_OPS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>

      {!isNullOp && (
        <div className="flex items-center gap-1">
          <input
            type={fieldDef.type === 'numeric' ? 'number' : fieldDef.type === 'date' ? 'date' : 'text'}
            value={filter.value}
            onChange={(e) => onChange({ ...filter, value: e.target.value })}
            placeholder="value"
            className="border rounded px-2 py-1 text-sm bg-background w-32"
          />
          {fieldDef.unit && (
            <span className="text-xs text-muted-foreground">{fieldDef.unit}</span>
          )}
        </div>
      )}

      <button
        onClick={onRemove}
        className="btn px-2 py-0.5 text-sm text-muted-foreground hover:text-destructive"
        aria-label="Remove filter"
      >
        ✕
      </button>
    </div>
  )
}
