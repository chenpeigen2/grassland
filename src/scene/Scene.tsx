import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky, Cloud, Clouds, OrbitControls } from '@react-three/drei'
import {
  EffectComposer,
  Bloom,
  Vignette,
  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing'
import { uTime, uWind, SUN_DIR, FOG_HEX } from './shared'
import { QUALITY } from './capabilities'
import { makeCloudTexture } from './cloudTexture'
import { useGrassland } from '../store'
import { Terrain } from './Terrain'
import { Grass } from './Grass'
import { Trees, Rocks } from './Trees'
import { Leaves, Pollen } from './Leaves'
import { Birds } from './Birds'

const sunPosition = SUN_DIR.clone().multiplyScalar(100).toArray() as [number, number, number]

export function Scene() {
  const cloudTexture = useMemo(() => (QUALITY.clouds ? makeCloudTexture() : ''), [])

  // 时钟与风力的唯一驱动点:uTime/uWind 是被所有材质共享的同一 uniform 对象
  useFrame((state, delta) => {
    uTime.value = state.clock.elapsedTime
    const target = useGrassland.getState().wind
    uWind.value += (target - uWind.value) * Math.min(1, delta * 2.5)
  })

  return (
    <>
      <fog attach="fog" args={[FOG_HEX, 70, 200]} />

      <Sky
        distance={3000}
        sunPosition={sunPosition}
        turbidity={6}
        rayleigh={2.4}
        mieCoefficient={0.006}
        mieDirectionalG={0.8}
      />

      {QUALITY.clouds && cloudTexture && (
        <Clouds texture={cloudTexture} limit={120}>
          <Cloud seed={3} segments={12} bounds={[70, 5, 26]} volume={10} position={[-50, 26, -110]} color="#ffe8cf" opacity={0.26} speed={0.08} />
          <Cloud seed={7} segments={9} bounds={[60, 4, 22]} volume={9} position={[60, 30, -90]} color="#ffe4c4" opacity={0.2} speed={0.06} />
        </Clouds>
      )}

      <hemisphereLight args={['#ffd9a8', '#57451f', 0.75]} />
      <directionalLight
        position={[SUN_DIR.x * 120, SUN_DIR.y * 120, SUN_DIR.z * 120]}
        color="#ffc978"
        intensity={2.6}
        castShadow
        shadow-mapSize={[QUALITY.shadowMapSize, QUALITY.shadowMapSize]}
        shadow-camera-left={-85}
        shadow-camera-right={85}
        shadow-camera-top={85}
        shadow-camera-bottom={-85}
        shadow-camera-near={20}
        shadow-camera-far={300}
        shadow-bias={-0.0004}
        shadow-normalBias={0.6}
      />

      <Terrain />
      <Grass />
      <Trees />
      <Rocks />
      <Leaves />
      <Pollen />
      <Birds />

      <OrbitControls
        makeDefault
        target={[0, 2.5, 0]}
        enableDamping
        dampingFactor={0.06}
        enablePan={false}
        minDistance={4}
        maxDistance={60}
        minPolarAngle={0.12}
        maxPolarAngle={Math.PI / 2 - 0.035}
        autoRotate
        autoRotateSpeed={0.1}
      />

      {QUALITY.effects && (
        <EffectComposer multisampling={QUALITY.multisampling}>
          {/* 光晕收敛:阈值抬高 + 强度降低,只留轮廓高光的柔性溢光 */}
          <Bloom mipmapBlur intensity={0.28} luminanceThreshold={0.85} luminanceSmoothing={0.15} />
          {/* 轻度暖色分级:对抗大气洗白,找回对比与饱和 */}
          <BrightnessContrast contrast={0.06} brightness={0} />
          <HueSaturation saturation={0.08} />
          <Vignette offset={0.22} darkness={0.6} />
        </EffectComposer>
      )}
    </>
  )
}
