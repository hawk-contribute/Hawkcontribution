/** Resolve a public asset path under Vite `base` (e.g. GitHub Pages project URL). */
export const asset = (path: string) => {
  const trimmed = (path ?? '').trim()
  if (!trimmed) return import.meta.env.BASE_URL
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `${import.meta.env.BASE_URL}${trimmed.replace(/^\//, '')}`
}
