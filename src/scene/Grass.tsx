import { useMemo } from 'react'
import * as THREE from 'three'
import { terrainHeight, pathX, fbm, smoothstep, mulberry32 } from './noise'
import { uTime, uWind, WIND_DIR } from './shared'
import { QUALITY } from './capabilities'

const COUNT = QUALITY.grassCount
const RADIUS = 85

/** 单株草叶:7 顶点 5 三角形,更窄的锥形轮廓 + 两段弯曲,避免硬三角剪影 */
function bladeGeometry(): THREE.BufferGeometry {
  const hw = 0.055
  const verts = new Float32Array([
    -hw, 0, 0,
    hw, 0, 0,
    -hw * 0.66, 0.42, 0.045,
    hw * 0.66, 0.42, 0.045,
    -hw * 0.34, 0.74, 0.115,
    hw * 0.34, 0.74, 0.115,
    0, 1, 0.22,
  ])
  const indices = [0, 1, 3, 0, 3, 2, 2, 3, 5, 2, 5, 4, 4, 5, 6]

  // 法线全部朝上:整片草像地面一样受光,避免双面翻转造成的明暗噪声
  const normals = new Float32Array(21)
  for (let i = 1; i < 21; i += 3) normals[i] = 1

  // 顶点色沿高度连续渐变:根部深橄榄 → 中段赭金 → 叶尖亮金
  const colors = new Float32Array(21)
  const cBot = new THREE.Color('#3f3617')
  const cMid = new THREE.Color('#a8862a')
  const cTop = new THREE.Color('#ffc94d')
  const heights = [0, 0, 0.42, 0.42, 0.74, 0.74, 1]
  const c = new THREE.Color()
  for (let i = 0; i < 7; i++) {
    const y = heights[i]
    if (y < 0.5) c.copy(cBot).lerp(cMid, y / 0.5)
    else c.copy(cMid).lerp(cTop, (y - 0.5) / 0.5)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.setIndex(indices)
  return geo
}

export function Grass() {
  const mesh = useMemo(() => {
    const geo = bladeGeometry()
    // emissive 暖色自发光:抬升背光面,避免草浪陷入暗红
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      emissive: new THREE.Color('#33240a'),
    })

    // 风场注入:begin_vertex 之后偏移 transformed,位移 ∝ height²(根部固定、叶尖摆动)。
    // 摆动沿全局风向 → 阵风波纹有方向性地掠过草浪,而不是各株乱抖。
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime
      shader.uniforms.uWind = uWind
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          [
            '#include <common>',
            'uniform float uTime;',
            'uniform float uWind;',
            'attribute vec2 iData;',
            'const vec2 windDir = vec2(' + WIND_DIR.x.toFixed(4) + ', ' + WIND_DIR.y.toFixed(4) + ');',
          ].join('\n'),
        )
        .replace(
          '#include <begin_vertex>',
          [
            '#include <begin_vertex>',
            '{',
            '  float gPhase = iData.x;',
            '  float gLean = iData.y;',
            '  vec2 iPos = vec2(instanceMatrix[3].x, instanceMatrix[3].z);',
            '  float gust = sin(iPos.x * 0.055 + iPos.y * 0.048 + uTime * 1.2) * 0.5 + 0.5;',
            '  float sway = sin(uTime * 1.7 + gPhase) * 0.6 + sin(uTime * 3.3 + gPhase * 1.7) * 0.25;',
            '  float hh = position.y * position.y;',
            '  float wave = sway * uWind * (0.3 + 0.85 * gust) * 0.55;',
            '  transformed.x += wave * windDir.x * hh + gLean * hh;',
            '  transformed.z += wave * windDir.y * hh + cos(uTime * 1.1 + gPhase) * 0.1 * uWind * hh;',
            '}',
          ].join('\n'),
        )
      // 双面渲染时禁止法线按朝向翻转,保持整片草地受光一致
      if (shader.fragmentShader.includes('#include <normal_fragment_begin>')) {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <normal_fragment_begin>',
          'vec3 normal = normalize( vNormal );',
        )
      }
    }

    const m = new THREE.InstancedMesh(geo, mat, COUNT)
    m.receiveShadow = true
    m.frustumCulled = false

    const dummy = new THREE.Object3D()
    const data = new Float32Array(COUNT * 2) // x: 相位, y: 静态倾倒
    const rng = mulberry32(20241111)
    const tintA = new THREE.Color('#ffd978') // 暖金
    const tintB = new THREE.Color('#ff7f2a') // 橙红
    const tint = new THREE.Color()

    let placed = 0
    let attempts = 0
    while (placed < COUNT && attempts < COUNT * 4) {
      attempts++
      // 径向密度偏置:r^1.55 让近景密度远高于远景(近景精致、远景藏雾)
      const a = rng() * Math.PI * 2
      const r = RADIUS * Math.pow(rng(), 1.55)
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r

      // 土路上不长草
      const pf = 1 - smoothstep(1.6, 5.0, Math.abs(x - pathX(z)))
      if (rng() < pf * 0.96) continue

      // 噪声驱动成簇分布,模拟自然草丛疏密
      const clump = fbm(x * 0.09 + 3.7, z * 0.09 + 9.2, 2)
      if (rng() > 0.3 + clump * 0.9) continue

      let s = 0.5 + Math.pow(rng(), 1.5) * 0.85
      s *= 1 + 0.15 * smoothstep(40, 5, r) // 近景株稍高,增强近景细节
      dummy.position.set(x, terrainHeight(x, z) - 0.05, z)
      dummy.rotation.y = rng() * Math.PI * 2
      dummy.scale.set(s, s * (0.8 + rng() * 0.4), s)
      dummy.updateMatrix()
      m.setMatrixAt(placed, dummy.matrix)

      // 色调 = 随机 + 大尺度色斑(整片偏金/偏橙的色块),少量苍白枯秆点缀
      const patch = fbm(x * 0.05 + 21, z * 0.05 + 4, 2)
      if (rng() < 0.05) {
        tint.set('#fff3c2')
      } else {
        // 偏金为主、少数偏橙,叠加色斑扰动
        tint.copy(tintA).lerp(tintB, THREE.MathUtils.clamp(rng() * 0.7 + (patch - 0.5) * 0.5, 0, 1))
      }
      m.setColorAt(placed, tint)

      data[placed * 2] = rng() * Math.PI * 2
      data[placed * 2 + 1] = (rng() - 0.5) * 0.35
      placed++
    }
    m.count = placed
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
    geo.setAttribute('iData', new THREE.InstancedBufferAttribute(data, 2))
    return m
  }, [])

  return <primitive object={mesh} />
}
