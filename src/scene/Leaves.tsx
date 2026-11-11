import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mulberry32 } from './noise'
import { uWind } from './shared'
import { QUALITY } from './capabilities'

const COUNT = QUALITY.leafCount
const WRAP_H = 12

const PALETTE = ['#d9822b', '#e6a23c', '#c9552e', '#e8b04b', '#b7742c'].map((c) => new THREE.Color(c))

interface Leaf {
  x: number
  z: number
  y0: number
  speed: number
  phase: number
  tumble: number
  size: number
}

/** 圆润披针形叶片:正弦宽度轮廓 + 抬高的中脊,边缘连续无直角 */
function leafGeometry(): THREE.BufferGeometry {
  const SEGMENTS = 8
  const LENGTH = 0.26
  const HALF_WIDTH = 0.05
  const positions: number[] = []
  const colors: number[] = []

  const widthAt = (t: number) => HALF_WIDTH * Math.sin(Math.PI * Math.pow(t, 0.85)) * (0.85 + 0.15 * t)
  const shadeAt = (t: number) => 0.62 + 0.38 * (1 - t)

  // 右缘:叶尖 → 叶柄;左缘:叶柄 → 叶尖(两端点不重复)
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    positions.push(widthAt(t), (0.5 - t) * LENGTH, 0.012 * Math.sin(Math.PI * t))
    const s = shadeAt(t)
    colors.push(s, s, s)
  }
  for (let i = SEGMENTS - 1; i >= 1; i--) {
    const t = i / SEGMENTS
    positions.push(-widthAt(t), (0.5 - t) * LENGTH, 0.012 * Math.sin(Math.PI * t))
    const s = shadeAt(t)
    colors.push(s, s, s)
  }

  const outlineCount = positions.length / 3
  positions.push(0, 0, 0.032)
  colors.push(0.9, 0.9, 0.9)

  const indices: number[] = []
  for (let i = 0; i < outlineCount; i++) {
    indices.push(outlineCount, i, (i + 1) % outlineCount)
  }

  const normals = new Array(outlineCount + 1).fill(0).flatMap(() => [0, 0, 1])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(indices)
  return geo
}

/** 翻滚落叶:实例化叶形面片,CPU 积分下落 + 风致漂移,出界后从顶部回收 */
export function Leaves() {
  const { mesh, leaves, dummy } = useMemo(() => {
    const rng = mulberry32(99)
    const geo = leafGeometry()
    // 自发光暖色剪影:背光下也能读出秋天叶色,而不是黑色碎屑
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true, vertexColors: true })
    mat.color = new THREE.Color('#ffffff')
    const m = new THREE.InstancedMesh(geo, mat, COUNT)
    m.frustumCulled = false
    const ls: Leaf[] = []
    for (let i = 0; i < COUNT; i++) {
      const leaf: Leaf = {
        x: (rng() - 0.5) * 60,
        z: (rng() - 0.5) * 60,
        y0: rng() * WRAP_H * 0.8,
        speed: 0.5 + rng() * 0.9,
        phase: rng() * Math.PI * 2,
        tumble: 1 + rng() * 2.5,
        size: 0.65 + rng() * 0.5,
      }
      ls.push(leaf)
      // 逐叶加深一点明度差,避免死板
      const c = PALETTE[Math.floor(rng() * PALETTE.length)].clone()
      c.multiplyScalar(0.75 + rng() * 0.35)
      m.setColorAt(i, c)
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    return { mesh: m, leaves: ls, dummy: new THREE.Object3D() }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const w = uWind.value
    for (let i = 0; i < leaves.length; i++) {
      const L = leaves[i]
      const fall = L.y0 + t * L.speed * (0.35 + w * 1.3)
      const y = 0.5 + WRAP_H - (((fall % WRAP_H) + WRAP_H) % WRAP_H)
      const x = L.x + Math.sin(t * 0.8 + L.phase) * (1.2 + w * 2.6) + Math.sin(t * 0.27 + L.phase * 2.3) * 2.5 * w
      const z = L.z + Math.cos(t * 0.65 + L.phase * 1.4) * (1.0 + w * 2.2)
      dummy.position.set(x, y, z)
      dummy.rotation.set(
        t * L.tumble + L.phase,
        t * L.tumble * 0.7 + L.phase * 2,
        Math.sin(t * 1.3 + L.phase) * 0.9,
      )
      dummy.scale.setScalar(L.size)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return <primitive object={mesh} />
}

const MOTES = QUALITY.pollenCount

/** 逆光花粉/尘埃:加性混合的微光点,在镜头附近缓慢漂浮,给空气加"呼吸感" */
export function Pollen() {
  const { points, attr, base } = useMemo(() => {
    const rng = mulberry32(7)
    const arr = new Float32Array(MOTES * 3)
    const baseArr = new Float32Array(MOTES * 3)
    for (let i = 0; i < MOTES; i++) {
      const x = (rng() - 0.5) * 44
      const y = 0.5 + rng() * 7
      const z = (rng() - 0.5) * 44
      arr[i * 3] = x
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = z
      baseArr[i * 3] = x
      baseArr[i * 3 + 1] = y
      baseArr[i * 3 + 2] = z
    }
    const geo = new THREE.BufferGeometry()
    const position = new THREE.BufferAttribute(arr, 3)
    geo.setAttribute('position', position)
    const mat = new THREE.PointsMaterial({
      color: '#ffd9a0',
      size: 0.07,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const p = new THREE.Points(geo, mat)
    p.frustumCulled = false
    return { points: p, attr: position, base: baseArr }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const arr = attr.array as Float32Array
    for (let i = 0; i < MOTES; i++) {
      arr[i * 3] = base[i * 3] + Math.sin(t * 0.3 + i) * 1.5
      arr[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.45 + i * 1.7) * 0.8
      arr[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.25 + i * 0.8) * 1.5
    }
    attr.needsUpdate = true
  })

  return <primitive object={points} />
}
