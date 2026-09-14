import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { CheckCircle2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import { useI18n } from '../i18n'
import { getTurnstileSiteKey } from '../lib/humanVerify'

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string
          callback: (token: string) => void
          'error-callback'?: () => void
          'expired-callback'?: () => void
          theme?: 'dark' | 'light' | 'auto'
        },
      ) => string
      remove: (widgetId: string) => void
      reset: (widgetId?: string) => void
    }
    onHawkTurnstileLoad?: () => void
  }
}

type Challenge = { a: number; b: number }

function newChallenge(): Challenge {
  return {
    a: 1 + Math.floor(Math.random() * 9),
    b: 1 + Math.floor(Math.random() * 9),
  }
}

/** Minimum time (ms) before submit is accepted — simple timing friction. */
const MIN_INTERACT_MS = 1200

interface HumanVerifyProps {
  verified: boolean
  remainingMs: number
  onPassed: () => void
  onReset?: () => void
}

export function HumanVerify({
  verified,
  remainingMs,
  onPassed,
  onReset,
}: HumanVerifyProps) {
  const { t } = useI18n()
  const turnstileKey = getTurnstileSiteKey()
  const formId = useId()

  const [challenge, setChallenge] = useState<Challenge>(() => newChallenge())
  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [status, setStatus] = useState<'idle' | 'fail' | 'pass'>(
    verified ? 'pass' : 'idle',
  )
  const [ready, setReady] = useState(false)
  const mountedAt = useRef(Date.now())
  const turnstileHost = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)

  useEffect(() => {
    if (verified) {
      setStatus('pass')
      return
    }
    setStatus('idle')
  }, [verified])

  useEffect(() => {
    mountedAt.current = Date.now()
    setReady(false)
    const id = window.setTimeout(() => setReady(true), MIN_INTERACT_MS)
    return () => window.clearTimeout(id)
  }, [challenge])

  const resetLocal = useCallback(() => {
    setChallenge(newChallenge())
    setAnswer('')
    setChecked(false)
    setStatus('idle')
    mountedAt.current = Date.now()
    setReady(false)
    onReset?.()
  }, [onReset])

  // Optional Cloudflare Turnstile
  useEffect(() => {
    if (!turnstileKey || verified) return
    let cancelled = false

    const renderWidget = () => {
      if (cancelled || !turnstileHost.current || !window.turnstile) return
      if (widgetId.current) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* ignore */
        }
        widgetId.current = null
      }
      widgetId.current = window.turnstile.render(turnstileHost.current, {
        sitekey: turnstileKey,
        theme: 'dark',
        callback: () => {
          setStatus('pass')
          onPassed()
        },
        'error-callback': () => setStatus('fail'),
        'expired-callback': () => {
          setStatus('idle')
          onReset?.()
        },
      })
    }

    const existing = document.querySelector(
      'script[data-hawk-turnstile]',
    ) as HTMLScriptElement | null
    if (window.turnstile) {
      renderWidget()
    } else if (existing) {
      window.onHawkTurnstileLoad = renderWidget
    } else {
      window.onHawkTurnstileLoad = renderWidget
      const script = document.createElement('script')
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onHawkTurnstileLoad'
      script.async = true
      script.defer = true
      script.dataset.hawkTurnstile = '1'
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current)
        } catch {
          /* ignore */
        }
        widgetId.current = null
      }
    }
  }, [turnstileKey, verified, onPassed, onReset])

  const submitBuiltIn = (e: FormEvent) => {
    e.preventDefault()
    if (!ready || Date.now() - mountedAt.current < MIN_INTERACT_MS) {
      setStatus('fail')
      return
    }
    if (!checked) {
      setStatus('fail')
      return
    }
    const n = Number(answer.trim())
    if (!Number.isFinite(n) || n !== challenge.a + challenge.b) {
      setStatus('fail')
      setChallenge(newChallenge())
      setAnswer('')
      setChecked(false)
      return
    }
    setStatus('pass')
    onPassed()
  }

  const minsLeft = Math.max(1, Math.ceil(remainingMs / 60_000))

  return (
    <div className="hawk-card mb-6 border border-hawk-border/80 p-5">
      <div className="flex flex-wrap items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-hawk-gold" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wide text-hawk-gold">
            {t('verify.title')}
          </h2>
          <p className="mt-1 text-xs text-hawk-muted">{t('verify.hint')}</p>
          <p className="mt-1 text-[11px] text-hawk-muted/80">
            {t('verify.clientNote')}
          </p>

          {verified || status === 'pass' ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-hawk-gold">
              <CheckCircle2 className="h-4 w-4" />
              <span>{t('verify.pass')}</span>
              {remainingMs > 0 && (
                <span className="text-xs text-hawk-muted">
                  {t('verify.expiresIn', { n: String(minsLeft) })}
                </span>
              )}
              <button
                type="button"
                className="hawk-btn hawk-btn-ghost ml-auto px-2 py-1 text-[11px]"
                onClick={resetLocal}
              >
                <RefreshCw className="h-3 w-3" />
                {t('verify.retry')}
              </button>
            </div>
          ) : turnstileKey ? (
            <div className="mt-3">
              <div ref={turnstileHost} />
              {status === 'fail' && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
                  <XCircle className="h-3.5 w-3.5" />
                  {t('verify.fail')}
                </p>
              )}
            </div>
          ) : (
            <form className="mt-3 space-y-3" onSubmit={submitBuiltIn}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-hawk-cream">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-hawk-border accent-hawk-gold"
                  checked={checked}
                  onChange={(e) => {
                    setChecked(e.target.checked)
                    if (status === 'fail') setStatus('idle')
                  }}
                />
                {t('verify.checkbox')}
              </label>

              <label
                className="block text-left text-xs text-hawk-muted"
                htmlFor={`${formId}-math`}
              >
                {t('verify.mathPrompt', {
                  a: String(challenge.a),
                  b: String(challenge.b),
                })}
                <input
                  id={`${formId}-math`}
                  inputMode="numeric"
                  autoComplete="off"
                  className="hawk-input mt-1 w-full max-w-[10rem]"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value)
                    if (status === 'fail') setStatus('idle')
                  }}
                  placeholder="?"
                />
              </label>

              {!ready && (
                <p className="text-[11px] text-hawk-muted">{t('verify.wait')}</p>
              )}

              {status === 'fail' && (
                <p className="flex items-center gap-1.5 text-xs text-red-300">
                  <XCircle className="h-3.5 w-3.5" />
                  {t('verify.fail')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={!ready}
                  className="hawk-btn hawk-btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {t('verify.submit')}
                </button>
                <button
                  type="button"
                  className="hawk-btn hawk-btn-ghost px-3 py-2 text-sm"
                  onClick={resetLocal}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('verify.retry')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
