import React from 'react'
import type { SettingsTab } from '@/components/SettingsPage'

export default function SettingsTabs({
  activeTab,
  onSelectTab,
}: {
  activeTab: SettingsTab
  onSelectTab: (tab: SettingsTab) => void
}) {
  function tabClass(tab: SettingsTab) {
    const active = activeTab === tab
    return [
      'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
      active
        ? 'border-[#E5A00D] text-[#E5A00D]'
        : 'border-transparent text-muted-foreground hover:text-foreground',
    ].join(' ')
  }

  return (
    <div className="flex justify-center">
      <button className={tabClass('account')} onClick={() => onSelectTab('account')}>Account</button>
      <button className={tabClass('preferences')} onClick={() => onSelectTab('preferences')}>Preferences</button>
      <button className={tabClass('servers')} onClick={() => onSelectTab('servers')}>Servers</button>
    </div>
  )
}
