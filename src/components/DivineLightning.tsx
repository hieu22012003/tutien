import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHandStore, CONFIG } from '../store';

// 获取 SwordSwarm 的 positions（需要共享）
// 为了简化，这里我们自己维护一份 positions 引用
// 实际上应该通过 store 共享，但为了保持原有逻辑简洁，使用 window

declare global {
  interface Window {
    swordPositions?: THREE.Vector3[];
  }
}

export function DivineLightning() {
  const lineRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(100 * 3 * 2); // 100 条线段
    geo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    return geo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // 强度平滑过渡 ref
  const intensityRef = useRef(0);

  useFrame(({ clock }) => {
    if (!lineRef.current) return;

    const isTracking = useHandStore.getState().isTracking;
    const gestureMode = useHandStore.getState().gestureMode;
    const time = clock.getElapsedTime();

    // 目标强度：大庚模式为 1，其他为 0
    const targetIntensity = gestureMode === 'DAGENG' ? 1 : 0;
    // 平滑插值：速度与剑体变大一致 (0.02)
    intensityRef.current = THREE.MathUtils.lerp(
      intensityRef.current,
      targetIntensity,
      0.02
    );
    const intensity = intensityRef.current;

    // 动态计算参数
    // 闪烁速度：15 -> 25
    const flashSpeed = 15 + intensity * 10;
    // 闪烁阈值：0.7 -> 0.4 (值越小闪烁越久)
    const flashThreshold = 0.7 - intensity * 0.3;

    // 连接线数量：30 -> 100
    const count = Math.floor(30 + intensity * 70);
    // 连接距离：5 -> 25
    const maxDist = 5 + intensity * 20;
    // 抖动：0.2 -> 0.5
    const jitter = 0.2 + intensity * 0.3;

    // 闪烁逻辑
    const flash = Math.sin(time * flashSpeed) > flashThreshold;
    lineRef.current.visible = flash && isTracking;
    if (!flash || !isTracking) return;

    const positions = window.swordPositions;
    if (!positions || positions.length === 0) return;

    const posAttr = lineRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    let idx = 0;

    for (let i = 0; i < count; i++) {
      const a = Math.floor(Math.random() * CONFIG.swordCount);
      const b = Math.floor(Math.random() * CONFIG.swordCount);

      if (a >= positions.length || b >= positions.length) continue;

      const pA = positions[a];
      const pB = positions[b];

      if (pA.distanceTo(pB) < maxDist) {
        arr[idx++] = pA.x + (Math.random() - 0.5) * jitter;
        arr[idx++] = pA.y + (Math.random() - 0.5) * jitter;
        arr[idx++] = pA.z + (Math.random() - 0.5) * jitter;
        arr[idx++] = pB.x + (Math.random() - 0.5) * jitter;
        arr[idx++] = pB.y + (Math.random() - 0.5) * jitter;
        arr[idx++] = pB.z + (Math.random() - 0.5) * jitter;
      }
    }
    // 清空剩余
    while (idx < arr.length) arr[idx++] = 0;
    posAttr.needsUpdate = true;
  });

  return <lineSegments ref={lineRef} geometry={geometry} material={material} />;
}
