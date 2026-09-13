/** Resolve a public asset path under Vite `base` (e.g. GitHub Pages project URL). */
export const asset = (path: string) =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
