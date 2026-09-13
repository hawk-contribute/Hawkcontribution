import type { Contribution, Session } from '../types'

const SESSION_KEY = 'hawk-contribute:session'
const CONTRIBUTIONS_KEY = 'hawk-contribute:contributions'
/** Legacy identity key — migrate once if present */
const LEGACY_IDENTITY_KEY = 'hawk-contribute:identity'

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Session
      if (parsed?.email?.trim() && parsed?.displayName?.trim()) return parsed
    }
    // One-time soft migrate from old identity shape
    const legacy = localStorage.getItem(LEGACY_IDENTITY_KEY)
    if (legacy) {
      const id = JSON.parse(legacy) as { displayName?: string; email?: string }
      if (id.email?.trim() && id.displayName?.trim()) {
        const session: Session = {
          email: id.email.trim(),
          displayName: id.displayName.trim(),
          signedInAt: new Date().toISOString(),
        }
        saveSession(session)
        localStorage.removeItem(LEGACY_IDENTITY_KEY)
        return session
      }
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(LEGACY_IDENTITY_KEY)
}

export function loadContributions(): Contribution[] {
  try {
    const raw = localStorage.getItem(CONTRIBUTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Contribution[]
    if (!Array.isArray(parsed)) return []
    // Normalize older ledger entries that lacked category/files/email
    return parsed.map((c) => ({
      ...c,
      category: c.category ?? (c as { opportunityType?: Contribution['category'] }).opportunityType ?? 'content',
      files: Array.isArray(c.files) ? c.files : [],
      participantEmail: c.participantEmail ?? '',
      opportunityTitle: c.opportunityTitle ?? '',
    }))
  } catch {
    return []
  }
}

export function saveContributions(items: Contribution[]): void {
  localStorage.setItem(CONTRIBUTIONS_KEY, JSON.stringify(items))
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
}
