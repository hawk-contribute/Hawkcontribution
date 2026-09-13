import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

interface ToastProps {
  message: string | null
  onDone: () => void
}

export function Toast({ message, onDone }: ToastProps) {
  useEffect(() => {
    if (!message) return
    const t = window.setTimeout(onDone, 2800)
    return () => window.clearTimeout(t)
  }, [message, onDone])

  if (!message) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 px-4">
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-hawk-blue/35 bg-hawk-panel px-4 py-3 text-sm font-medium text-hawk-cream shadow-xl shadow-black/40">
        <CheckCircle2 className="h-4 w-4 text-hawk-blue-bright" />
        {message}
      </div>
    </div>
  )
}
