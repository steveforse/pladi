import React, { useEffect, useRef, useState } from 'react'
import { Menu } from 'lucide-react'
import { getCsrfToken } from '@/lib/csrf'

export function HamburgerMenu({ onLogout, onSettings }: { onLogout: () => void; onSettings: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn px-2 py-1.5"
        aria-label="Menu"
      >
        <Menu size={18} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 z-10 bg-card border rounded-md shadow-lg py-1 min-w-36">
          <button
            onClick={() => { setOpen(false); onSettings() }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50"
          >
            Settings
          </button>
          <button
            onClick={async () => {
              setOpen(false)
              await fetch('/session', {
                method: 'DELETE',
                headers: { 'X-CSRF-Token': getCsrfToken() },
              })
              onLogout()
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
