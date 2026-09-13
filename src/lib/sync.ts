const CHANNEL = 'hawk-contribute-sync'

type Listener = () => void

let channel: BroadcastChannel | null = null
const listeners = new Set<Listener>()

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = () => {
      listeners.forEach((l) => l())
    }
  }
  return channel
}

/** Notify other tabs that localStorage social data changed */
export function broadcastStoreUpdate(): void {
  try {
    getChannel()?.postMessage({ type: 'store-updated', at: Date.now() })
  } catch {
    /* ignore */
  }
  // Same-tab listeners (storage event does not fire in same document)
  listeners.forEach((l) => l())
}

export function subscribeStoreUpdates(listener: Listener): () => void {
  getChannel()
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key.startsWith('hawk-contribute:')) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}
