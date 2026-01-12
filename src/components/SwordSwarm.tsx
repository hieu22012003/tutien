import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useHandStore, CONFIG } from '../store';
import type { GestureMode } from '../store';

// 简化版 Simplex Noise
const simplex = {
  noise3D: (x: number, y: number, z: number) => {
    return (
      Math.sin(x * 1.2 + y * 0.8) *
      Math.cos(y * 1.1 + z * 0.9) *
      Math.sin(z * 0.7 + x * 1.3)
    );
  },
};

// 共享 positions 给 DivineLightning
declare global {
  interface Window {
    swordPositions?: THREE.Vector3[];
  }
}

export function SwordSwarm() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const auraRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 物理状态
  const positions = useRef<THREE.Vector3[]>([]);
  const velocities = useRef<THREE.Vector3[]>([]);

  // 初始化
  if (positions.current.length === 0) {
    for (let i = 0; i < CONFIG.swordCount; i++) {
      positions.current.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 10 - 5
        )
      );
      velocities.current.push(new THREE.Vector3());
    }
    window.swordPositions = positions.current;
  }

  // 剑形几何体
  const geometry = useMemo(() => {
    const bladeGeo = new THREE.ConeGeometry(0.12, 2.5, 4);
    bladeGeo.scale(0.4, 1, 1);
    bladeGeo.rotateX(Math.PI / 2);
    bladeGeo.translate(0, 0, 1.0);

    const guardGeo = new THREE.BoxGeometry(0.5, 0.08, 0.15);
    guardGeo.translate(0, 0, -0.2);

    const handleGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.7, 6);
    handleGeo.rotateX(Math.PI / 2);
    handleGeo.translate(0, 0, -0.6);

    const merged = mergeGeometries([bladeGeo, guardGeo, handleGeo]);
    return merged || bladeGeo;
  }, []);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x00ff88,
        transparent: true,
        opacity: 0.9,
      }),
    []
  );

  const auraGeometry = useMemo(() => {
    const auraGeo = new THREE.ConeGeometry(0.15, 2.6, 4);
    auraGeo.scale(0.5, 1, 1);
    auraGeo.rotateX(Math.PI / 2);
    auraGeo.translate(0, 0, 1.0);
    return auraGeo;
  }, []);

  const auraMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xffdd44,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    const targetPosition = useHandStore.getState().targetPosition;
    const isTracking = useHandStore.getState().isTracking;
    const gestureMode = useHandStore.getState().gestureMode;
    const pathHistory = useHandStore.getState().pathHistory;
    const extendPath = useHandStore.getState().extendPath;

    const time = clock.getElapsedTime();
    const delta = 1 / 60;

    // 无手势时自动盘旋：使用默认的 LOTUS 模式
    let currentTarget = targetPosition;
    if (!isTracking) {
      currentTarget = new THREE.Vector3(0, 0, 0);
      // 仍然更新历史路径，防止切换时跳变
      pathHistory.pop();
      pathHistory.unshift(currentTarget.clone());
    } else if (gestureMode === 'DRAGON') {
      extendPath();
    }

    // 根据模式计算目标
    for (let i = 0; i < CONFIG.swordCount; i++) {
      const pos = positions.current[i];
      const vel = velocities.current[i];
      const target = new THREE.Vector3();

      if (gestureMode === 'SHIELD' && isTracking) {
        // ============ 护盾模式：球形轨道 ============
        // 使用斐波那契球面均匀分布
        const phi = Math.acos(1 - (2 * (i + 0.5)) / CONFIG.swordCount);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        // 基础轨道位置
        const orbitX =
          CONFIG.shieldRadius *
          Math.sin(phi) *
          Math.cos(theta + time * CONFIG.shieldOrbitSpeed);
        const orbitY =
          CONFIG.shieldRadius *
          Math.sin(phi) *
          Math.sin(theta + time * CONFIG.shieldOrbitSpeed);
        const orbitZ = CONFIG.shieldRadius * Math.cos(phi);

        // 添加轨道旋转动画
        const rotatedX =
          orbitX * Math.cos(time * 0.3) - orbitZ * Math.sin(time * 0.3);
        const rotatedZ =
          orbitX * Math.sin(time * 0.3) + orbitZ * Math.cos(time * 0.3);

        target.set(
          currentTarget.x + rotatedX,
          currentTarget.y + orbitY,
          currentTarget.z + rotatedZ
        );

        // 添加微小波动
        target.x += Math.sin(time * 3 + i) * 0.2;
        target.y += Math.cos(time * 3 + i * 0.7) * 0.2;
      } else if (
        gestureMode === 'LOTUS' ||
        (gestureMode === ('LOTUS' as GestureMode) && !isTracking)
      ) {
        // ============ 莲花模式：斐波那契螺旋（黄金角）优化 ============
        // 这种分布方式更像自然界的莲花/向日葵，视觉效果更紧密壮观

        // 1. 基础参数
        const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5度
        const maxRadius = CONFIG.lotusRadius;
        const minRadius = 6; // 中心镂空半径

        // 2. 计算每个剑的位置
        // r = c * sqrt(i)，使得面积分布均匀
        // 映射到 [minRadius, maxRadius] 区间
        const t = i / (CONFIG.swordCount - 1); // 0 -> 1
        const rRatio = Math.sqrt(t);
        const r = minRadius + (maxRadius - minRadius) * rRatio;

        // 3. 角度 + 旋转动画
        // 基础角度 + 整体旋转 + 半径相关的差速旋转（形成漩涡感）
        const theta = i * goldenAngle + time * CONFIG.lotusRotateSpeed;

        // 4. 呼吸效果：整体缩放
        const breathe = 1 + Math.sin(time * 2) * 0.05;
        const currentR = r * breathe;

        // 5. 坐标计算
        const x = currentR * Math.cos(theta);
        const y = currentR * Math.sin(theta);

        // 6. Z轴造型：扁平切面（完全平面，仅保留微小波动）
        const z = Math.sin(time * 2 + i * 0.1) * 0.2; // 极小的上下浮动

        target.set(
          currentTarget.x + x,
          currentTarget.y + y,
          currentTarget.z + z
        );

        // 7. 剑的朝向
        // 莲花模式特有：剑身自转，增加灵动感
        // (这部分通过修改up向量或额外的旋转矩阵实现，这里先保持位置正确)
      } else if (gestureMode === 'DAGENG' && isTracking) {
        // ============ 大庚剑阵 ============

        // 特殊处理：第0号剑作为【镇派主剑】
        if (i === 0) {
          const centralHeight = currentTarget.y + 5; // 主剑稍微高一点
          target.set(currentTarget.x, centralHeight, currentTarget.z);
          // 主剑的 scale 在下面统一设置
        } else {
          // 其他剑：环绕主剑
          // 修正 i 索引，让分布计算不包含 0
          const effectiveI = i - 1;
          const effectiveCount = CONFIG.swordCount - 1;

          // 垂直圆柱/环形阵列，剑尖朝下
          const layerCount = 10;
          const perLayer = Math.max(1, Math.floor(effectiveCount / layerCount));
          const layerIdx = Math.floor(effectiveI / perLayer);
          const idxInLayer = effectiveI % perLayer;

          // 半径：多层同心圆 (基础半径 + 层间距)
          // 增加基础半径，给主剑留出空间
          const radius = CONFIG.dagengRadius + layerIdx * 1.5 + 2;

          // 角度：偶数层顺时针，奇数层逆时针
          const dir = layerIdx % 2 === 0 ? 1 : -1;
          const theta =
            (idxInLayer / perLayer) * Math.PI * 2 +
            time * CONFIG.dagengRotateSpeed * dir;

          // 高度：呈圆柱分布
          const hCenter = currentTarget.y - 10;
          const hRange = CONFIG.dagengHeight;
          const hRand = Math.sin(effectiveI * 13.1) * 0.5 + 0.5;
          const height = hCenter + (hRand - 0.5) * hRange;

          target.set(
            currentTarget.x + Math.cos(theta) * radius,
            height,
            currentTarget.z + Math.sin(theta) * radius
          );
        }
      } else {
        // ============ 游龙模式 ============
        if (i < 5) {
          target.copy(currentTarget);
          target.x += Math.sin(time * 8 + i) * 0.3;
          target.y += Math.cos(time * 8 + i) * 0.3;
        } else {
          // 龙身：沿轨迹历史插值
          const pathIdx = i * 0.8; // 控制龙身长度 (0.5 -> 0.6 略微调大)
          const idxA = Math.min(Math.floor(pathIdx), pathHistory.length - 1);
          const idxB = Math.min(idxA + 1, pathHistory.length - 1);
          const alpha = pathIdx - Math.floor(pathIdx);

          if (pathHistory[idxA] && pathHistory[idxB]) {
            target.lerpVectors(pathHistory[idxA], pathHistory[idxB], alpha);
          } else if (pathHistory[idxA]) {
            target.copy(pathHistory[idxA]);
          } else {
            target.copy(currentTarget);
          }

          // 增加一些随机抖动，使龙身更自然
          target.x += Math.sin(time * 10 + i * 0.5) * 0.2;
          target.y += Math.cos(time * 10 + i * 0.5) * 0.2;

          const ns = CONFIG.noiseScale;
          const na =
            CONFIG.noiseStrength * (0.8 + Math.sin(time * 2 + i * 0.05) * 0.4);
          target.x += simplex.noise3D(pos.x * ns, pos.y * ns, time) * na;
          target.y += simplex.noise3D(pos.y * ns, pos.z * ns, time + 100) * na;
          target.z += simplex.noise3D(pos.z * ns, pos.x * ns, time + 200) * na;
        }
      }

      // 动态速度（护盾模式下速度更快以快速就位）
      let speed =
        gestureMode === 'SHIELD' ? CONFIG.sprintSpeed : CONFIG.maxSpeed;
      if (target.distanceTo(pos) > 4) speed = CONFIG.sprintSpeed;
      else if (target.distanceTo(pos) < 1)
        speed = target.distanceTo(pos) * CONFIG.maxSpeed;

      // 计算转向力
      const desired = target.sub(pos);
      const d = desired.length();

      if (d > 0) {
        desired.normalize();
        // 靠近目标时减速（到达行为）
        if (d < 10) {
          desired.multiplyScalar(speed * (d / 10));
        } else {
          desired.multiplyScalar(speed);
        }
      }

      const steer = desired.sub(vel);
      // 护盾和莲花模式下需要更强的控制力
      const steerFactor =
        gestureMode === 'SHIELD' || gestureMode === 'LOTUS' ? 3 : 1;
      steer.clampLength(0, CONFIG.steerForce * delta * steerFactor);

      vel.add(steer);

      // 分离力（护盾和莲花模式下禁用，除非是待机状态的莲花）
      if (
        i > 0 &&
        gestureMode !== 'SHIELD' &&
        (gestureMode !== 'LOTUS' || !isTracking)
      ) {
        const prev = positions.current[i - 1];
        const diff = pos.clone().sub(prev);
        const d = diff.length();
        if (d < CONFIG.separationDist && d > 0.01) {
          diff.normalize().multiplyScalar(CONFIG.separationForce * delta);
          vel.add(diff);
        }
      }

      // 更新位置
      pos.add(vel.clone().multiplyScalar(delta));

      // 更新矩阵
      dummy.position.copy(pos);

      // 朝向：护盾模式下沿切线方向环绕，莲花模式向外发散，游龙模式下指向速度方向
      let lookTarget: THREE.Vector3;
      if (gestureMode === 'SHIELD' && isTracking) {
        // 护盾模式：直接使用当前速度方向作为剑的朝向
        // 速度向量代表了剑的实际运动方向
        if (vel.length() > 0.1) {
          lookTarget = pos.clone().add(vel.clone().normalize());
        } else {
          // 如果速度太小，使用切线方向作为备选
          const relPos = pos.clone().sub(currentTarget);
          // 绕Y轴的切线方向：(-z, 0, x) normalized
          const tangent = new THREE.Vector3(-relPos.z, 0, relPos.x).normalize();
          lookTarget = pos.clone().add(tangent);
        }
      } else if (gestureMode === 'LOTUS') {
        // 莲花模式：剑头指向外侧（从中心向外发散）
        const outward = pos.clone().sub(currentTarget).normalize();
        lookTarget = pos.clone().add(outward);
      } else if (gestureMode === 'DAGENG' && isTracking) {
        // 大庚剑阵：剑尖垂直向下，仿佛随时落下
        lookTarget = pos.clone().add(new THREE.Vector3(0, -1, 0));
      } else {
        lookTarget = pos
          .clone()
          .add(vel.length() > 0.1 ? vel : new THREE.Vector3(0, 0, -1));
      }
      dummy.lookAt(lookTarget);

      // 大庚模式下剑体变大，增加压迫感（平滑过渡）
      // 2秒过渡：大约 0.02 的 lerp 速度 (60fps)
      let targetScale = 1;
      if (gestureMode === 'DAGENG' && isTracking) {
        if (i === 0) targetScale = 6; // 主剑巨大化
        else targetScale = 1.5; // 普通剑 1.5倍
      }

      const currentScale = meshRef.current.userData.currentScale || 1;
      // 为主剑使用稍慢的变大速度，更有沉重感
      const lerpSpeed = i === 0 && gestureMode === 'DAGENG' ? 0.01 : 0.02;
      const newScale = THREE.MathUtils.lerp(
        currentScale,
        targetScale,
        lerpSpeed
      );

      // 保存当前 scale 到 userData 以便下一帧使用
      meshRef.current.userData.currentScale = newScale;

      dummy.scale.set(newScale, newScale, newScale);

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // 更新辟邪神雷光环（护盾模式下更亮）
      if (auraRef.current) {
        const isActive =
          gestureMode === 'SHIELD'
            ? Math.sin(time * 30 + i * 0.5) > 0.0 // 护盾模式：更多剑亮起
            : Math.sin(time * 20 + i * 0.7) > 0.3;

        // 光环跟随剑体大小，适当放大一点
        const auraScale = newScale * (isActive ? 1.3 : 1.0);

        // 如果不激活且不是主剑，则隐藏（主剑Aura常驻）
        if (!isActive && !(i === 0 && gestureMode === 'DAGENG')) {
          dummy.scale.set(0, 0, 0);
        } else {
          dummy.scale.set(auraScale, auraScale, auraScale);
        }

        dummy.updateMatrix();
        auraRef.current.setMatrixAt(i, dummy.matrix);
        // 还原 dummy scale 供下一轮循环使用
        dummy.scale.set(newScale, newScale, newScale);
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (auraRef.current) {
      auraRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, CONFIG.swordCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={auraRef}
        args={[auraGeometry, auraMaterial, CONFIG.swordCount]}
        frustumCulled={false}
      />
    </group>
  );
}
