/** Drop `?play=` so a refresh lands on the game hub, not a deep-linked mini-game. */
export function clearPlayQuery(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (!url.searchParams.has('play')) return
  url.searchParams.delete('play')
  const search = url.searchParams.toString()
  const next = `${url.pathname}${search ? `?${search}` : ''}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
}
