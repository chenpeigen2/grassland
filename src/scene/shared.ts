import * as THREE from 'three'

/** 全局共享时间 uniform(秒)—— 所有风场动画的时钟源 */
export const uTime = { value: 0 }

/** 全局共享风力 uniform(0..1),由 UI 滑杆经 zustand 平滑驱动 */
export const uWind = { value: 0.55 }

/**
 * 太阳方向(黄金时刻)。
 * 方位角偏向初始机位视野左侧边缘:太阳晕轮部分出画,画面中央留给草原层次。
 */
export const SUN_DIR = new THREE.Vector3(-0.85, 0.14, -0.52).normalize()

/** 秋日琥珀雾色(压暗一档,避免中景被洗白) */
export const FOG_HEX = '#d9a86c'

/** 全局风向(XZ 平面单位向量)—— 草浪与落叶沿同一方向行进 */
export const WIND_DIR = new THREE.Vector2(0.85, 0.52).normalize()
