import { Component, useEffect, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { Overlay } from './ui/Overlay'
import { useGrassland } from './store'
import { QUALITY, webgl2Supported } from './scene/capabilities'
import poster from './assets/poster.jpg'

function Fallback({ reason }: { reason: 'webgl' | 'render' }) {
  const setReady = useGrassland((s) => s.setReady)
  useEffect(() => {
    setReady(true)
  }, [setReady])

  return (
    <div className="fallback">
      <img className="fallback-bg" src={poster} alt="" />
      <div className="fallback-card">
        <h1>秋 · 草原</h1>
        <p>
          {reason === 'webgl'
            ? '当前浏览器未启用 WebGL2，3D 场景无法启动。'
            : '3D 场景初始化失败，已切换为静态预览。'}
        </p>
        <p className="fallback-hint">
          请开启浏览器“硬件加速”，或使用最新版 Chrome / Edge / Safari 后重试。
        </p>
        <button className="fallback-retry" onClick={() => location.reload()}>
          重新加载
        </button>
      </div>
    </div>
  )
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[scene]', error)
  }

  render() {
    return this.state.failed ? <Fallback reason="render" /> : this.props.children
  }
}

export default function App() {
  const setReady = useGrassland((s) => s.setReady)

  if (!webgl2Supported) return <Fallback reason="webgl" />

  return (
    <div className="app">
      <SceneBoundary>
        <Canvas
          shadows
          dpr={[1, QUALITY.dprMax]}
          gl={{ antialias: false }}
          camera={{ fov: 50, near: 0.1, far: 1200, position: [20, 3.4, 27] }}
          onCreated={() => setReady(true)}
        >
          <Scene />
        </Canvas>
      </SceneBoundary>
      <Overlay />
    </div>
  )
}
