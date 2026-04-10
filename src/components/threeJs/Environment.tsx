import { Grid } from '@react-three/drei';
import React, { memo } from 'react';

type Props = {
  direction?: [number, number, number];
  showPrintPlates?: boolean;
  showGrid?: boolean;
};

export const Environment = memo(function Environment({
  direction = [5, 5, 5],
  showPrintPlates = true,
  showGrid = true,
}: Props) {
  /* eslint-disable react/no-unknown-property */
  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight
        position={direction}
        intensity={0.5}
        shadow-mapSize={1024}
        castShadow
      />
      <directionalLight
        position={[-5, 5, 5]}
        intensity={0.1}
        shadow-mapSize={128}
        castShadow
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={0.1}
        shadow-mapSize={128}
        castShadow
      />
      <directionalLight
        position={[0, 5, 0]}
        intensity={0.1}
        shadow-mapSize={128}
        castShadow
      />
      {showPrintPlates && (
        <group position={[0, -0.012, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[4.8, 4.8]} />
            <meshStandardMaterial color="#f8fafc" metalness={0.02} roughness={0.86} />
          </mesh>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[2.75, -0.001, 0]}
            receiveShadow
          >
            <planeGeometry args={[3.4, 3.4]} />
            <meshStandardMaterial
              color="#edf4ff"
              metalness={0.02}
              roughness={0.9}
              transparent
              opacity={0.78}
            />
          </mesh>
        </group>
      )}
      {showGrid && <Grid infiniteGrid={true} sectionColor="#CCCCCC" />}
    </>
  );
  /* eslint-enable react/no-unknown-property */
});
