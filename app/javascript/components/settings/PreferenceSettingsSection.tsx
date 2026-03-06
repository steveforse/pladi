import React from 'react'

export default function PreferenceSettingsSection({
  downloadImages,
  saving,
  onChange,
}: {
  downloadImages: boolean
  saving: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className="px-8 py-6 space-y-6 max-w-2xl mx-auto">
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={downloadImages}
            onChange={(event) => onChange(event.target.checked)}
            disabled={saving}
          />
          <span className="text-sm">Download images from Plex server</span>
        </label>
        <p className="text-xs text-muted-foreground">
          When enabled, poster and background art are fetched and displayed in the table. Disabled by default to avoid unnecessary bandwidth usage.
        </p>
      </div>
    </div>
  )
}
