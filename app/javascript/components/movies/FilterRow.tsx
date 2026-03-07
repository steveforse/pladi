import React from 'react'
import type { ActiveFilter, FilterFieldDef, FilterFieldId, FilterGroup, FilterOp } from '@/lib/types'
import { FILTER_FIELDS, STRING_OPS, NUMERIC_OPS, NULL_OPS, defaultOp } from '@/lib/filters'
import { FieldPicker } from './FieldPicker'
import DatePicker from '@/components/ui/date-picker'
import { Select } from '@/components/ui/select'

export function FilterRow({
  filter,
  onChange,
  onRemove,
  fieldDefs = FILTER_FIELDS,
  fieldGroups,
}: {
  filter: ActiveFilter
  onChange: (updated: ActiveFilter) => void
  onRemove: () => void
  fieldDefs?: FilterFieldDef[]
  fieldGroups?: FilterGroup[]
}) {
  const fieldDef = fieldDefs.find((f) => f.id === filter.field)
  if (!fieldDef) return null
  const typeOps = fieldDef.type === 'string' ? STRING_OPS : NUMERIC_OPS
  const isNullOp = filter.op === 'present' || filter.op === 'missing'

  function handleFieldChange(newField: FilterFieldId) {
    const newDef = fieldDefs.find((f) => f.id === newField)
    if (!newDef) return
    let newOp: FilterOp
    if (newDef.nullOnly) newOp = 'present'
    else if (isNullOp) newOp = filter.op
    else newOp = defaultOp(newDef.type)
    onChange({ ...filter, field: newField, op: newOp, value: '' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <FieldPicker value={filter.field} onChange={handleFieldChange} fieldDefs={fieldDefs} fieldGroups={fieldGroups} />

      <Select
        value={filter.op}
        onValueChange={(value) => onChange({ ...filter, op: value as FilterOp, value: '' })}
        className="px-2 min-w-28"
      >
        {!fieldDef.nullOnly && typeOps.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
        {!fieldDef.nullOnly && <optgroup label="—" />}
        {NULL_OPS.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </Select>

      {!isNullOp && (
        <div className="flex items-center gap-1">
          {fieldDef.type === 'date' ? (
            <DatePicker
              value={filter.value}
              onChange={(value) => onChange({ ...filter, value })}
              placeholder="Pick a date"
              allowClear
              buttonClassName="h-9 min-w-[176px] justify-start text-sm"
            />
          ) : (
            <input
              type={fieldDef.type === 'numeric' ? 'number' : 'text'}
              value={filter.value}
              onChange={(e) => onChange({ ...filter, value: e.target.value })}
              placeholder="value"
              className="border rounded px-2 py-1 text-sm bg-background w-32"
            />
          )}
          {fieldDef.unit && (
            <span className="text-xs text-muted-foreground">{fieldDef.unit}</span>
          )}
        </div>
      )}

      <button
        onClick={onRemove}
        className="btn h-9 px-3 text-sm text-destructive"
        aria-label="Remove filter"
      >
        ✕
      </button>
    </div>
  )
}
