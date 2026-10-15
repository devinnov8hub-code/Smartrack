import type { BatteryReading } from '../types'

/** A rider can't start a trip below this level unless the phone is charging. */
export const MIN_START_BATTERY = 30

interface BatteryManager {
  level: number
  charging: boolean
}

/** Resolves to null where the Battery Status API is missing (iOS, Firefox). */
export async function readBattery(): Promise<BatteryReading | null> {
  const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> }
  if (!nav.getBattery) return null
  try {
    const battery = await nav.getBattery()
    return { level: Math.round(battery.level * 100), charging: battery.charging }
  } catch {
    return null
  }
}
