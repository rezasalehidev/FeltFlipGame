import * as THREE from 'three'
import type { LabelUserData, Phase, Player } from '../../types'
import { tableSignature } from './cardKey'
import { CARD_D, CARD_W, HELD_Y } from './constants'
import { type CardMesh, CardTextureCache, createCardMesh } from './cardMesh'
import { createTableScene, resizeTableCamera, type TableScene } from './createScene'
import { clearGroup, disposeObject } from './dispose'
import { getSeatLayout } from './layout'
import { makeLabelTexture } from './labelTexture'

export interface PokerTableState {
  players: Player[]
  held: boolean[]
  phase: Phase
  pot: number
  winnerIds: string[]
  selectable: boolean
}

export interface PokerTableHandlers {
  onToggleHold: (index: number) => void
  onSelectPlayer: (playerId: string) => void
}

export class PokerTable {
  private readonly host: HTMLElement
  private readonly handlers: PokerTableHandlers
  private readonly textures = new CardTextureCache()
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly sceneParts: TableScene
  private potSprite: THREE.Sprite | null = null
  private signature = ''
  private raf = 0
  private state: PokerTableState | null = null

  constructor(host: HTMLElement, handlers: PokerTableHandlers) {
    this.host = host
    this.handlers = handlers
    this.sceneParts = createTableScene(host)
    this.sceneParts.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    window.addEventListener('resize', this.onResize)
    this.onResize()
    this.animate()
  }

  sync(state: PokerTableState): void {
    this.state = state
    const next = tableSignature(state.players)
    if (next !== this.signature) {
      this.rebuildCards(state)
    } else {
      this.syncTargets(state, true)
    }
    this.rebuildLabels(state)
  }

  destroy(): void {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('resize', this.onResize)
    this.sceneParts.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    clearGroup(this.sceneParts.cardsGroup)
    clearGroup(this.sceneParts.labelsGroup)
    if (this.potSprite) {
      this.sceneParts.scene.remove(this.potSprite)
      disposeObject(this.potSprite)
      this.potSprite = null
    }
    this.textures.dispose()
    this.sceneParts.renderer.dispose()
    this.sceneParts.renderer.domElement.remove()
  }

  private rebuildCards(state: PokerTableState): void {
    const { cardsGroup } = this.sceneParts
    clearGroup(cardsGroup)

    const opponents = state.players.filter((p) => !p.isYou)
    let oppCounter = 0

    for (const player of state.players) {
      const layout = getSeatLayout(
        player,
        oppCounter,
        opponents.length,
      )
      if (!player.isYou) oppCounter += 1
      if (!player.cards.length) continue

      const gap = CARD_W * layout.scale * 1.14
      const startX = layout.originX - ((player.cards.length - 1) * gap) / 2

      player.cards.forEach((card, index) => {
        const mesh = createCardMesh(
          card,
          player.id,
          index,
          startX + index * gap,
          layout.originZ,
          layout.scale,
          this.textures,
        )
        mesh.userData.targetY =
          player.isYou && state.held[index] ? HELD_Y : CARD_D
        mesh.position.y = mesh.userData.targetY
        cardsGroup.add(mesh)
      })
    }

    this.signature = tableSignature(state.players)
    this.syncTargets(state, false)
  }

  private rebuildLabels(state: PokerTableState): void {
    const { labelsGroup, scene } = this.sceneParts
    clearGroup(labelsGroup)

    const opponents = state.players.filter((p) => !p.isYou)
    let oppCounter = 0

    for (const player of state.players) {
      const isWinner = state.winnerIds.includes(player.id)
      const layout = getSeatLayout(player, oppCounter, opponents.length)
      if (!player.isYou) oppCounter += 1

      const handText =
        player.result && (player.isYou || state.phase === 'showdown')
          ? ` · ${player.result.name}`
          : ''
      const tex = makeLabelTexture(
        `${player.name}  ${player.chips}${handText}`,
        isWinner,
      )
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
      )
      label.scale.set(player.isYou ? 3.8 : 3.1, player.isYou ? 0.95 : 0.78, 1)
      label.position.set(
        layout.originX,
        0.6,
        layout.originZ + (player.isYou ? 1.7 : -1.65),
      )
      label.userData = { kind: 'label', playerId: player.id } satisfies LabelUserData
      labelsGroup.add(label)
    }

    if (this.potSprite) {
      scene.remove(this.potSprite)
      disposeObject(this.potSprite)
      this.potSprite = null
    }
    if (state.pot > 0) {
      const tex = makeLabelTexture(`POT ${state.pot}`, true)
      this.potSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
      )
      this.potSprite.scale.set(2.8, 0.7, 1)
      this.potSprite.position.set(0, 0.6, 0)
      scene.add(this.potSprite)
    }
  }

  private syncTargets(state: PokerTableState, animateFromCurrent: boolean): void {
    const { cardsGroup } = this.sceneParts
    for (const child of cardsGroup.children) {
      if (!(child instanceof THREE.Mesh) || child.userData.kind !== 'card') continue
      const mesh = child as CardMesh
      const player = state.players.find((p) => p.id === mesh.userData.playerId)
      const card = player?.cards[mesh.userData.cardIndex]
      if (!card) continue

      mesh.userData.targetFlip = card.flipped ? 0 : Math.PI
      mesh.userData.targetY =
        player?.isYou && state.held[mesh.userData.cardIndex] ? HELD_Y : CARD_D

      if (!animateFromCurrent) {
        mesh.rotation.y = mesh.userData.targetFlip
        mesh.position.y = mesh.userData.targetY
      }
    }
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const { renderer, camera, labelsGroup, cardsGroup } = this.sceneParts
    const rect = renderer.domElement.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, camera)

    const labelHits = this.raycaster.intersectObjects(labelsGroup.children, false)
    for (const hit of labelHits) {
      const data = hit.object.userData as LabelUserData
      if (data?.kind === 'label' && data.playerId) {
        this.handlers.onSelectPlayer(data.playerId)
        return
      }
    }

    if (!this.state?.selectable) return
    const hits = this.raycaster.intersectObjects(cardsGroup.children, false)
    for (const hit of hits) {
      const mesh = hit.object as CardMesh
      if (mesh.userData?.kind === 'card' && mesh.userData.playerId === 'you') {
        this.handlers.onToggleHold(mesh.userData.cardIndex)
        break
      }
    }
  }

  private readonly onResize = (): void => {
    const { camera, renderer } = this.sceneParts
    resizeTableCamera(this.host, camera, renderer)
  }

  private readonly animate = (): void => {
    this.raf = requestAnimationFrame(this.animate)
    const { renderer, scene, camera, cardsGroup } = this.sceneParts

    for (const child of cardsGroup.children) {
      if (!(child instanceof THREE.Mesh) || child.userData.kind !== 'card') continue
      const mesh = child as CardMesh
      mesh.position.y += (mesh.userData.targetY - mesh.position.y) * 0.18
      let diff = mesh.userData.targetFlip - mesh.rotation.y
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      mesh.rotation.y += diff * 0.15
    }

    renderer.render(scene, camera)
  }
}
