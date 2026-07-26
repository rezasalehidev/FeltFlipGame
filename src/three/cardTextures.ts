import type { Card } from '../types'

const W = 384
const H = 540

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function createCardBackCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#1b4d3e')
  grad.addColorStop(1, '#0a221c')
  ctx.fillStyle = grad
  roundRect(ctx, 8, 8, W - 16, H - 16, 18)
  ctx.fill()

  ctx.strokeStyle = 'rgba(240,193,75,0.45)'
  ctx.lineWidth = 6
  roundRect(ctx, 22, 22, W - 44, H - 44, 12)
  ctx.stroke()

  ctx.fillStyle = 'rgba(240,193,75,0.85)'
  ctx.font = 'bold 96px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('♠', W / 2, H / 2)

  return canvas
}

export function createCardFaceCanvas(card: Card): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const grad = ctx.createRadialGradient(W * 0.7, H * 0.12, 10, W / 2, H / 2, W)
  grad.addColorStop(0, '#fffdf8')
  grad.addColorStop(0.6, '#f3e6c8')
  grad.addColorStop(1, '#e8d6ad')
  ctx.fillStyle = grad
  roundRect(ctx, 8, 8, W - 16, H - 16, 18)
  ctx.fill()

  const ink = card.color === 'red' ? '#c62828' : '#1c2430'
  ctx.fillStyle = ink
  ctx.textAlign = 'center'

  ctx.font = 'bold 64px Georgia, serif'
  ctx.fillText(card.label, 64, 78)
  ctx.font = '48px serif'
  ctx.fillText(card.symbol, 64, 134)

  ctx.save()
  ctx.translate(W - 64, H - 78)
  ctx.rotate(Math.PI)
  ctx.font = 'bold 64px Georgia, serif'
  ctx.fillText(card.label, 0, 0)
  ctx.font = '48px serif'
  ctx.fillText(card.symbol, 0, 56)
  ctx.restore()

  ctx.font = '160px serif'
  ctx.fillText(card.symbol, W / 2, H / 2 + 24)

  return canvas
}
