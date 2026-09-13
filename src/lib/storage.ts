import type { Contribution, Identity } from '../types'

const IDENTITY_KEY = 'hawk-contribute:identity'
const CONTRIBUTIONS_KEY = 'hawk-contribute:contributions'

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Identity
    if (!parsed?.displayName?.trim()) return null
    return parsed
  } catch {
    return null
  }
}

export function saveIdentity(identity: Identity): void {
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity))
}

export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_KEY)
}

export function loadContributions(): Contribution[] {
  try {
    const raw = localStorage.getItem(CONTRIBUTIONS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Contribution[]
    return Array.isArray(parsed) ? parsed : []
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
