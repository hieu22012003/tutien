import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { Scene } from './components/Scene';
import { HandController } from './components/HandController';
import { initHandTracking } from './services/HandTrackingService';
import { useHandStore } from './store';
import './index.css';

function StatusIndicator() {
  const isTracking = useHandStore((state) => state.isTracking);
  const gestureMode = useHandStore((state) => state.gestureMode);

  const getModeText = () => {
    if (!isTracking) return '⏳ 等待手势...';
    switch (gestureMode) {
      case 'LOTUS':
        return '🌸 莲花阵型';
      case 'SHIELD':
        return '🛡️ 护盾阵型';
      default:
        return '🐉 游龙阵型';
    }
  };

  const getModeColor = () => {
    if (!isTracking) return '#ff6666';
    switch (gestureMode) {
      case 'LOTUS':
        return '#ffaa44';
      case 'SHIELD':
        return '#88ccff';
      default:
        return '#00ff88';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: '20px',
        color: getModeColor(),
        fontSize: '12px',
        zIndex: 100,
        transition: 'color 0.3s',
      }}
    >
      {getModeText()}
    </div>
  );
}

function UI() {
  const gestureMode = useHandStore((state) => state.gestureMode);
  const isTracking = useHandStore((state) => state.isTracking);

  const getColor = () => {
    if (!isTracking) return '#00ff88';
    switch (gestureMode) {
      case 'LOTUS':
        return '#ffaa44';
      case 'SHIELD':
        return '#88ccff';
      default:
        return '#00ff88';
    }
  };

  const getHint = () => {
    if (!isTracking) return '� 请挥手激活飞剑...';
    switch (gestureMode) {
      case 'DAGENG':
        return '🤘 结印 · 大庚剑阵';
      case 'LOTUS':
        return '🖐️ 张掌 · 莲花现世';
      case 'SHIELD':
        return '✊ 握拳 · 剑盾护体';
      case 'DRAGON':
      default:
        return '� 剑指 · 游龙随行';
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        zIndex: 100,
        color: '#fff',
        textShadow: '0 0 10px #00ff88',
      }}
    >
      <h1
        style={{
          fontSize: '28px',
          marginBottom: '8px',
          color: getColor(),
          transition: 'color 0.3s',
        }}
      >
        青竹蜂云剑
      </h1>
      <p style={{ fontSize: '14px', opacity: 0.7 }}>{getHint()}</p>
    </div>
  );
}

function WebcamView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      initHandTracking(videoRef.current).then((success) => {
        setIsReady(success);
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        width: '120px',
        height: '90px',
        borderRadius: '8px',
        border: `2px solid ${
          isReady ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 100, 100, 0.5)'
        }`,
        transform: 'scaleX(-1)',
        opacity: 0, // 0则隐藏
        zIndex: 100,
      }}
      autoPlay
      playsInline
      muted
    />
  );
}

import { OrientationGuard } from './components/OrientationGuard';

export default function App() {
  return (
    <OrientationGuard>
      <div style={{ width: '100vw', height: '100vh' }}>
        {/* Video 在 Canvas 外部 */}
        <WebcamView />

        <Canvas
          camera={{ position: [0, 3, 35], fov: 60 }}
          dpr={[1, 2]}
          gl={{ antialias: false, alpha: true }}
        >
          <Scene />
          <HandController />
        </Canvas>

        <StatusIndicator />
        <UI />
      </div>
    </OrientationGuard>
  );
}
