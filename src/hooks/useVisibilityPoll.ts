import { useEffect } from 'react'

/**
 * Poll `tick` every `ms` while the document is visible.
 * Clears the interval when `document.hidden`; on return to visible,
 * immediately refreshes and restarts the interval. Also refreshes on window focus.
 * Cleanup on unmount (no poll when the consuming hook/view is not mounted).
 */
export function useVisibilityPoll(
  tick: () => void,
  ms: number,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return

    let id: number | null = null

    const clear = () => {
      if (id != null) {
        window.clearInterval(id)
        id = null
      }
    }

    const start = () => {
      clear()
      if (document.hidden) return
      id = window.setInterval(() => {
        if (!document.hidden) tick()
      }, ms)
    }

    const onVis = () => {
      if (document.hidden) {
        clear()
        return
      }
      tick()
      start()
    }

    const onFocus = () => {
      if (!document.hidden) tick()
    }

    start()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)

    return () => {
      clear()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
    }
  }, [tick, ms, enabled])
}
