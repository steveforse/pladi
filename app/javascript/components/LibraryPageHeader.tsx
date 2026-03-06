import React from 'react'
import { Loader2 } from 'lucide-react'
import pladiLogo from '@/assets/pladi_logo.png'
import { HamburgerMenu } from '@/components/movies/HamburgerMenu'

export default function LibraryPageHeader({
  syncing,
  syncingLabel,
  refreshing,
  onLogout,
  onSettings,
  onHistory,
}: {
  syncing: boolean
  syncingLabel: React.ReactNode
  refreshing: boolean
  onLogout: () => void
  onSettings: () => void
  onHistory: () => void
}) {
  return (
    <div className="flex items-center gap-4 px-8 py-2" style={{ backgroundColor: '#1e2730' }}>
      <div className="flex items-center gap-3">
        <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
        <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
      </div>
      <div className="flex-1 flex justify-center">
        {syncing && syncingLabel}
      </div>
      {refreshing && (
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Updating...
        </span>
      )}
      <HamburgerMenu onLogout={onLogout} onSettings={onSettings} onHistory={onHistory} />
    </div>
  )
}
