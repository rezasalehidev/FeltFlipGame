<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { createCardBackCanvas, createCardFaceCanvas } from '../three/cardTextures'
import type { Card, CardUserData, LabelUserData, Phase, Player } from '../types'

const props = defineProps<{
  players: Player[]
  held: boolean[]
  phase: Phase
  pot: number
  winnerIds: string[]
  selectable: boolean
}>()

const emit = defineEmits<{
  toggleHold: [index: number]
  selectPlayer: [playerId: string]
}>()

const host = ref<HTMLDivElement | null>(null)

const CARD_W = 0.9
const CARD_H = 1.28
const CARD_D = 0.03
const YOU_Z = 3.7
const OPP_Z = -3.5
const OPP_SPREAD = 3.7
const TABLE_SIZE = 12
const RIM_SIZE = 13.2
/** Orthographic half-height — fits the full square table with margin */
const VIEW_HALF = 7.4

type CardMesh = THREE.Mesh & { userData: CardUserData }

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.OrthographicCamera | null = null
let raf = 0
let cardsGroup: THREE.Group | null = null
let labelsGroup: THREE.Group | null = null
let potSprite: THREE.Sprite | null = null
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let backTexture: THREE.CanvasTexture | null = null
const faceCache = new Map<string, THREE.CanvasTexture>()
let signature = ''

function faceKey(card: Card) {
  return `${card.rank}-${card.suit}`
}

function getFaceTexture(card: Card): THREE.CanvasTexture {
  const key = faceKey(card)
  const cached = faceCache.get(key)
  if (cached) return cached
  const tex = new THREE.CanvasTexture(createCardFaceCanvas(card))
  tex.colorSpace = THREE.SRGBColorSpace
  faceCache.set(key, tex)
  return tex
}

function makeLabelTexture(text: string, highlight = false): THREE.CanvasTexture {
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

function ensureBackTexture() {
  if (!backTexture) {
    backTexture = new THREE.CanvasTexture(createCardBackCanvas())
    backTexture.colorSpace = THREE.SRGBColorSpace
  }
  return backTexture
}

function createCardMesh(
  card: Card,
  playerId: string,
  cardIndex: number,
  x: number,
  z: number,
  scale: number,
): CardMesh {
  const geo = new THREE.BoxGeometry(CARD_W * scale, CARD_H * scale, CARD_D)
  const edge = new THREE.MeshStandardMaterial({ color: '#d9c9a5', roughness: 0.85 })
  const front = new THREE.MeshStandardMaterial({
    map: getFaceTexture(card),
    roughness: 0.42,
  })
  const back = new THREE.MeshStandardMaterial({
    map: ensureBackTexture(),
    roughness: 0.55,
  })
  const mesh = new THREE.Mesh(geo, [edge, edge, edge, edge, front, back])
  mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(x, CARD_D, z)
  mesh.rotation.x = -Math.PI / 2
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

function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) m.dispose()
    }
    if (child instanceof THREE.Sprite) {
      const mat = child.material as THREE.SpriteMaterial
      mat.map?.dispose()
      mat.dispose()
    }
  })
}

function clearGroup(group: THREE.Group | null) {
  if (!group) return
  while (group.children.length) {
    const child = group.children.pop()!
    disposeObject(child)
  }
}

function tableSignature(): string {
  return props.players
    .map((p) => `${p.id}:${p.cards.map((c) => faceKey(c)).join(',')}`)
    .join('|')
}

function rebuildCards() {
  if (!cardsGroup) return
  clearGroup(cardsGroup)

  const opponents = props.players.filter((p) => !p.isYou)
  let oppCounter = 0

  for (const player of props.players) {
    let originX = 0
    let originZ = YOU_Z
    let scale = 1.15

    if (!player.isYou) {
      originX = (oppCounter - (opponents.length - 1) / 2) * OPP_SPREAD
      originZ = OPP_Z
      scale = 0.95
      oppCounter += 1
    }

    if (!player.cards.length) continue

    const gap = CARD_W * scale * 1.14
    const startX = originX - ((player.cards.length - 1) * gap) / 2

    player.cards.forEach((card, index) => {
      const mesh = createCardMesh(
        card,
        player.id,
        index,
        startX + index * gap,
        originZ,
        scale,
      )
      mesh.userData.targetY =
        player.isYou && props.held[index] ? 0.35 : CARD_D
      mesh.position.y = mesh.userData.targetY
      cardsGroup!.add(mesh)
    })
  }

  signature = tableSignature()
  syncTargets(false)
}

function rebuildLabels() {
  if (!labelsGroup || !scene) return
  clearGroup(labelsGroup)

  const opponents = props.players.filter((p) => !p.isYou)
  let oppCounter = 0

  for (const player of props.players) {
    const isWinner = props.winnerIds.includes(player.id)
    let originX = 0
    let originZ = YOU_Z

    if (!player.isYou) {
      originX = (oppCounter - (opponents.length - 1) / 2) * OPP_SPREAD
      originZ = OPP_Z
      oppCounter += 1
    }

    const handText =
      player.result && (player.isYou || props.phase === 'showdown')
        ? ` · ${player.result.name}`
        : ''
    const tex = makeLabelTexture(
      `${player.name}  ${player.chips}${handText}`,
      isWinner,
    )
    const label = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    )
    label.scale.set(player.isYou ? 3.2 : 2.6, player.isYou ? 0.8 : 0.65, 1)
    label.position.set(originX, 0.6, originZ + (player.isYou ? 1.35 : -1.3))
    label.userData = { kind: 'label', playerId: player.id } satisfies LabelUserData
    labelsGroup.add(label)
  }

  if (potSprite) {
    scene.remove(potSprite)
    disposeObject(potSprite)
    potSprite = null
  }
  if (props.pot > 0) {
    const tex = makeLabelTexture(`POT ${props.pot}`, true)
    potSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }),
    )
    potSprite.scale.set(2.2, 0.55, 1)
    potSprite.position.set(0, 0.6, 0)
    scene.add(potSprite)
  }
}

function syncTargets(animateFromCurrent: boolean) {
  if (!cardsGroup) return
  for (const child of cardsGroup.children) {
    if (!(child instanceof THREE.Mesh) || child.userData.kind !== 'card') continue
    const mesh = child as CardMesh
    const player = props.players.find((p) => p.id === mesh.userData.playerId)
    const card = player?.cards[mesh.userData.cardIndex]
    if (!card) continue

    mesh.userData.targetFlip = card.flipped ? 0 : Math.PI
    mesh.userData.targetY =
      player?.isYou && props.held[mesh.userData.cardIndex] ? 0.35 : CARD_D

    if (!animateFromCurrent) {
      mesh.rotation.y = mesh.userData.targetFlip
      mesh.position.y = mesh.userData.targetY
    }
  }
}

function syncScene() {
  const next = tableSignature()
  if (next !== signature) {
    rebuildCards()
  } else {
    syncTargets(true)
  }
  rebuildLabels()
}

function onPointerDown(event: PointerEvent) {
  if (!renderer || !camera) return
  const rect = renderer.domElement.getBoundingClientRect()
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  raycaster.setFromCamera(pointer, camera)

  // Click player name label → open profile modal
  if (labelsGroup) {
    const labelHits = raycaster.intersectObjects(labelsGroup.children, false)
    for (const hit of labelHits) {
      const data = hit.object.userData as LabelUserData
      if (data?.kind === 'label' && data.playerId) {
        emit('selectPlayer', data.playerId)
        return
      }
    }
  }

  if (!props.selectable || !cardsGroup) return
  const hits = raycaster.intersectObjects(cardsGroup.children, false)
  for (const hit of hits) {
    const mesh = hit.object as CardMesh
    if (mesh.userData?.kind === 'card' && mesh.userData.playerId === 'you') {
      emit('toggleHold', mesh.userData.cardIndex)
      break
    }
  }
}

function animate() {
  raf = requestAnimationFrame(animate)
  if (!renderer || !scene || !camera || !cardsGroup) return

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

function onResize() {
  if (!host.value || !renderer || !camera) return
  const w = host.value.clientWidth
  const h = Math.max(host.value.clientHeight, 1)
  const aspect = w / h
  camera.left = -VIEW_HALF * aspect
  camera.right = VIEW_HALF * aspect
  camera.top = VIEW_HALF
  camera.bottom = -VIEW_HALF
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}

onMounted(() => {
  if (!host.value) return

  scene = new THREE.Scene()
  scene.background = new THREE.Color('#071612')

  // Straight top-down orthographic camera — full square table in view
  camera = new THREE.OrthographicCamera(
    -VIEW_HALF,
    VIEW_HALF,
    VIEW_HALF,
    -VIEW_HALF,
    0.1,
    80,
  )
  camera.position.set(0, 24, 0)
  camera.up.set(0, 0, -1)
  camera.lookAt(0, 0, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.value.appendChild(renderer.domElement)
  Object.assign(renderer.domElement.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    borderRadius: '24px',
  })
  renderer.domElement.addEventListener('pointerdown', onPointerDown)

  scene.add(new THREE.HemisphereLight(0xf0e6c8, 0x0a221c, 1.15))
  const key = new THREE.DirectionalLight(0xfff2d6, 1.5)
  key.position.set(4, 18, 5)
  key.castShadow = true
  scene.add(key)
  const fill = new THREE.DirectionalLight(0x88a899, 0.55)
  fill.position.set(-5, 12, -3)
  scene.add(fill)

  const wood = new THREE.Mesh(
    new THREE.PlaneGeometry(RIM_SIZE, RIM_SIZE),
    new THREE.MeshStandardMaterial({ color: '#5c3a1e', roughness: 0.7 }),
  )
  wood.rotation.x = -Math.PI / 2
  wood.position.y = 0.005
  wood.receiveShadow = true
  scene.add(wood)

  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(TABLE_SIZE, TABLE_SIZE),
    new THREE.MeshStandardMaterial({ color: '#145c45', roughness: 0.92 }),
  )
  felt.rotation.x = -Math.PI / 2
  felt.position.y = 0.02
  felt.receiveShadow = true
  scene.add(felt)

  cardsGroup = new THREE.Group()
  labelsGroup = new THREE.Group()
  scene.add(cardsGroup)
  scene.add(labelsGroup)

  onResize()
  window.addEventListener('resize', onResize)
  syncScene()
  animate()
})

watch(
  () => [props.players, props.held, props.phase, props.pot, props.winnerIds],
  () => syncScene(),
  { deep: true },
)

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
  renderer?.domElement.removeEventListener('pointerdown', onPointerDown)
  clearGroup(cardsGroup)
  clearGroup(labelsGroup)
  if (potSprite && scene) {
    scene.remove(potSprite)
    disposeObject(potSprite)
  }
  for (const tex of faceCache.values()) tex.dispose()
  faceCache.clear()
  backTexture?.dispose()
  renderer?.dispose()
  renderer?.domElement.remove()
  scene = null
  camera = null
  renderer = null
  cardsGroup = null
  labelsGroup = null
})
</script>

<template>
  <div ref="host" class="table3d" aria-label="Three.js poker table"></div>
</template>

<style scoped>
.table3d {
  width: 100%;
  height: min(78vh, 720px);
  min-height: 480px;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(240, 193, 75, 0.16);
  box-shadow:
    inset 0 0 0 4px rgba(8, 30, 24, 0.35),
    0 18px 40px rgba(0, 0, 0, 0.35);
  background: #071612;
  cursor: pointer;
}
</style>
