import { useEffect, useRef, useState } from 'react'
import { useGrassland } from '../store'

export function Overlay() {
  const wind = useGrassland((s) => s.wind)
  const setWind = useGrassland((s) => s.setWind)
  const ready = useGrassland((s) => s.ready)
  const [slow, setSlow] = useState(false)
  const [playing, setPlaying] = useState(false)
  const musicButton = useRef<HTMLButtonElement>(null)
  const userPaused = useRef(false)
  const [audio] = useState(() => {
    const element = new Audio(`${import.meta.env.BASE_URL}audio/ahead-of-us.m4a`)
    element.autoplay = true
    element.loop = true
    element.preload = 'auto'
    element.volume = 0.32
    return element
  })

  useEffect(() => {
    const handlePlay = () => {
      setPlaying(true)
      removeUnlockListeners()
    }
    const handlePause = () => setPlaying(false)
    const attemptPlay = () => {
      if (!userPaused.current) void audio.play().catch(() => {})
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!musicButton.current?.contains(event.target as Node)) attemptPlay()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!musicButton.current?.contains(event.target as Node)) attemptPlay()
    }
    const removeUnlockListeners = () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    attemptPlay()

    return () => {
      removeUnlockListeners()
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.pause()
    }
  }, [audio])

  const toggleMusic = () => {
    if (!audio.paused) {
      userPaused.current = true
      audio.pause()
      return
    }
    userPaused.current = false
    void audio.play().catch(() => setPlaying(false))
  }

  useEffect(() => {
    if (ready) {
      setSlow(false)
      return
    }
    const timer = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(timer)
  }, [ready])

  return (
    <>
      <div className={`veil ${ready ? 'hide' : ''}`}>
        <div className="veil-title">秋 · 草原</div>
        <div className="veil-sub">{slow ? '场景初始化较慢 …' : '草原正在生长 …'}</div>
        {slow && (
          <>
            <div className="veil-hint">
              如果长时间没有画面，请确认浏览器已开启“硬件加速”，或换用最新版 Chrome / Edge / Safari。
            </div>
            <button className="veil-retry" onClick={() => location.reload()}>
              重新加载
            </button>
          </>
        )}
      </div>

      <div className="ui">
        <header className="brand">
          <h1>秋 · 草原</h1>
        </header>
        <footer className="hud">
          <span className="hint">拖动环视 · 滚轮推近</span>
          <div className="hud-controls">
            <button
              ref={musicButton}
              type="button"
              className="music"
              aria-label={playing ? '暂停配乐' : '播放配乐'}
              title="Ahead of Us · 小瀬村晶"
              onClick={toggleMusic}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <path d="M9 18V5l10-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="16" cy="16" r="3" />
              </svg>
              {playing ? '配乐中' : '开启配乐'}
            </button>
            <label className="wind">
              风
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={wind}
                onChange={(e) => setWind(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </footer>
      </div>
    </>
  )
}
