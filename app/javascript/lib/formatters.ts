export function formatSize(bytes: number | null): string {
  if (bytes == null) return '—'
  const gb = bytes / 1_073_741_824
  return gb >= 1 ? `${gb.toFixed(2)} GB` : `${(bytes / 1_048_576).toFixed(0)} MB`
}

export function formatBitrate(kbps: number | null): string {
  if (kbps == null) return '—'
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${kbps} kbps`
}

export function formatDate(ts: number | null): string {
  if (ts == null) return '—'
  return new Date(ts * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatFrameRate(fr: string | null): string {
  if (fr == null) return '—'
  switch (fr) {
    case 'NTSC':      return '29.97 fps (NTSC)'
    case 'NTSC Film': return '23.976 fps (NTSC Film)'
    case 'PAL':       return '25 fps (PAL)'
    case '24p':       return '24 fps'
    case '25p':       return '25 fps'
    case '30p':       return '30 fps'
    case '48p':       return '48 fps'
    case '60p':       return '60 fps'
    case '120p':      return '120 fps'
    default:          return fr
  }
}

export function formatChannels(ch: number | null): string {
  if (ch == null) return '—'
  switch (ch) {
    case 1: return '1.0 Mono'
    case 2: return '2.0 Stereo'
    case 6: return '5.1'
    case 8: return '7.1'
    default: return String(ch)
  }
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  const totalMin = Math.round(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
