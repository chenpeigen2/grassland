import { useMemo } from 'react'
import * as THREE from 'three'
import { terrainHeight, pathX, fbm, rand01, smoothstep } from './noise'
import { QUALITY } from './capabilities'

const OLIVE = new THREE.Color('#66541f')
const GOLD = new THREE.Color('#a8822a')
const PALE = new THREE.Color('#c4a044')
const DIRT = new THREE.Color('#7a5c38')

export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(260, 260, QUALITY.terrainSegments, QUALITY.terrainSegments)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = terrainHeight(x, z)
      pos.setY(i, h)

      // 大尺度色块:橄榄 ↔ 枯金
      const patch = fbm(x * 0.045 + 11, z * 0.045 + 5, 3)
      c.copy(OLIVE).lerp(GOLD, patch)
      // 高处偏苍白(远山感)
      c.lerp(PALE, smoothstep(1.5, 7, h) * 0.55)
      // 蜿蜒土路(加宽加深,让路径可读)
      const d = Math.abs(x - pathX(z))
      const pf = 1 - smoothstep(1.8, 5.0, d)
      if (pf > 0) c.lerp(DIRT, pf * 0.95)
      // 逐顶点微抖动,消除色带
      c.multiplyScalar(0.92 + rand01(i * 12.9898) * 0.16)

      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  )
}
