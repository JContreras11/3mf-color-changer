'use client';

import { CameraControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import { Environment } from './Environment';
import Model from './Model';

const previewCameraPosition = new THREE.Vector3(7, 6, 7);

function PreviewScene({ geometry }: { geometry: THREE.Object3D }) {
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
  }, [geometry]);

  return (
    <>
      <CameraControls ref={cameraControlRef} enabled={false} />
      <Environment direction={[7, 8, 6]} showGrid={false} />
      <Model geometry={geometry} onReady={handleModelReady} />
    </>
  );
}

export default function StaticPreviewCanvas({
  geometry,
}: {
  geometry: THREE.Object3D;
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
      <PreviewScene geometry={geometry} />
    </Canvas>
  );
}
