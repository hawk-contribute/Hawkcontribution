import { asset } from './asset'
import { nftAuthCodeLines } from './nftAuthCode'
import {
  formatClaimSerial,
  isValidClaimSerial,
} from './nftClaimSerial'

export type NftStampCopy = {
  serialText: string
  voucherText: string
  levelText: string
  /** Localized short seal title, e.g. AUTH / 防偽 */
  sealTitle: string
  /** HK-A7F3-9C2B or empty when the claim has no auth payload */
  authCode: string
}

const GOLD = '#feba45'
const GOLD_HI = '#ffe7a8'
const CREAM = '#eef2f8'
const INK = 'rgba(5, 7, 12, 0.92)'
const FONT =
  '"Noto Sans TC", "Noto Sans SC", Inter, "PingFang TC", "Microsoft JhengHei", sans-serif'

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    const flush = () => {
      const trimmed = line.trimEnd()
      if (trimmed) lines.push(trimmed)
      line = ''
    }
    for (const ch of para) {
      const test = line + ch
      if (line && ctx.measureText(test).width > maxWidth) {
        flush()
        line = ch === ' ' ? '' : ch
      } else {
        line = test
      }
    }
    flush()
  }
  return lines
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  fill: string,
) {
  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 1
  ctx.fillStyle = fill
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** L-bracket authenticity mark on the artwork (visible vs raw screenshot). */
function drawCornerMarks(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  const len = Math.max(18, Math.round(Math.min(w, h) * 0.055))
  const thick = Math.max(2, Math.round(Math.min(w, h) * 0.008))
  const inset = Math.max(10, Math.round(Math.min(w, h) * 0.028))
  ctx.save()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = thick
  ctx.lineCap = 'square'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)'
  ctx.shadowBlur = 4
  // top-left
  ctx.beginPath()
  ctx.moveTo(inset, inset + len)
  ctx.lineTo(inset, inset)
  ctx.lineTo(inset + len, inset)
  ctx.stroke()
  // top-right
  ctx.beginPath()
  ctx.moveTo(w - inset - len, inset)
  ctx.lineTo(w - inset, inset)
  ctx.lineTo(w - inset, inset + len)
  ctx.stroke()
  ctx.restore()
}

/**
 * Hologram-like circular anti-counterfeit seal (防偽標籤).
 * Sits on the artwork so a raw screenshot without this stamp is obvious.
 */
function drawAuthSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  sealTitle: string,
  authCode: string,
) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r + Math.max(3, r * 0.08), 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(254, 186, 69, 0.22)'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(5, 7, 12, 0.94)'
  ctx.fill()
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  const wedges = 24
  for (let i = 0; i < wedges; i++) {
    const a0 = (i / wedges) * Math.PI * 2 - Math.PI / 2
    const a1 = ((i + 1) / wedges) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, a0, a1)
    ctx.closePath()
    ctx.fillStyle =
      i % 2 === 0 ? 'rgba(254, 186, 69, 0.16)' : 'rgba(255, 231, 168, 0.06)'
    ctx.fill()
  }
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.lineWidth = Math.max(2, r * 0.07)
  ctx.strokeStyle = GOLD
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.9, 0, Math.PI * 2)
  ctx.setLineDash([Math.max(3, r * 0.09), Math.max(2, r * 0.055)])
  ctx.lineWidth = Math.max(1.5, r * 0.04)
  ctx.strokeStyle = GOLD_HI
  ctx.stroke()
  ctx.setLineDash([])

  const ticks = 28
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2 - Math.PI / 2
    const inner = r * (i % 2 === 0 ? 0.74 : 0.78)
    const outer = r * 0.86
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner)
    ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer)
    ctx.strokeStyle = i % 2 === 0 ? GOLD : GOLD_HI
    ctx.lineWidth = Math.max(1, r * 0.025)
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.64, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(5, 7, 12, 0.88)'
  ctx.fill()
  ctx.strokeStyle = GOLD
  ctx.lineWidth = Math.max(1.5, r * 0.035)
  ctx.stroke()

  const { line1, line2 } = nftAuthCodeLines(authCode || null)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.max(10, Math.round(r * 0.22))}px ${FONT}`
  drawLabel(ctx, sealTitle, cx, cy - r * 0.22, GOLD)
  ctx.font = `700 ${Math.max(8, Math.round(r * 0.16))}px ${FONT}`
  drawLabel(ctx, line1, cx, cy + r * 0.06, CREAM)
  if (line2) {
    ctx.font = `700 ${Math.max(8, Math.round(r * 0.16))}px ${FONT}`
    drawLabel(ctx, line2, cx, cy + r * 0.28, CREAM)
  }
  ctx.restore()
}

/**
 * Composite serial + voucher + level + anti-counterfeit seal onto NFT artwork.
 * High-contrast bottom band + circular seal so gold/cream copy stays readable
 * on dark Hawk art, and raw unstamped screenshots are distinguishable.
 */
export function stampNftCanvas(
  image: CanvasImageSource,
  width: number,
  height: number,
  copy: NftStampCopy,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('CANVAS')

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height)

  const w = canvas.width
  const h = canvas.height
  drawCornerMarks(ctx, w, h)

  const pad = Math.max(16, Math.round(w * 0.045))
  const bandH = Math.max(Math.round(h * 0.26), Math.round(w * 0.22), 176)
  const bandTop = h - bandH
  const sealR = Math.max(42, Math.round(Math.min(w, h) * 0.11))
  const sealCx = w - pad - sealR
  const sealCy = bandTop + Math.round(bandH * 0.18)

  const fade = ctx.createLinearGradient(0, bandTop - bandH * 0.35, 0, bandTop)
  fade.addColorStop(0, 'rgba(5, 7, 12, 0)')
  fade.addColorStop(1, INK)
  ctx.fillStyle = fade
  ctx.fillRect(0, bandTop - bandH * 0.35, w, bandH * 0.35)

  ctx.fillStyle = INK
  ctx.fillRect(0, bandTop, w, bandH)

  ctx.fillStyle = GOLD
  ctx.fillRect(0, bandTop, w, Math.max(2, Math.round(h * 0.004)))

  const serialSize = Math.max(22, Math.round(w * 0.048))
  const titleSize = Math.max(12, Math.round(w * 0.022))
  const bodySize = Math.max(13, Math.round(w * 0.026))
  const levelSize = Math.max(12, Math.round(w * 0.022))
  const textRight = sealCx - sealR - pad * 0.55
  let y = bandTop + pad + titleSize

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `700 ${titleSize}px ${FONT}`
  drawLabel(ctx, 'HAWK', pad, y, GOLD)
  const hawkW = ctx.measureText('HAWK').width
  ctx.font = `700 ${levelSize}px ${FONT}`
  drawLabel(
    ctx,
    copy.levelText,
    pad + hawkW + Math.max(10, Math.round(w * 0.02)),
    y,
    GOLD,
  )

  y += serialSize + Math.round(pad * 0.28)
  ctx.textAlign = 'left'
  ctx.font = `700 ${serialSize}px ${FONT}`
  drawLabel(ctx, copy.serialText, pad, y, GOLD)

  y += Math.round(bodySize * 1.5)
  ctx.font = `600 ${bodySize}px ${FONT}`
  const maxWidth = Math.max(80, textRight - pad)
  const voucherLines = wrapText(ctx, copy.voucherText, maxWidth).slice(0, 2)
  for (const line of voucherLines) {
    drawLabel(ctx, line, pad, y, CREAM)
    y += Math.round(bodySize * 1.32)
  }

  if (copy.authCode) {
    ctx.font = `700 ${Math.max(11, Math.round(w * 0.022))}px ${FONT}`
    drawLabel(ctx, copy.authCode, pad, y + Math.round(bodySize * 0.15), GOLD_HI)
  }

  drawAuthSeal(ctx, sealCx, sealCy, sealR, copy.sealTitle, copy.authCode)

  return canvas
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('IMAGE_LOAD'))
    img.src = url
  })
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('BLOB'))
      },
      'image/jpeg',
      0.92,
    )
  })
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function stampedDownloadName(
  imagePath: string,
  nftId: string,
  serial?: number,
): string {
  const file = imagePath.split('/').pop() || `${nftId}.jpg`
  const base = file.replace(/\.[^.]+$/, '') || nftId
  const serialPart = isValidClaimSerial(serial)
    ? `-No-${formatClaimSerial(serial)}`
    : ''
  return `${base}${serialPart}.jpg`
}

export async function downloadNftImage(
  imagePath: string,
  filename: string,
  stamp?: NftStampCopy,
): Promise<void> {
  const url = asset(imagePath)
  try {
    if (stamp) {
      const img = await loadImage(url)
      const canvas = stampNftCanvas(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        stamp,
      )
      const blob = await canvasToJpegBlob(canvas)
      const objectUrl = URL.createObjectURL(blob)
      triggerDownload(objectUrl, filename)
      URL.revokeObjectURL(objectUrl)
      return
    }
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    triggerDownload(objectUrl, filename)
    URL.revokeObjectURL(objectUrl)
  } catch {
    triggerDownload(url, filename)
  }
}
