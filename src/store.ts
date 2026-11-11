import { create } from 'zustand'

interface GrasslandState {
  /** 风力强度 0..1,桥接 UI 滑杆与 shader uniform */
  wind: number
  setWind: (w: number) => void
  /** 首帧渲染完成,收起加载面纱 */
  ready: boolean
  setReady: (v: boolean) => void
}

export const useGrassland = create<GrasslandState>((set) => ({
  wind: 0.55,
  setWind: (wind) => set({ wind }),
  ready: false,
  setReady: (ready) => set({ ready }),
}))
