'use client';

import { CameraControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import { Environment } from './Environment';
import Model from './Model';

const previewCameraPosition = new THREE.Vector3(7, 6, 7);

export default function StaticPreviewCanvas({
  geometry,
  onReady,
}: {
  geometry: THREE.Object3D;
  onReady?: () => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      frameloop="demand"
      camera={{
        fov: 32,
        zoom: 1.1,
        near: 0.1,
        far: 1000,
        position: previewCameraPosition.toArray(),
      }}
    >
      <PreviewSceneWithReady geometry={geometry} onReady={onReady} />
    </Canvas>
  );
}

function PreviewSceneWithReady({
  geometry,
  onReady,
}: {
  geometry: THREE.Object3D;
  onReady?: () => void;
}) {
  const frameRef = React.useRef<number | null>(null);
  const cameraControlRef = React.useRef<CameraControls | null>(null);

  const handleModelReady = React.useCallback(() => {
    cameraControlRef.current?.setLookAt(
      previewCameraPosition.x,
      previewCameraPosition.y,
      previewCameraPosition.z,
      0,
      0,
      0,
      false
    );
    cameraControlRef.current?.fitToSphere(geometry, false);

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      onReady?.();
    });
  }, [geometry, onReady]);

  React.useEffect(
    () => () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    },
    []
  );

  return (
    <>
      <CameraControls ref={cameraControlRef} enabled={false} />
      <Environment direction={[7, 8, 6]} showGrid={false} />
      <Model geometry={geometry} onReady={handleModelReady} />
    </>
  );
}
