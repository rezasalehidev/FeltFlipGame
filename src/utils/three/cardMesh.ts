import * as THREE from 'three'
import type { Card, CardUserData } from '../../types'
import { faceKey } from './cardKey'
import { CARD_D, CARD_H, CARD_W } from './constants'
import { createCardBackCanvas, createCardFaceCanvas } from './cardTextures'

export type CardMesh = THREE.Mesh & { userData: CardUserData }

export class CardTextureCache {
  private faceCache = new Map<string, THREE.CanvasTexture>()
  private backTexture: THREE.CanvasTexture | null = null

  getFace(card: Card): THREE.CanvasTexture {
    const key = faceKey(card)
    const cached = this.faceCache.get(key)
    if (cached) return cached
    const tex = new THREE.CanvasTexture(createCardFaceCanvas(card))
    tex.colorSpace = THREE.SRGBColorSpace
    this.faceCache.set(key, tex)
    return tex
  }

  getBack(): THREE.CanvasTexture {
    if (!this.backTexture) {
      this.backTexture = new THREE.CanvasTexture(createCardBackCanvas())
      this.backTexture.colorSpace = THREE.SRGBColorSpace
    }
    return this.backTexture
  }

  dispose(): void {
    for (const tex of this.faceCache.values()) tex.dispose()
    this.faceCache.clear()
    this.backTexture?.dispose()
    this.backTexture = null
  }
}

export function createCardMesh(
  card: Card,
  playerId: string,
  cardIndex: number,
  x: number,
  z: number,
  scale: number,
  textures: CardTextureCache,
): CardMesh {
  const geo = new THREE.BoxGeometry(CARD_W * scale, CARD_H * scale, CARD_D)
  const edge = new THREE.MeshStandardMaterial({ color: '#d9c9a5', roughness: 0.85 })
  const front = new THREE.MeshStandardMaterial({
    map: textures.getFace(card),
    roughness: 0.42,
  })
  const back = new THREE.MeshStandardMaterial({
    map: textures.getBack(),
    roughness: 0.55,
  })
  const mesh = new THREE.Mesh(geo, [edge, edge, edge, edge, front, back])
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(x, CARD_D, z)
  // Lie flat; Z rotation keeps faces upright for top-down camera
  mesh.rotation.x = -Math.PI / 2
  mesh.rotation.z = Math.PI
  const flip = card.flipped ? 0 : Math.PI
  mesh.rotation.y = flip
  mesh.userData = {
    kind: 'card',
    playerId,
    cardIndex,
    cardKey: `${playerId}:${cardIndex}:${faceKey(card)}`,
    targetFlip: flip,
    targetY: CARD_D,
  } satisfies CardUserData
  return mesh as unknown as CardMesh
}
