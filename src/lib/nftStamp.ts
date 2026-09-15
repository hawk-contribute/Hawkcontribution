import { asset } from './asset'
import {
  formatClaimSerial,
  isValidClaimSerial,
} from './nftClaimSerial'

export type NftStampCopy = {
  serialText: string
  voucherText: string
  levelText: string
}

const GOLD = '#feba45'
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

/**
 * Composite serial + voucher + level onto NFT artwork.
 * High-contrast bottom band so gold/cream copy stays readable on dark Hawk art.
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
  const pad = Math.max(16, Math.round(w * 0.045))
  const bandH = Math.max(Math.round(h * 0.24), Math.round(w * 0.2), 160)
  const bandTop = h - bandH

  const fade = ctx.createLinearGradient(0, bandTop - bandH * 0.35, 0, bandTop)
  fade.addColorStop(0, 'rgba(5, 7, 12, 0)')
  fade.addColorStop(1, INK)
  ctx.fillStyle = fade
  ctx.fillRect(0, bandTop - bandH * 0.35, w, bandH * 0.35)

  ctx.fillStyle = INK
  ctx.fillRect(0, bandTop, w, bandH)

  ctx.fillStyle = GOLD
  ctx.fillRect(0, bandTop, w, Math.max(2, Math.round(h * 0.004)))

  const serialSize = Math.max(22, Math.round(w * 0.052))
  const titleSize = Math.max(12, Math.round(w * 0.022))
  const bodySize = Math.max(13, Math.round(w * 0.028))
  const levelSize = Math.max(12, Math.round(w * 0.024))
  let y = bandTop + pad + titleSize

  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.font = `700 ${titleSize}px ${FONT}`
  drawLabel(ctx, 'HAWK', pad, y, GOLD)

  ctx.textAlign = 'right'
  ctx.font = `700 ${levelSize}px ${FONT}`
  drawLabel(ctx, copy.levelText, w - pad, y, GOLD)

  y += serialSize + Math.round(pad * 0.35)
  ctx.textAlign = 'left'
  ctx.font = `700 ${serialSize}px ${FONT}`
  drawLabel(ctx, copy.serialText, pad, y, GOLD)

  y += Math.round(bodySize * 1.55)
  ctx.font = `600 ${bodySize}px ${FONT}`
  const maxWidth = w - pad * 2
  const voucherLines = wrapText(ctx, copy.voucherText, maxWidth).slice(0, 3)
  for (const line of voucherLines) {
    drawLabel(ctx, line, pad, y, CREAM)
    y += Math.round(bodySize * 1.35)
  }

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
