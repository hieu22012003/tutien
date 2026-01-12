import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useHandStore, CONFIG } from '../store';

export function ShieldOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const targetPosition = useHandStore.getState().targetPosition;
    const isTracking = useHandStore.getState().isTracking;
    const gestureMode = useHandStore.getState().gestureMode;
    const time = clock.getElapsedTime();

    // 只在护盾模式显示
    const shouldShow = isTracking && gestureMode === 'SHIELD';

    if (meshRef.current && glowRef.current) {
      // 可见性和透明度
      const targetOpacity = shouldShow ? 0.3 : 0;
      const currentOpacity = (
        meshRef.current.material as THREE.MeshBasicMaterial
      ).opacity;
      const newOpacity = THREE.MathUtils.lerp(
        currentOpacity,
        targetOpacity,
        0.1
      );

      (meshRef.current.material as THREE.MeshBasicMaterial).opacity =
        newOpacity;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        newOpacity * 0.5;

      meshRef.current.visible = newOpacity > 0.01;
      glowRef.current.visible = newOpacity > 0.01;

      // 位置跟随
      const currentPos = isTracking
        ? targetPosition
        : new THREE.Vector3(
            Math.sin(time * 0.5) * 6,
            Math.cos(time * 0.4) * 4,
            Math.sin(time * 0.3) * 3
          );

      meshRef.current.position.lerp(currentPos, 0.1);
      glowRef.current.position.lerp(currentPos, 0.1);

      // 缩放呼吸效果
      const breathe = 1 + Math.sin(time * 2) * 0.03;
      meshRef.current.scale.setScalar(breathe);
      glowRef.current.scale.setScalar(breathe * 1.15);

      // 旋转
      meshRef.current.rotation.y = time * 0.2;
      meshRef.current.rotation.x = time * 0.1;
    }
  });

  // 内层球体 - 半透明蓝白色
  const innerMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x88ccff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  // 外层光晕 - 更大更淡
  const glowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x4488ff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  return (
    <group>
      {/* 内层球体 */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[CONFIG.shieldRadius * 0.98, 2]} />
        <primitive object={innerMaterial} attach="material" />
      </mesh>

      {/* 外层光晕 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[CONFIG.shieldRadius * 1.1, 32, 32]} />
        <primitive object={glowMaterial} attach="material" />
      </mesh>
    </group>
  );
}
