import React from 'react'
import pladiLogo from '@/assets/pladi_logo.png'

export default function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2" style={{ backgroundColor: '#1e2730' }}>
      <div className="flex items-center gap-3">
        <img src={pladiLogo} alt="Pladi logo" className="h-10 w-auto" />
        <h1 className="text-2xl font-bold" style={{ color: '#E5A00D' }}>PLADI</h1>
      </div>
      <span className="text-muted-foreground text-sm ml-2">/ {title}</span>
      <div className="flex-1" />
      <button onClick={onBack} className="btn px-3 py-1.5 text-sm">
        ← Back
      </button>
    </div>
  )
}
