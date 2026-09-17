import { ArrowLeft } from 'lucide-react'
import { useI18n } from '../i18n'

type LeaveVariant = 'dark' | 'light' | 'locked' | 'wide'

const VARIANT_CLASS: Record<LeaveVariant, string> = {
  dark: 'hawk-btn hawk-btn-ghost mb-4 min-h-11 px-4 py-2 text-sm text-hawk-cream',
  light: 'baby-leave',
  locked: 'hawk-btn hawk-btn-ghost mt-4 w-full justify-center px-4 py-2.5 text-sm',
  wide: 'baby-leave baby-leave-wide',
}

export function GameHubLeaveButton({
  onLeave,
  variant = 'dark',
}: {
  onLeave: () => void
  variant?: LeaveVariant
}) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onLeave}
      className={VARIANT_CLASS[variant]}
      data-game-leave="hub"
      aria-label={t('gameHub.back')}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      {t('gameHub.leave')}
    </button>
  )
}
