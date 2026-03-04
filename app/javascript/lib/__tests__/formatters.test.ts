import { describe, expect, it } from 'vitest'
import {
  formatBitrate,
  formatChannels,
  formatDate,
  formatDuration,
  formatFrameRate,
  formatISODate,
  formatResolution,
  formatSize,
} from '@/lib/formatters'

describe('formatters', () => {
  it('formats size and bitrate', () => {
    expect(formatSize(null)).toBe('—')
    expect(formatSize(512 * 1024 * 1024)).toBe('512 MB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GB')

    expect(formatBitrate(null)).toBe('—')
    expect(formatBitrate(900)).toBe('900 kbps')
    expect(formatBitrate(1500)).toBe('1.5 Mbps')
  })

  it('formats date and iso date', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(1704067200)).toMatch(/2024/)

    expect(formatISODate(null)).toBe('—')
    expect(formatISODate('not-a-date')).toBe('—')
    expect(formatISODate('2024-01-01')).toMatch(/2024/)
  })

  it('formats frame rate, channels, resolution and duration', () => {
    expect(formatFrameRate(null)).toBe('—')
    expect(formatFrameRate('NTSC')).toBe('29.97 fps (NTSC)')
    expect(formatFrameRate('custom')).toBe('custom')

    expect(formatChannels(null)).toBe('—')
    expect(formatChannels(2)).toBe('2.0 Stereo')
    expect(formatChannels(10)).toBe('10')

    expect(formatResolution(null)).toBe('—')
    expect(formatResolution('sd')).toBe('SD')
    expect(formatResolution('4k')).toBe('4k')

    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(30 * 60_000)).toBe('30m')
    expect(formatDuration(90 * 60_000)).toBe('1h 30m')
  })
})
