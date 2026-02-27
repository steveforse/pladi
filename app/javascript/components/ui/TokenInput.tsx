import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function TokenInput({ value, onChange, onBlur, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  onBlur?: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative flex items-center">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur?.(e.target.value)}
        placeholder={placeholder}
        className={`pr-8 ${className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
        aria-label={visible ? 'Hide token' : 'Show token'}
      >
        {visible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}
