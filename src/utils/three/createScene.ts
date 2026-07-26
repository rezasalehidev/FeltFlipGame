import * as THREE from 'three'
import { RIM_SIZE, TABLE_SIZE, VIEW_HALF } from './constants'

export interface TableScene {
  scene: THREE.Scene
  camera: THREE.OrthographicCamera
  renderer: THREE.WebGLRenderer
  cardsGroup: THREE.Group
  labelsGroup: THREE.Group
}

export function createTableScene(host: HTMLElement): TableScene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#071612')

  const camera = new THREE.OrthographicCamera(
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

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.outputColorSpace = THREE.SRGBColorSpace
  host.appendChild(renderer.domElement)
  Object.assign(renderer.domElement.style, {
    width: '100%',
    height: '100%',
    display: 'block',
    borderRadius: '24px',
  })

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

  const cardsGroup = new THREE.Group()
  const labelsGroup = new THREE.Group()
  scene.add(cardsGroup)
  scene.add(labelsGroup)

  return { scene, camera, renderer, cardsGroup, labelsGroup }
}

export function resizeTableCamera(
  host: HTMLElement,
  camera: THREE.OrthographicCamera,
  renderer: THREE.WebGLRenderer,
): void {
  const w = host.clientWidth
  const h = Math.max(host.clientHeight, 1)
  const aspect = w / h
  camera.left = -VIEW_HALF * aspect
  camera.right = VIEW_HALF * aspect
  camera.top = VIEW_HALF
  camera.bottom = -VIEW_HALF
  camera.updateProjectionMatrix()
  renderer.setSize(w, h, false)
}
