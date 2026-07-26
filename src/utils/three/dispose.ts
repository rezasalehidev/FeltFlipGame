import * as THREE from 'three'

export function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      const mats = Array.isArray(child.material) ? child.material : [child.material]
      for (const m of mats) m.dispose()
    }
    if (child instanceof THREE.Sprite) {
      const mat = child.material
      mat.map?.dispose()
      mat.dispose()
    }
  })
}

export function clearGroup(group: THREE.Group | null): void {
  if (!group) return
  while (group.children.length) {
    const child = group.children.pop()!
    disposeObject(child)
  }
}
