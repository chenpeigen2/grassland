/** 可复现的种子随机数(mulberry32) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 整数格点哈希 → [0,1) */
function hash2(ix: number, iy: number): number {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** 一维确定性随机(用于逐顶点抖动) */
export function rand01(n: number): number {
  const s = Math.sin(n) * 43758.5453
  return s - Math.floor(s)
}

const fade = (t: number) => t * t * (3 - 2 * t)

/** 2D 值噪声,输出 [0,1] */
export function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = hash2(ix, iy)
  const b = hash2(ix + 1, iy)
  const c = hash2(ix, iy + 1)
  const d = hash2(ix + 1, iy + 1)
  const ux = fade(fx)
  const uy = fade(fy)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

/** 分形布朗运动,输出归一化 [0,1] */
export function fbm(x: number, y: number, octaves = 4): number {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    v += amp * valueNoise(x * f, y * f)
    amp *= 0.5
    f *= 2.03
  }
  return v / (1 - Math.pow(0.5, octaves))
}

export function smoothstep(a: number, b: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

/**
 * 地形高度场 —— 地形 / 草 / 树 / 岩石共用同一函数,保证万物贴合地面。
 * fBm 起伏 + 中央区域压平(相机活动区)。
 */
export function terrainHeight(x: number, z: number): number {
  const base = fbm(x * 0.018 + 7.3, z * 0.018 - 3.1, 4)
  const detail = fbm(x * 0.06, z * 0.06, 3)
  let h = (base - 0.45) * 16 + (detail - 0.5) * 2.2
  const r = Math.hypot(x, z)
  const flat = smoothstep(8, 58, r)
  h *= 0.15 + 0.85 * flat
  return h
}

/** 蜿蜒土路的中心线 x = pathX(z) */
export function pathX(z: number): number {
  return Math.sin(z * 0.045) * 13 + Math.sin(z * 0.013 + 1.7) * 9
}
