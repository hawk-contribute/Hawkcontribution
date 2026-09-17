import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function requireSupabaseBuildEnv(mode: string) {
  const fileEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const url = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY
  if (!url?.trim() || !anonKey?.trim()) {
    throw new Error(
      '[hawk-contribute] Production builds require VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Pass them as env vars for `npm run build` (do not commit keys). For GitHub Pages, add them as Actions secrets so deploys cannot ship an empty Auth client.',
    )
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    requireSupabaseBuildEnv(mode)
  }

  return {
    base: '/Hawkcontribution/',
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      port: 5173,
    },
  }
})
