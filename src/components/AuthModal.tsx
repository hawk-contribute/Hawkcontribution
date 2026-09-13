import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { isValidEmail } from '../lib/storage'
import { loadPendingAuthEmail } from '../hooks/useSession'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onRequestLink: (input: {
    email: string
    displayName?: string
  }) => Promise<void>
  onVerifyOtp: (input: { email: string; token: string }) => Promise<void>
}

function classifyAuthError(msg: string, t: (k: string) => string): string {
  const m = msg.toLowerCase()
  if (m.includes('rate') || m.includes('security') || m.includes('over_email')) {
    return t('auth.rateLimited')
  }
  if (
    m.includes('expired') ||
    m.includes('otp_expired') ||
    m.includes('invalid_otp') ||
    m.includes('invalid otp') ||
    m.includes('token has expired') ||
    m.includes('invalid_otp') ||
    m.includes('invalid_token') ||
    m.includes('invalid_otp') ||
    msg === 'INVALID_OTP' ||
    m.includes('otp_disabled')
  ) {
    if (m.includes('expired')) return t('auth.otpExpired')
    return t('auth.otpInvalid')
  }
  if (m.includes('email') && (m.includes('invalid') || m.includes('not'))) {
    return t('auth.emailRequired')
  }
  return t('auth.otpFailed')
}

export function AuthModal({
  open,
  onClose,
  onRequestLink,
  onVerifyOtp,
}: AuthModalProps) {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const otpRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      const pending = loadPendingAuthEmail()
      setEmail(pending ?? '')
      setDisplayName('')
      setOtp('')
      setError('')
      setSending(false)
      setVerifying(false)
      setSentTo(pending)
    }
  }, [open])

  useEffect(() => {
    if (sentTo) {
      const id = window.setTimeout(() => otpRef.current?.focus(), 50)
      return () => window.clearTimeout(id)
    }
  }, [sentTo])

  if (!open) return null

  const sendCode = async (opts?: { resend?: boolean }) => {
    const target = (opts?.resend ? sentTo || email : email).trim()
    if (!isValidEmail(target)) {
      setError(t('auth.emailRequired'))
      return
    }
    setError('')
    setSending(true)
    try {
      await onRequestLink({
        email: target,
        displayName: displayName.trim() || undefined,
      })
      setSentTo(target)
      setOtp('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(
        msg.toLowerCase().includes('rate') ||
          msg.toLowerCase().includes('security')
          ? t('auth.rateLimited')
          : t('auth.sendFailed'),
      )
    } finally {
      setSending(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await sendCode()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const target = (sentTo || email).trim()
    const token = otp.replace(/\D/g, '').trim()
    if (!isValidEmail(target)) {
      setError(t('auth.emailRequired'))
      return
    }
    if (!/^\d{6,8}$/.test(token)) {
      setError(t('auth.otpRequired'))
      return
    }
    setError('')
    setVerifying(true)
    try {
      await onVerifyOtp({ email: target, token })
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(classifyAuthError(msg, t))
    } finally {
      setVerifying(false)
    }
  }

  const onOtpChange = (raw: string) => {
    // Paste-friendly: strip spaces/dashes from Outlook/Safari pastes
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    setOtp(digits)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t('auth.close')}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-hawk-border bg-hawk-panel p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-hawk-cream">{t('auth.title')}</h2>
            <p className="mt-1 text-sm text-hawk-muted">
              {sentTo ? t('auth.otpStepHint') : t('auth.hint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-hawk-muted hover:bg-white/5 hover:text-hawk-cream"
            aria-label={t('auth.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {sentTo ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="rounded-xl border border-hawk-gold/40 bg-hawk-gold/10 px-4 py-3 text-sm text-hawk-cream">
              {t('auth.checkInboxCode', { email: sentTo })}
            </p>
            <p className="text-xs text-hawk-muted">{t('auth.outlookHint')}</p>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-hawk-cream">
                {t('auth.otpLabel')}
              </span>
              <input
                ref={otpRef}
                className="hawk-input w-full py-3 text-center text-2xl font-semibold tracking-[0.35em] text-hawk-cream"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                maxLength={8}
                value={otp}
                onChange={(e) => onOtpChange(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault()
                  onOtpChange(e.clipboardData.getData('text'))
                }}
                placeholder={t('auth.otpPlaceholder')}
                disabled={verifying}
              />
            </label>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              className="hawk-btn hawk-btn-primary w-full px-4 py-3 text-base"
              disabled={verifying || sending || otp.length < 6}
            >
              {verifying ? t('auth.verifying') : t('auth.otpSubmit')}
            </button>

            <button
              type="button"
              className="hawk-btn w-full border border-hawk-border bg-transparent px-4 py-2.5 text-sm text-hawk-cream hover:bg-white/5"
              disabled={sending || verifying}
              onClick={() => void sendCode({ resend: true })}
            >
              {sending ? t('auth.sending') : t('auth.resend')}
            </button>

            <p className="text-xs text-hawk-muted">{t('auth.linkSecondaryNote')}</p>
            <p className="text-xs text-hawk-muted">{t('auth.rateNote')}</p>

            <button
              type="button"
              className="w-full text-center text-xs text-hawk-muted underline-offset-2 hover:text-hawk-cream hover:underline"
              onClick={() => {
                setSentTo(null)
                setOtp('')
                setError('')
              }}
            >
              {t('auth.useDifferentEmail')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                {t('auth.email')} <span className="text-hawk-gold">*</span>
              </span>
              <input
                className="hawk-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.emailPlaceholder')}
                autoFocus
                disabled={sending}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-hawk-cream">
                {t('auth.name')}
              </span>
              <input
                className="hawk-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
                disabled={sending}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <p className="text-xs text-hawk-muted">{t('auth.outlookHint')}</p>
            <p className="text-xs text-hawk-muted">{t('auth.rateNote')}</p>
            <button
              type="submit"
              className="hawk-btn hawk-btn-primary w-full px-4 py-2.5"
              disabled={sending}
            >
              {sending ? t('auth.sending') : t('auth.submit')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
