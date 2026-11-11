import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Bird {
  group: THREE.Group
  wingL: THREE.Mesh
  wingR: THREE.Mesh
  offset: number
  radius: number
  height: number
  speed: number
}

/** 3 只远景飞鸟剪影:双翼三角面绕群圆盘旋,正弦拍翅 */
export function Birds() {
  const { root, birds } = useMemo(() => {
    const r = new THREE.Group()
    const mat = new THREE.MeshBasicMaterial({ color: '#40301f', side: THREE.DoubleSide })
    const wingGeo = new THREE.PlaneGeometry(1.1, 0.32)
    wingGeo.translate(0.55, 0, 0) // 翼根为旋转轴

    const list: Bird[] = []
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group()
      const wl = new THREE.Mesh(wingGeo, mat)
      const wr = new THREE.Mesh(wingGeo, mat)
      wr.scale.x = -1
      g.add(wl, wr)
      r.add(g)
      list.push({
        group: g,
        wingL: wl,
        wingR: wr,
        offset: i * 2.09,
        radius: 38 + i * 7,
        height: 21 + i * 3,
        speed: 0.05 + i * 0.012,
      })
    }
    return { root: r, birds: list }
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < birds.length; i++) {
      const b = birds[i]
      const a = t * b.speed + b.offset
      b.group.position.set(
        Math.cos(a) * b.radius,
        b.height + Math.sin(t * 0.6 + i * 2) * 1.4,
        Math.sin(a) * b.radius,
      )
      b.group.rotation.y = -a
      const f = Math.sin(t * 8 + i * 1.7) * 0.6
      b.wingL.rotation.z = 0.2 + f
      b.wingR.rotation.z = -0.2 - f
    }
  })

  return <primitive object={root} />
}
