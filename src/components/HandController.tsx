import { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHandStore } from '../store';
import type { GestureMode } from '../store';
import {
  globalVideo,
  globalLandmarker,
  detectGesture,
} from '../services/HandTrackingService';

// 记录上一帧时间防止重复检测
let lastVideoTime = -1;

// Canvas 内部组件：只负责处理帧更新
export function HandController() {
  const { camera } = useThree();
  const setTarget = useHandStore((state) => state.setTarget);
  const setTracking = useHandStore((state) => state.setTracking);
  const setGestureMode = useHandStore((state) => state.setGestureMode);
  const updatePath = useHandStore((state) => state.updatePath);

  // 防抖状态
  const pendingGesture = useRef<GestureMode | null>(null);
  const gestureStartTime = useRef<number>(0);
  const currentConfirmedGesture = useRef<GestureMode>('LOTUS'); // 默认初始状态

  useFrame(({ clock }) => {
    if (!globalLandmarker || !globalVideo || globalVideo.readyState !== 4)
      return;
    if (globalVideo.currentTime === lastVideoTime) return;

    lastVideoTime = globalVideo.currentTime;
    const results = globalLandmarker.detectForVideo(
      globalVideo,
      performance.now()
    );

    if (results.landmarks && results.landmarks.length > 0) {
      setTracking(true);
      const lm = results.landmarks[0];

      // 1. 检测瞬时手势
      const detectedGesture = detectGesture(lm);

      // 2. 防抖逻辑
      const now = clock.getElapsedTime();

      if (detectedGesture !== pendingGesture.current) {
        // 如果检测到的手势变了，重置计时器
        pendingGesture.current = detectedGesture;
        gestureStartTime.current = now;
      } else {
        // 如果手势保持一致
        const duration = now - gestureStartTime.current;
        const DELAY_THRESHOLD = 0.25; // 0.25秒延迟

        // 只有持续时间超过阈值，且与当前确认的手势不同，才切换
        if (
          duration > DELAY_THRESHOLD &&
          detectedGesture !== currentConfirmedGesture.current
        ) {
          currentConfirmedGesture.current = detectedGesture;
          setGestureMode(detectedGesture);
        }
      }

      // 始终使用"当前确认的手势"来决定逻辑
      const activeGesture = currentConfirmedGesture.current;

      // 计算手掌中心（用于护盾模式和莲花模式）或食指位置（用于游龙模式）
      let targetPoint: { x: number; y: number };

      if (activeGesture === 'SHIELD' || activeGesture === 'LOTUS') {
        // 手掌中心：使用手腕和中指根部的中点
        const wrist = lm[0];
        const middleBase = lm[9];
        targetPoint = {
          x: (wrist.x + middleBase.x) / 2,
          y: (wrist.y + middleBase.y) / 2,
        };
      } else {
        // 食指指尖
        targetPoint = lm[8];
      }

      const ndcX = (1 - targetPoint.x) * 2 - 1;
      const ndcY = -(targetPoint.y * 2 - 1);

      const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const dist = -camera.position.z / dir.z;
      const worldPos = camera.position.clone().add(dir.multiplyScalar(dist));

      setTarget(worldPos);

      // 只在游龙模式下更新路径
      if (activeGesture === 'DRAGON') {
        updatePath(worldPos);
      }
    } else {
      setTracking(false);
      // 丢失追踪时不重置手势，保持上一次的状态，防止闪烁
      // 也可以选择在丢失追踪一段时间后重置，这里先保持简单
    }
  });

  return null;
}
