import { ContactShadows, Grid } from '@react-three/drei';
import React, { memo } from 'react';

type Props = {
  direction?: [number, number, number];
  showGrid?: boolean;
};

export const Environment = memo(function Environment({
  direction = [5, 5, 5],
  showGrid = true,
}: Props) {
  /* eslint-disable react/no-unknown-property */
  return (
    <>
      <color attach="background" args={['#bdbdbd']} />
      <fog attach="fog" args={['#bdbdbd', 11, 32]} />
      <hemisphereLight
        color="#ffffff"
        groundColor="#bdbdbd"
        intensity={0.65}
      />
      <ambientLight intensity={0.38} />
      <directionalLight
        position={direction}
        intensity={1.05}
        color="#f7f8ff"
        shadow-mapSize={2048}
        shadow-bias={-0.00015}
        castShadow
      />
      <directionalLight
        position={[-5, 5, 5]}
        intensity={0.24}
        color="#7f95bc"
        shadow-mapSize={512}
      />
      <directionalLight
        position={[-5, 4, -5]}
        intensity={0.12}
        color="#8bb7ff"
        shadow-mapSize={512}
      />
      <directionalLight
        position={[0, 3, -6]}
        intensity={0.14}
        color="#ffdeb8"
      />
      <ContactShadows
        position={[0, -0.085, 0]}
        opacity={0.38}
        scale={8}
        blur={2.8}
        far={5}
        resolution={1024}
        color="#000000"
      />
      {showGrid && (
        <Grid
          infiniteGrid={true}
          sectionColor="#444444"
          cellColor="#505050"
          fadeDistance={24}
          fadeStrength={1.2}
        />
      )}
    </>
  );
  /* eslint-enable react/no-unknown-property */
});
