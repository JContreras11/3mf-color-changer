import { Center } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = Omit<ThreeElements['mesh'], 'geometry'> & {
  geometry: THREE.Object3D;
  onReady?: () => void;
};

export default function Model({ geometry, onReady, ...props }: Props) {
  const groupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const group = groupRef.current;

    if (!group) {
      return;
    }

    group.clear();
    group.add(geometry);

    const animationFrame = window.requestAnimationFrame(() => {
      onReady?.();
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      group.remove(geometry);
    };
  }, [geometry, onReady]);

  return (
    <Center cacheKey={geometry.uuid} disableY>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <mesh castShadow receiveShadow {...props}>
        <group ref={groupRef}></group>
      </mesh>
    </Center>
  );
}
