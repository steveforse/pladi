import React from 'react'
import pladiLogo from '@/assets/pladi_logo.png'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'

export default function ShowsTable({
  onMovies,
  onLogout,
  onSettings,
  onHistory,
}: {
  onMovies: () => void
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
        <div className="flex items-center gap-3">
          <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
          <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
        </div>
        <div className="flex-1 flex justify-center">
          <button onClick={onMovies} className="btn px-3 py-1.5 text-sm">
            Switch to Movies
          </button>
        </div>
        <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
      </div>

      <div className="px-8 py-6">
        <h2 className="text-xl font-semibold mb-2">TV Shows</h2>
        <p className="text-muted-foreground text-sm">
          TV library browsing is now scaffolded and will be implemented next.
        </p>
      </div>
    </div>
  )
}
