/**
 * 运行环境探测与画质档位。
 * 在应用启动前一次性完成,避免场景初始化阶段再去试错。
 */

interface RendererProbe {
  supported: boolean
  renderer: string
}

function probeWebGL2(): RendererProbe {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
    if (!gl) return { supported: false, renderer: '' }
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { supported: true, renderer }
  } catch {
    return { supported: false, renderer: '' }
  }
}

const probe = typeof document === 'undefined' ? { supported: false, renderer: '' } : probeWebGL2()

export const webgl2Supported = probe.supported

const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i

const navigatorInfo = navigator as Navigator & { deviceMemory?: number }
const lowPower =
  webgl2Supported &&
  (SOFTWARE_RENDERER.test(probe.renderer) ||
    (navigatorInfo.hardwareConcurrency ?? 8) <= 4 ||
    (navigatorInfo.deviceMemory ?? 8) <= 4)

export const QUALITY = lowPower
  ? {
      grassCount: 55000,
      terrainSegments: 170,
      leafCount: 80,
      pollenCount: 90,
      dprMax: 1.2,
      shadowMapSize: 1024,
      multisampling: 0,
      clouds: false,
      effects: false,
    }
  : {
      grassCount: 150000,
      terrainSegments: 240,
      leafCount: 140,
      pollenCount: 160,
      dprMax: 1.75,
      shadowMapSize: 2048,
      multisampling: 4,
      clouds: true,
      effects: true,
    }
