import React from 'react'
import pladiLogo from '@/assets/pladi_logo.png'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'

export default function PageHeader({
  title,
  onBack,
  backLabel = 'Back',
  onLogout,
  onSettings,
  onHistory,
}: {
  title: string
  onBack: () => void
  backLabel?: string
  onLogout?: () => void
  onSettings?: () => void
  onHistory?: () => void
}) {
  const showMenu = Boolean(onLogout && onSettings && onHistory)

  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 px-8 py-3" style={{ backgroundColor: '#1e2730' }}>
      <div className="flex items-center gap-3">
        <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
        <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
      </div>
      <div className="justify-self-center text-center">
        <h2 className="text-xl font-semibold tracking-[0.06em] md:text-[1.35rem]" style={{ color: '#E5A00D' }}>
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-self-end gap-2">
        <button onClick={onBack} className="btn px-3 py-1.5 text-sm">
          ← {backLabel}
        </button>
        {showMenu ? <HamburgerMenu onLogout={onLogout!} onSettings={onSettings!} onHistory={onHistory!} /> : null}
      </div>
    </div>
  )
}
