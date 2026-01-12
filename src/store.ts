import { create } from 'zustand';
import * as THREE from 'three';

// =========== 配置参数 ===========
// 简单的移动端检测
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || window.innerWidth < 768;

export const CONFIG = {
  swordCount: isMobile ? 300 : 500,
  pathHistoryLength: 300,
  maxSpeed: 25,
  sprintSpeed: 50,
  steerForce: 28,
  separationDist: 3,
  separationForce: 10,
  noiseScale: 0.3, // 噪声缩放
  noiseStrength: 1, // 噪声强度
  formationRadius: 1.5, // 剑阵半径
  dragonDensity: 0.8, // 龙卷模式密度
  // 护盾模式参数
  shieldRadius: 18, // 护盾球体半径
  shieldOrbitSpeed: 2.5, // 轨道旋转速度
  // 莲花模式参数
  lotusRadius: 24, // 莲花半径
  lotusRotateSpeed: 2.5, // 莲花旋转速度
  // 大庚剑阵参数
  dagengRadius: 30, // 剑阵半径
  dagengHeight: 20, // 剑阵高度范围
  dagengRotateSpeed: 0.2, // 整体旋转速度
};

// 手势模式
export type GestureMode = 'DRAGON' | 'SHIELD' | 'LOTUS' | 'DAGENG';

interface HandState {
  targetPosition: THREE.Vector3;
  isTracking: boolean;
  gestureMode: GestureMode; // 当前手势模式
  pathHistory: THREE.Vector3[];
  lastDirection: THREE.Vector3;

  setTarget: (pos: THREE.Vector3) => void;
  setTracking: (tracking: boolean) => void;
  setGestureMode: (mode: GestureMode) => void;
  updatePath: (pos: THREE.Vector3) => void;
  extendPath: () => void;
}

export const useHandStore = create<HandState>((set, get) => ({
  targetPosition: new THREE.Vector3(0, 0, 0),
  isTracking: false,
  gestureMode: 'LOTUS',
  pathHistory: Array.from(
    { length: CONFIG.pathHistoryLength },
    () => new THREE.Vector3(0, 0, 0)
  ),
  lastDirection: new THREE.Vector3(0, 0, 0),

  setTarget: (pos) => set({ targetPosition: pos }),

  setTracking: (tracking) => set({ isTracking: tracking }),

  setGestureMode: (mode) => set({ gestureMode: mode }),

  updatePath: (pos) => {
    const { pathHistory, lastDirection } = get();
    const last = pathHistory[0];
    const diff = pos.clone().sub(last);
    const dist = diff.length();

    if (dist > 0.1) {
      lastDirection.copy(diff.normalize());
      pathHistory.pop();
      pathHistory.unshift(pos.clone());
    }
  },

  extendPath: () => {
    const { pathHistory, lastDirection } = get();
    if (lastDirection.length() < 0.01) return;

    const last = pathHistory[0];
    const newPoint = last
      .clone()
      .add(lastDirection.clone().multiplyScalar(0.3));
    pathHistory.pop();
    pathHistory.unshift(newPoint);
  },
}));
