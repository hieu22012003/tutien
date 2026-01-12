import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useHandStore } from '../store';

// 访问共享的剑位置数组
declare global {
  interface Window {
    swordPositions?: THREE.Vector3[];
  }
}

export function CameraController() {
  const { camera } = useThree();

  // 统一平滑参数
  // 统一平滑参数
  const SMOOTH_SPEED = 0.02; // 2秒左右的过渡时间，与剑阵变大速度同步

  // 状态
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const smoothCamPos = useRef(new THREE.Vector3(0, 5, 35));
  const smoothLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const smoothZoom = useRef(30);

  useFrame(({ clock }) => {
    // const targetPosition = useHandStore.getState().targetPosition;
    const isTracking = useHandStore.getState().isTracking;
    const time = clock.getElapsedTime();
    const positions = window.swordPositions;

    // === 1. 计算剑阵中心和大小 ===
    let formationSize = 10;
    const formationCenter = new THREE.Vector3(0, 0, 0);

    if (positions && positions.length > 0) {
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      let sumX = 0,
        sumY = 0,
        sumZ = 0;

      for (const pos of positions) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        sumX += pos.x;
        sumY += pos.y;
        sumZ += pos.z;
      }

      // 剑阵中心
      formationCenter.set(
        sumX / positions.length,
        sumY / positions.length,
        sumZ / positions.length
      );

      // 计算最大跨度
      const spanX = maxX - minX;
      const spanY = maxY - minY;
      formationSize = Math.max(spanX, spanY);
    }

    // === 2. 计算目标缩放距离 ===
    const gestureMode = useHandStore.getState().gestureMode; // 获取当前模式

    const targetZoom = THREE.MathUtils.clamp(
      formationSize * 1.2 + 18,
      22,
      gestureMode === 'DAGENG' ? 55 : 75
    );

    smoothZoom.current = THREE.MathUtils.lerp(
      smoothZoom.current,
      targetZoom,
      SMOOTH_SPEED
    );

    // === 3. 计算跟随目标 ===
    let followPoint: THREE.Vector3;
    if (isTracking) {
      // 跟随剑阵中心，而不是手指位置
      followPoint = formationCenter.clone();
    } else {
      followPoint = new THREE.Vector3(
        Math.sin(time * 0.5) * 6,
        Math.cos(time * 0.4) * 4,
        0
      );
    }
    smoothTarget.current.lerp(followPoint, SMOOTH_SPEED);

    // === 4. 计算相机位置（与缩放协调）===
    const desiredCamPos = new THREE.Vector3(
      smoothTarget.current.x * 0.25, // 轻微左右跟随
      smoothTarget.current.y * 0.15 + 3, // 轻微上下跟随
      smoothZoom.current // 使用平滑后的缩放
    );
    smoothCamPos.current.lerp(desiredCamPos, SMOOTH_SPEED);
    camera.position.copy(smoothCamPos.current);

    // === 5. 计算注视点（与跟随协调）===
    const desiredLookAt = new THREE.Vector3(
      smoothTarget.current.x * 0.4,
      smoothTarget.current.y * 0.25,
      4 // 注视剑阵所在平面
    );
    smoothLookAt.current.lerp(desiredLookAt, SMOOTH_SPEED);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}
