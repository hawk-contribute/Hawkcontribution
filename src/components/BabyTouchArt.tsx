import type { BabyMode, BabyPose } from '../lib/babyTouch'
import { asset } from '../lib/asset'

const NURSERY_SRC = asset('game/baby-touch/nursery.png')
const COVER_SRC = asset('game/baby-touch/cover.png')

export function BabyTouchCover() {
  return (
    <div className="baby-scene pointer-events-none relative h-full w-full overflow-hidden bg-[#f6e7c4]">
      <img
        src={COVER_SRC}
        alt=""
        className="h-full w-full object-cover object-[50%_28%] transition duration-300 group-hover:scale-105"
      />
    </div>
  )
}

export function NurseryScene({
  pose,
  mode,
  pinchSide = null,
}: {
  pose: BabyPose
  mode: BabyMode
  pinchSide?: 'left' | 'right' | null
}) {
  const anim =
    pose === 'nuzzle'
      ? 'baby-nuzzle'
      : pose === 'pout'
        ? 'baby-pout'
        : pose === 'grab'
          ? 'baby-grab'
          : pose === 'cuddle'
            ? 'baby-cuddle'
            : pose === 'tickle'
              ? 'baby-tickle'
              : pose === 'kick'
                ? 'baby-kick'
                : pose === 'crazy'
                  ? 'baby-crazy'
                  : 'baby-idle'
  const tempo = mode === 'gentle' ? 'baby-tempo-gentle' : mode === 'crazy' ? 'baby-tempo-crazy' : 'baby-tempo-funny'

  return (
    <div className={`baby-art absolute inset-0 ${anim} ${tempo}`}>
      <img src={NURSERY_SRC} alt="" className="h-full w-full object-cover object-center" draggable={false} />
      {pinchSide && (
        <>
          <span className={`baby-fx-blush baby-fx-blush-l ${pinchSide === 'left' ? 'is-hot' : ''}`} />
          <span className={`baby-fx-blush baby-fx-blush-r ${pinchSide === 'right' ? 'is-hot' : ''}`} />
        </>
      )}
      {pose === 'crazy' && <span className="baby-fx-tongue" />}
      {pose === 'nuzzle' && <span className="baby-fx-zzz">z z</span>}
      {pose === 'tickle' && <span className="baby-fx-spark">✦</span>}
    </div>
  )
}

export function BabySpeechBubble({ text }: { text: string }) {
  if (!text) return null
  return (
    <div className="baby-bubble w-full rounded-2xl border border-[#f0d7a4] bg-[#fffaf0] px-4 py-3 text-center text-sm font-semibold leading-snug text-[#6b4a32] shadow-[0_8px_20px_rgba(140,90,40,0.12)] sm:text-base">
      {text}
    </div>
  )
}
