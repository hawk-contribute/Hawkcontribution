/**
 * Procedural game audio via Web Audio API (royalty-free).
 * Unlock on user gesture; BGM loops while a round is active.
 */

const MUTE_KEY = 'hawk-contribute:game-mute'
const VOLUME_KEY = 'hawk-contribute:game-volume'
const DEFAULT_VOLUME = 0.45

let ctx: AudioContext | null = null
let master: GainNode | null = null
let bgmGain: GainNode | null = null
let sfxGain: GainNode | null = null
let bgmTimer: number | null = null
let muted = false
let volume = DEFAULT_VOLUME
let unlocked = false

function clamp01(v: number): number {
  if (Number.isNaN(v)) return DEFAULT_VOLUME
  return Math.min(1, Math.max(0, v))
}

function loadMute(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function saveMute(value: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY)
    if (raw == null) return DEFAULT_VOLUME
    return clamp01(parseFloat(raw))
  } catch {
    return DEFAULT_VOLUME
  }
}

function saveVolume(value: number): void {
  try {
    localStorage.setItem(VOLUME_KEY, String(clamp01(value)))
  } catch {
    /* ignore */
  }
}

function applyMasterGain(): void {
  const c = ensureCtx()
  if (!master || !c) return
  const target = muted ? 0 : volume
  master.gain.setTargetAtTime(target, c.currentTime, 0.02)
}

muted = loadMute()
volume = loadVolume()

function ensureCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : volume
    master.connect(ctx.destination)
    bgmGain = ctx.createGain()
    bgmGain.gain.value = 0.08
    bgmGain.connect(master)
    sfxGain = ctx.createGain()
    sfxGain.gain.value = 0.28
    sfxGain.connect(master)
  }
  return ctx
}

async function resume(): Promise<void> {
  const c = ensureCtx()
  if (!c) return
  if (c.state === 'suspended') {
    try {
      await c.resume()
    } catch {
      /* ignore */
    }
  }
  unlocked = true
  applyMasterGain()
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  when = 0,
  gain = 1,
  dest: GainNode | null = sfxGain,
): void {
  const c = ensureCtx()
  if (!c || !dest || muted) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.22 * gain), t0 + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(dest)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

function chirp(
  from: number,
  to: number,
  duration: number,
  type: OscillatorType = 'sine',
  when = 0,
  gain = 1,
): void {
  const c = ensureCtx()
  if (!c || !sfxGain || muted) return
  const t0 = c.currentTime + when
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, t0)
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + duration)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.2 * gain), t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g)
  g.connect(sfxGain)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

/** One cute "ha" — triangle + sine, no saw/noise. */
function haPulse(when: number, gain: number, pitch = 1): void {
  const p = pitch
  tone(500 * p, 0.1, 'triangle', when, 0.95 * gain)
  tone(760 * p, 0.085, 'sine', when + 0.012, 0.72 * gain)
  tone(320 * p, 0.08, 'sine', when, 0.38 * gain)
}

function noiseBurst(duration: number, gain = 0.2): void {
  const c = ensureCtx()
  if (!c || !sfxGain || muted) return
  const frames = Math.floor(c.sampleRate * duration)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
  const src = c.createBufferSource()
  src.buffer = buffer
  const g = c.createGain()
  g.gain.value = gain
  src.connect(g)
  g.connect(sfxGain)
  src.start()
}

function stopBgmLoop(): void {
  if (bgmTimer != null) {
    window.clearInterval(bgmTimer)
    bgmTimer = null
  }
}

function scheduleBgmBar(): void {
  if (!unlocked || muted || !ctx || !bgmGain) return
  const notes = [196, 246.94, 293.66, 246.94, 220, 196, 164.81, 196]
  notes.forEach((f, i) => {
    tone(f, 0.28, 'triangle', i * 0.32, 0.55, bgmGain)
    tone(f * 2, 0.12, 'sine', i * 0.32 + 0.08, 0.2, bgmGain)
  })
}

export const gameAudio = {
  isMuted(): boolean {
    return muted
  },

  getVolume(): number {
    return volume
  },

  setVolume(v: number): void {
    volume = clamp01(v)
    saveVolume(volume)
    ensureCtx()
    applyMasterGain()
  },

  async unlock(): Promise<void> {
    await resume()
  },

  setMuted(next: boolean): void {
    muted = next
    saveMute(next)
    ensureCtx()
    applyMasterGain()
    if (next) stopBgmLoop()
  },

  toggleMute(): boolean {
    this.setMuted(!muted)
    return muted
  },

  playStart(): void {
    void resume().then(() => {
      tone(392, 0.12, 'square', 0, 0.7)
      tone(523.25, 0.14, 'square', 0.1, 0.7)
      tone(659.25, 0.2, 'square', 0.22, 0.8)
    })
  },

  playHit(points = 10): void {
    const boost = Math.min(1.4, 0.8 + points / 50)
    tone(660, 0.08, 'square', 0, boost)
    tone(880, 0.1, 'sine', 0.05, boost)
    tone(1174, 0.12, 'triangle', 0.1, boost * 0.8)
  },

  playMiss(): void {
    tone(180, 0.1, 'sawtooth', 0, 0.35)
    tone(120, 0.14, 'sawtooth', 0.06, 0.3)
  },

  playGhost(): void {
    noiseBurst(0.18, 0.25)
    tone(90, 0.35, 'sawtooth', 0, 0.9)
    tone(70, 0.4, 'triangle', 0.08, 0.7)
    tone(50, 0.45, 'sine', 0.15, 0.5)
  },

  playSlice(points = 10): void {
    const boost = Math.min(1.5, 0.7 + points / 40)
    noiseBurst(0.05, 0.12 * boost)
    tone(920, 0.06, 'square', 0, boost)
    tone(1240, 0.08, 'sine', 0.03, boost)
    tone(1560, 0.1, 'triangle', 0.06, boost * 0.7)
  },

  playBomb(): void {
    noiseBurst(0.28, 0.35)
    tone(110, 0.3, 'sawtooth', 0, 1)
    tone(70, 0.35, 'triangle', 0.05, 0.85)
    tone(40, 0.4, 'sine', 0.12, 0.6)
  },

  playCatch(points = 10): void {
    const boost = Math.min(1.4, 0.75 + points / 40)
    tone(740, 0.07, 'square', 0, boost)
    tone(988, 0.1, 'sine', 0.05, boost)
  },

  playStun(): void {
    tone(160, 0.12, 'sawtooth', 0, 0.55)
    tone(110, 0.18, 'triangle', 0.08, 0.45)
    noiseBurst(0.1, 0.12)
  },

  playEnd(keepTrying: boolean): void {
    if (keepTrying) {
      tone(330, 0.15, 'triangle', 0, 0.6)
      tone(294, 0.18, 'triangle', 0.12, 0.55)
      tone(247, 0.28, 'triangle', 0.28, 0.5)
    } else {
      tone(523, 0.12, 'sine', 0, 0.7)
      tone(659, 0.14, 'sine', 0.12, 0.7)
      tone(784, 0.22, 'sine', 0.26, 0.8)
    }
  },

  /** Healing jelly-cloud smash — crisp 啵啵 pop. */
  playBobo(): void {
    void resume().then(() => {
      tone(988, 0.05, 'sine', 0, 0.75)
      tone(1318, 0.07, 'triangle', 0.03, 0.7)
      tone(1760, 0.09, 'sine', 0.07, 0.45)
      noiseBurst(0.04, 0.06)
    })
  },

  /** Soft tap breeze whoosh under 蓬蓬. */
  playBreeze(): void {
    void resume().then(() => {
      noiseBurst(0.1, 0.07)
      tone(246, 0.12, 'sine', 0, 0.28)
      tone(330, 0.1, 'triangle', 0.04, 0.22)
    })
  },

  /** Cotton safety-cloud catch puff. */
  playCotton(): void {
    void resume().then(() => {
      tone(392, 0.1, 'sine', 0, 0.4)
      tone(523, 0.14, 'triangle', 0.05, 0.32)
    })
  },

  /** Soft bedtime hum (kept for other games). */
  playHum(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      tone(392, 0.28, 'sine', 0, 0.35 * g)
      tone(349, 0.32, 'sine', 0.18, 0.32 * g)
      tone(330, 0.4, 'triangle', 0.36, 0.28 * g)
      tone(262, 0.45, 'sine', 0.5, 0.22 * g)
    })
  },

  /** Gentle closed-mouth giggle — 呵呵. */
  playSoftGiggle(intensity = 1): void {
    void resume().then(() => {
      const g = Math.max(0.4, intensity)
      ;[0.94, 1.04, 0.98, 1.08].forEach((p, i) => haPulse(i * 0.15, 0.72 * g, 0.9 * p))
    })
  },

  /** Brighter playful giggle. */
  playBrightGiggle(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      ;[1, 1.12, 1.04, 1.18, 1.08].forEach((p, i) => haPulse(i * 0.09, 0.88 * g, 1.12 * p))
    })
  },

  /** Palm-grab short hi-hi. */
  playHihi(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      tone(1046, 0.055, 'sine', 0, 0.5 * g)
      tone(1318, 0.07, 'triangle', 0.06, 0.58 * g)
      tone(1174, 0.08, 'sine', 0.13, 0.48 * g)
      haPulse(0.18, 0.45 * g, 1.22)
    })
  },

  /** Rolling belly-laugh — bigger ha-ha-ha. */
  playBellyLaugh(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      const hops = [0.92, 1.06, 0.88, 1.1, 0.9, 1.14, 0.86]
      hops.forEach((p, i) => {
        haPulse(i * 0.105, (i % 2 ? 1 : 0.78) * g, 0.86 * p)
      })
      tone(392, 0.16, 'triangle', 0.72, 0.28 * g)
    })
  },

  /** Foot poke: tiny squeak then giggle. */
  playSqueakGiggle(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      chirp(1480, 1860, 0.055, 'sine', 0, 0.42 * g)
      chirp(1860, 1320, 0.05, 'triangle', 0.04, 0.32 * g)
      haPulse(0.11, 0.72 * g, 1.18)
      haPulse(0.22, 0.68 * g, 1.26)
      haPulse(0.33, 0.55 * g, 1.12)
    })
  },

  /** Pinch-cheek pout — cute, not harsh. */
  playPout(intensity = 1): void {
    void resume().then(() => {
      const g = intensity
      tone(360, 0.09, 'sine', 0, 0.4 * g)
      tone(300, 0.12, 'triangle', 0.07, 0.35 * g)
      tone(260, 0.16, 'sine', 0.14, 0.3 * g)
    })
  },

  /** Palm-grab giggle (hihi). */
  playGiggle(intensity = 1): void {
    this.playHihi(intensity)
  },

  /** Belly tickle laugh. */
  playTickle(intensity = 1): void {
    this.playBellyLaugh(intensity)
  },

  /** Stinky-foot kick: squeak + giggle. */
  playKick(intensity = 1): void {
    this.playSqueakGiggle(intensity)
  },

  /** Crazy combo: big belly-laugh, still cute. */
  playRaspberry(intensity = 1): void {
    this.playBellyLaugh(Math.max(intensity, 1.15))
  },

  startBgm(): void {
    void resume().then(() => {
      stopBgmLoop()
      if (muted) return
      scheduleBgmBar()
      bgmTimer = window.setInterval(scheduleBgmBar, 2600)
    })
  },

  stopBgm(): void {
    stopBgmLoop()
  },
}
