import { LOCALE_OPTIONS, useI18n } from '../i18n'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()

  return (
    <div
      className="flex items-center gap-0.5 rounded-xl border border-hawk-border bg-hawk-panel/90 p-0.5"
      role="group"
      aria-label="Language"
    >
      {LOCALE_OPTIONS.map((opt) => {
        const active = locale === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            title={opt.label}
            aria-pressed={active}
            onClick={() => setLocale(opt.id)}
            className={`hawk-btn min-w-[2rem] rounded-lg px-2 py-1 text-xs font-bold tracking-wide ${
              active
                ? 'bg-hawk-blue text-white shadow-sm shadow-hawk-blue/40'
                : 'text-hawk-muted hover:text-hawk-gold'
            }`}
          >
            {opt.short}
          </button>
        )
      })}
    </div>
  )
}
