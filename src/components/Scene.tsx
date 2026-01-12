/* eslint-disable @typescript-eslint/no-unused-vars */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { SwordSwarm } from './SwordSwarm';
import { DivineLightning } from './DivineLightning';
import { MagicCircle } from './MagicCircle';
import { CameraController } from './CameraController';

// 星空背景
function StarField() {
  const starsRef = useRef<THREE.Points>(null);

  const [positions, colors] = useMemo(() => {
    const count = 2000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 随机分布在球体上
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      // 颜色：白色到淡蓝色
      const brightness = 0.5 + Math.random() * 0.5;
      col[i * 3] = brightness;
      col[i * 3 + 1] = brightness;
      col[i * 3 + 2] = brightness + Math.random() * 0.2;
    }

    return [pos, col];
  }, []);

  useFrame(({ clock }) => {
    if (starsRef.current) {
      starsRef.current.rotation.y = clock.getElapsedTime() * 0.01;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// 飘动的云雾
// function FloatingClouds() {
//   const cloudsRef = useRef<THREE.Group>(null);

//   const clouds = useMemo(() => {
//     const result: {
//       pos: [number, number, number];
//       scale: number;
//       opacity: number;
//     }[] = [];
//     for (let i = 0; i < 15; i++) {
//       result.push({
//         pos: [
//           (Math.random() - 0.5) * 80,
//           (Math.random() - 0.5) * 30 - 10,
//           -30 - Math.random() * 40,
//         ],
//         scale: 5 + Math.random() * 15,
//         opacity: 0.1 + Math.random() * 0.15,
//       });
//     }
//     return result;
//   }, []);

//   useFrame(({ clock }) => {
//     if (cloudsRef.current) {
//       cloudsRef.current.children.forEach((cloud, i) => {
//         cloud.position.x += Math.sin(clock.getElapsedTime() * 0.05 + i) * 0.01;
//         cloud.position.y += Math.cos(clock.getElapsedTime() * 0.03 + i) * 0.005;
//       });
//     }
//   });

//   return (
//     <group ref={cloudsRef}>
//       {clouds.map((cloud, i) => (
//         <mesh key={i} position={cloud.pos}>
//           <sphereGeometry args={[cloud.scale, 8, 8]} />
//           <meshBasicMaterial
//             color="#1a2a4a"
//             transparent
//             opacity={cloud.opacity}
//             side={THREE.BackSide}
//           />
//         </mesh>
//       ))}
//     </group>
//   );
// }

// // 远山剪影
// function Mountains() {
//   return (
//     <group position={[0, -15, -60]}>
//       {/* 左侧山峰 */}
//       <mesh position={[-40, 0, 0]}>
//         <coneGeometry args={[20, 35, 4]} />
//         <meshBasicMaterial color="#0a1520" />
//       </mesh>
//       <mesh position={[-20, 0, 10]}>
//         <coneGeometry args={[15, 25, 4]} />
//         <meshBasicMaterial color="#0d1a28" />
//       </mesh>

//       {/* 中间山峰 */}
//       <mesh position={[0, 0, -5]}>
//         <coneGeometry args={[25, 45, 4]} />
//         <meshBasicMaterial color="#08121c" />
//       </mesh>

//       {/* 右侧山峰 */}
//       <mesh position={[30, 0, 5]}>
//         <coneGeometry args={[18, 30, 4]} />
//         <meshBasicMaterial color="#0c1825" />
//       </mesh>
//       <mesh position={[50, 0, 0]}>
//         <coneGeometry args={[22, 38, 4]} />
//         <meshBasicMaterial color="#0a1520" />
//       </mesh>
//     </group>
//   );
// }

// 灵气粒子
function SpiritParticles() {
  const particlesRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const count = 200;
    const pos = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 60;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }

    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (particlesRef.current) {
      const posArr = particlesRef.current.geometry.attributes.position
        .array as Float32Array;
      const time = clock.getElapsedTime();

      for (let i = 0; i < posArr.length / 3; i++) {
        posArr[i * 3 + 1] += Math.sin(time + i) * 0.01;

        // 循环回到下方
        if (posArr[i * 3 + 1] > 20) {
          posArr[i * 3 + 1] = -20;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        color="#88ffaa"
        transparent
        opacity={0.5}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function Scene() {
  return (
    <>
      {/* 深邃夜空背景 */}
      <color attach="background" args={['#030810']} />
      <fog attach="fog" args={['#030810', 30, 100]} />

      {/* 环境 */}
      <StarField />
      {/* <FloatingClouds /> */}
      {/* <Mountains /> */}
      <SpiritParticles />

      {/* 微弱环境光 */}
      <ambientLight intensity={0.1} color="#4488ff" />

      {/* 核心组件 */}
      <CameraController />
      <SwordSwarm />
      {/* ShieldOrb 已移除 - 只保留飞剑阵型 */}
      <DivineLightning />
      <MagicCircle />

      {/* 后处理 */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.1}
          luminanceSmoothing={0.4}
          intensity={2.0}
          radius={0.6}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
