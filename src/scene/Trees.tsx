import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { terrainHeight, pathX, mulberry32 } from './noise'

const FOLIAGE = ['#d9822b', '#c9552e', '#e6a23c', '#b7742c', '#e8b04b', '#d4622f']

interface TreeSpec {
  x: number
  z: number
  y: number
  scale: number
  rot: number
  foliage: string
  seed: number
}

function useTreeSpecs(): TreeSpec[] {
  return useMemo(() => {
    const rng = mulberry32(777)
    const list: TreeSpec[] = []
    // 近景树(阴影范围内)
    let attempts = 0
    while (list.length < 16 && attempts < 800) {
      attempts++
      const a = rng() * Math.PI * 2
      const r = 12 + Math.sqrt(rng()) * 66
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.abs(x - pathX(z)) < 7) continue
      if (list.some((t) => Math.hypot(t.x - x, t.z - z) < 10)) continue
      list.push({
        x, z,
        y: terrainHeight(x, z) - 0.15,
        scale: 0.85 + rng() * 0.6,
        rot: rng() * Math.PI * 2,
        foliage: FOLIAGE[Math.floor(rng() * FOLIAGE.length)],
        seed: list.length,
      })
    }
    // 远景树(雾中剪影,放大)
    attempts = 0
    const near = list.length
    while (list.length < near + 8 && attempts < 800) {
      attempts++
      const a = rng() * Math.PI * 2
      const r = 82 + Math.sqrt(rng()) * 24
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (Math.abs(x - pathX(z)) < 9) continue
      if (list.some((t) => Math.hypot(t.x - x, t.z - z) < 12)) continue
      list.push({
        x, z,
        y: terrainHeight(x, z) - 0.15,
        scale: 1.6 + rng() * 0.7,
        rot: rng() * Math.PI * 2,
        foliage: FOLIAGE[Math.floor(rng() * FOLIAGE.length)],
        seed: list.length,
      })
    }
    return list
  }, [])
}

function Tree({ spec }: { spec: TreeSpec }) {
  const { trunkGeo, crownGeo } = useMemo(() => {
    const rng = mulberry32(1000 + spec.seed * 37)
    const trunkH = 2.4 + rng() * 1.6
    const baseCol = new THREE.Color(spec.foliage)

    // 树干 + 2~3 根斜出分枝,merge 成单一几何体
    const wood: THREE.BufferGeometry[] = []
    const trunk = new THREE.CylinderGeometry(0.11, 0.26, trunkH, 10)
    trunk.translate(0, trunkH / 2, 0)
    wood.push(trunk)
    const branchCount = 2 + Math.floor(rng() * 2)
    for (let i = 0; i < branchCount; i++) {
      const bl = 1.1 + rng() * 1.2
      const b = new THREE.CylinderGeometry(0.035, 0.07, bl, 7)
      b.translate(0, bl / 2, 0)
      b.rotateZ(0.55 + rng() * 0.5)
      b.rotateY(rng() * Math.PI * 2)
      b.translate(0, trunkH * (0.55 + rng() * 0.35), 0)
      wood.push(b)
    }
    const trunkMerged = mergeGeometries(wood)!
    wood.forEach((w) => w.dispose())

    // 树冠:9~13 个细分球块在扁椭球壳上分布,逐块 HSL 微移形成双色斑驳
    const blobs: THREE.BufferGeometry[] = []
    const n = 9 + Math.floor(rng() * 5)
    const cTmp = new THREE.Color()
    for (let i = 0; i < n; i++) {
      const g = new THREE.IcosahedronGeometry(1, 1)
      const s = 0.55 + rng() * 0.75
      g.scale(s * (1 + rng() * 0.3), s * (0.7 + rng() * 0.3), s * (1 + rng() * 0.3))
      const theta = rng() * Math.PI * 2
      const phi = Math.acos(2 * rng() - 1)
      const rad = i < 3 ? 0.6 : 1.2 + rng() * 1.1
      g.translate(
        Math.sin(phi) * Math.cos(theta) * rad * 1.25,
        trunkH + 0.4 + Math.cos(phi) * rad * 0.8,
        Math.sin(phi) * Math.sin(theta) * rad * 1.25,
      )
      cTmp
        .copy(baseCol)
        .offsetHSL((rng() - 0.5) * 0.04, (rng() - 0.5) * 0.1, (rng() - 0.35) * 0.14)
      const cnt = g.attributes.position.count
      const colArr = new Float32Array(cnt * 3)
      for (let v = 0; v < cnt; v++) {
        colArr[v * 3] = cTmp.r
        colArr[v * 3 + 1] = cTmp.g
        colArr[v * 3 + 2] = cTmp.b
      }
      g.setAttribute('color', new THREE.BufferAttribute(colArr, 3))
      blobs.push(g)
    }
    const crown = mergeGeometries(blobs)!
    blobs.forEach((b) => b.dispose())
    return { trunkGeo: trunkMerged, crownGeo: crown }
  }, [spec.seed])

  return (
    <group position={[spec.x, spec.y, spec.z]} rotation-y={spec.rot} scale={spec.scale}>
      <mesh geometry={trunkGeo} castShadow>
        <meshStandardMaterial color="#5d3f27" roughness={1} />
      </mesh>
      <mesh geometry={crownGeo} castShadow>
        <meshStandardMaterial vertexColors roughness={1} />
      </mesh>
    </group>
  )
}

export function Trees() {
  const specs = useTreeSpecs()
  return (
    <group>
      {specs.map((s) => (
        <Tree key={s.seed} spec={s} />
      ))}
    </group>
  )
}

/** 圆润岩石:12 块压扁的细分十二面体 merge 成单 mesh,一半沿路分布 */
export function Rocks() {
  const geometry = useMemo(() => {
    const rng = mulberry32(4242)
    const geos: THREE.BufferGeometry[] = []
    for (let i = 0; i < 12; i++) {
      const g = new THREE.DodecahedronGeometry(1, 1)
      const s = 0.4 + rng() * 1.1
      g.scale(s * (0.8 + rng() * 0.5), s * 0.62, s * (0.8 + rng() * 0.5))
      g.rotateY(rng() * Math.PI)
      let x: number
      let z: number
      if (rng() < 0.5) {
        z = (rng() - 0.5) * 180
        const side = rng() < 0.5 ? -1 : 1
        x = pathX(z) + side * (2.2 + rng() * 2.5)
      } else {
        const a = rng() * Math.PI * 2
        const r = 12 + rng() * 70
        x = Math.cos(a) * r
        z = Math.sin(a) * r
      }
      g.translate(x, terrainHeight(x, z) + s * 0.18, z)
      geos.push(g)
    }
    const merged = mergeGeometries(geos)!
    geos.forEach((g) => g.dispose())
    return merged
  }, [])

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color="#6d635a" roughness={1} />
    </mesh>
  )
}
