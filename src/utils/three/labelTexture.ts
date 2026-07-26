import * as THREE from 'three'

export function makeLabelTexture(text: string, highlight = false): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 512, 128)
  ctx.fillStyle = highlight ? 'rgba(125,222,168,0.28)' : 'rgba(8,28,24,0.75)'
  ctx.beginPath()
  ctx.moveTo(32, 24)
  ctx.arcTo(496, 24, 496, 104, 16)
  ctx.arcTo(496, 104, 16, 104, 16)
  ctx.arcTo(16, 104, 16, 24, 16)
  ctx.arcTo(16, 24, 496, 24, 16)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = highlight ? '#7ddea8' : '#f7f2e4'
  ctx.font = 'bold 34px DM Sans, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 256, 68)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
