import { useEffect } from 'react'
import type { Platform } from '../../platform/api.js'
import { refusalOf } from '../../platform/refusal.js'
import { words } from '../../words.js'

/**
 * *YOUR APPS* (moments 2 and 16). Task 6 draws its heading and makes its first read, so a
 * session that ends is noticed here as anywhere; Task 7 draws the apps.
 */
export function YourApps({
  platform,
  expire,
}: {
  platform: Platform
  expire: () => void
}) {
  useEffect(() => {
    let live = true
    platform.listProjects().catch((error: unknown) => {
      if (live && refusalOf(error).kind === 'signed-out') expire()
    })
    return () => {
      live = false
    }
  }, [platform, expire])
  return <h1 className="page-title">{words.shell.yourApps}</h1>
}
