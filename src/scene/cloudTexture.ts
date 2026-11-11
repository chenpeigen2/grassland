/**
 * 本地程序化云朵贴图:用离屏 Canvas 叠加柔和径向渐变生成,
 * 避免依赖 drei 默认的 GitHub CDN 图片(在部分网络下会长时间挂起)。
 */
export function makeCloudTexture(): string {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  let seed = 1337
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  ctx.clearRect(0, 0, size, size)
  for (let i = 0; i < 46; i++) {
    const x = size * (0.16 + rand() * 0.68)
    const y = size * (0.18 + rand() * 0.64)
    const r = size * (0.07 + rand() * 0.17)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.34)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.15)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  return canvas.toDataURL('image/png')
}
