import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { GestureMode } from '../store';

// 全局状态引用
export let globalVideo: HTMLVideoElement | null = null;
export let globalLandmarker: HandLandmarker | null = null;
let initPromise: Promise<boolean> | null = null;

// 初始化函数（单例模式）
export function initHandTracking(videoElement: HTMLVideoElement) {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    globalVideo = videoElement;

    try {
      // 检测屏幕方向模式 (优先使用 API)
      let isPortrait = false;
      if (typeof screen !== 'undefined' && screen.orientation) {
        isPortrait = screen.orientation.type.includes('portrait');
      } else if (typeof window.orientation !== 'undefined') {
        isPortrait = Math.abs(window.orientation as number) !== 90;
      } else if (typeof window !== 'undefined') {
        isPortrait = window.innerHeight > window.innerWidth;
      }

      const widthIdeal = isPortrait ? 480 : 640;
      const heightIdeal = isPortrait ? 640 : 480;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: widthIdeal },
          height: { ideal: heightIdeal },
          facingMode: 'user',
        },
      });

      videoElement.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (videoElement.readyState >= 2) {
          resolve();
        } else {
          videoElement.onloadeddata = () => resolve();
        }
      });

      await videoElement.play().catch((e) => {
        console.warn('Auto-play failed, waiting for user interaction', e);
      });

      const vision = await FilesetResolver.forVisionTasks('/models/wasm');

      globalLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/models/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });

      console.log('Hand tracking initialized successfully');
      return true;
    } catch (e) {
      console.error('Hand tracking init error:', e);
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

// 检测手势类型
export function detectGesture(
  landmarks: { x: number; y: number; z: number }[]
): GestureMode {
  // 计算三点之间的角度
  const getAngle = (
    p1: { x: number; y: number; z: number },
    p2: { x: number; y: number; z: number },
    p3: { x: number; y: number; z: number }
  ) => {
    const v1 = {
      x: p1.x - p2.x,
      y: p1.y - p2.y,
      z: p1.z - p2.z,
    };
    const v2 = {
      x: p3.x - p2.x,
      y: p3.y - p2.y,
      z: p3.z - p2.z,
    };
    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
    const rad = Math.acos(dot / (mag1 * mag2));
    return (rad * 180) / Math.PI;
  };

  const isFingerExtended = (fingerIdx: number) => {
    let p1, p2, p3;
    if (fingerIdx === 0) {
      p1 = landmarks[1];
      p2 = landmarks[2];
      p3 = landmarks[3];
    } else {
      const offset = fingerIdx * 4;
      p1 = landmarks[offset + 1];
      p2 = landmarks[offset + 2];
      p3 = landmarks[offset + 3];
    }
    const angle = getAngle(p1, p2, p3);
    return angle > 150;
  };

  const fingerExtended = [0, 1, 2, 3, 4].map(isFingerExtended);
  const [thumb, index, middle, ring, pinky] = fingerExtended;

  const isGunGesture = thumb && index && !middle && !ring && !pinky;
  const isSwordGesture = index && middle && !pinky;
  const isFist = fingerExtended.filter((x) => x).length <= 1;
  const isOpenPalm = index && middle && ring && pinky;
  const isRockGesture = index && pinky && !middle && !ring;

  if (isFist) return 'SHIELD';
  if (isRockGesture) return 'DAGENG';
  if (isGunGesture) return 'DRAGON';
  if (isSwordGesture) return 'DRAGON';
  if (isOpenPalm) return 'LOTUS';

  return 'LOTUS';
}
