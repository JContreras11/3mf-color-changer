import { CameraControls, GizmoHelper, GizmoViewcube } from '@react-three/drei';
import { Canvas, type ThreeElements } from '@react-three/fiber';
import React from 'react';
import * as THREE from 'three';

import { Environment } from './Environment';
import Model from './Model';

export type ThreeJsCanvasHandle = {
  orbitLeft: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
};

type Props = ThreeElements['group'] & {
  continuousPaint?: boolean;
  geometry: THREE.Object3D;
  onModelReady?: () => void;
  onPointerMoveModel?: (e) => void;
  onPointerOutModel: (e) => void;
  onPointerOverModel: (e) => void;
  onSelect: (e) => void;
  showGroundGrid?: boolean;
  showViewCube?: boolean;
};

const defaultCameraPosition = new THREE.Vector3(6, 6, 6);
const initialViewTilt = -10 * THREE.MathUtils.DEG2RAD;
const initialViewZoomStep = 0.4;

const ThreeJsCanvas = React.forwardRef<ThreeJsCanvasHandle, Props>(
  function ThreeJsCanvas(
    {
      continuousPaint = true,
      geometry,
      onModelReady,
      onPointerMoveModel,
      onPointerOutModel,
      onPointerOverModel,
      onSelect,
      showGroundGrid = true,
      showViewCube = true,
    }: Props,
    ref
  ) {
    const [mouseIsDown, setMouseIsDown] = React.useState(false);
    const cameraControlRef = React.useRef<CameraControls | null>(null);
    const activeGeometryUuidRef = React.useRef(geometry.uuid);

    React.useEffect(() => {
      activeGeometryUuidRef.current = geometry.uuid;
    }, [geometry.uuid]);

    const reconnectCameraControls = React.useCallback(() => {
      const canvasElement = document.getElementById('editor-canvas');

      if (canvasElement) {
        cameraControlRef.current?.connect(canvasElement);
      }
    }, []);

    const resetView = React.useCallback(async () => {
      if (!cameraControlRef.current) {
        return;
      }

      geometry.updateWorldMatrix(true, true);

      await cameraControlRef.current.setLookAt(
        defaultCameraPosition.x,
        defaultCameraPosition.y,
        defaultCameraPosition.z,
        0,
        0,
        0,
        true
      );
      await cameraControlRef.current.fitToSphere(geometry, true);
      await cameraControlRef.current.rotate(0, initialViewTilt, true);
      await cameraControlRef.current.zoom(initialViewZoomStep, true);

      // Shift the camera slightly upwards so the hat renders about 20px lower on the screen.
      // This also conveniently raises the pivot point closer to the crown of the cap.
      const currentTarget = new THREE.Vector3();
      cameraControlRef.current.getTarget(currentTarget);
      const currentPos = new THREE.Vector3();
      cameraControlRef.current.getPosition(currentPos);

      const visualYOffset = 0.55;

      await cameraControlRef.current.setLookAt(
        currentPos.x,
        currentPos.y + visualYOffset,
        currentPos.z,
        currentTarget.x,
        currentTarget.y + visualYOffset,
        currentTarget.z,
        true
      );
    }, [geometry]);

    const handleModelReady = React.useCallback(() => {
      const geometryUuid = geometry.uuid;

      const runResetView = async () => {
        await waitForAnimationFrames(2);

        if (activeGeometryUuidRef.current !== geometryUuid) {
          return;
        }

        await resetView();

        if (activeGeometryUuidRef.current !== geometryUuid) {
          return;
        }

        onModelReady?.();
      };

      void runResetView();
    }, [geometry.uuid, onModelReady, resetView]);

    React.useImperativeHandle(
      ref,
      () => ({
        orbitLeft: () => {
          cameraControlRef.current?.rotate(25 * THREE.MathUtils.DEG2RAD, 0, true);
          cameraControlRef.current?.fitToSphere(geometry, true);
        },
        resetView: () => {
          void resetView();
        },
        zoomIn: () => {
          cameraControlRef.current?.zoom(0.4, true);
        },
        zoomOut: () => {
          cameraControlRef.current?.zoom(-0.4, true);
        },
      }),
      [geometry, resetView]
    );

    const handleClick = (e) => {
      e.stopPropagation();
      onSelect(e);
    };

    const handlePointerDown = (e) => {
      e.stopPropagation();
      setMouseIsDown(true);

      cameraControlRef.current?.disconnect();
    };

    const handlePointerUp = (e) => {
      e.stopPropagation();
      setMouseIsDown(false);
      reconnectCameraControls();
    };

    const handlePointerOver = (e) => {
      e.stopPropagation();
      onPointerOverModel(e);
    };

    const handlePointerOut = (e) => {
      e.stopPropagation();
      onPointerOutModel(e);
    };

    const handlePointerMove = (e) => {
      e.stopPropagation();

      if (e.object) {
        onPointerMoveModel?.(e);
      }

      if (mouseIsDown) {
        if (e.buttons === 0) {
          setMouseIsDown(false);
          reconnectCameraControls();
        } else if (continuousPaint && e.object) {
          onSelect(e);
        }
      }
    };

    const tweenCamera = (position: THREE.Vector3) => {
      const point = new THREE.Spherical().setFromVector3(
        new THREE.Vector3(position.x, position.y, position.z)
      );
      cameraControlRef.current?.rotateTo(point.theta, point.phi, true);
      cameraControlRef.current?.fitToSphere(geometry, true);
    };

    return (
      <Canvas
        id="editor-canvas"
        shadows
        camera={{
          fov: 35,
          zoom: 1.3,
          near: 0.1,
          far: 1000,
          position: defaultCameraPosition.toArray(),
        }}
        frameloop="demand"
      >
        <CameraControls ref={cameraControlRef} />
        <Environment showGrid={showGroundGrid} />
        <Model
          geometry={geometry}
          onReady={handleModelReady}
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerMissed={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          onPointerMove={handlePointerMove}
        />
        {showViewCube && (
          <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
            <GizmoViewcube
              onClick={(e) => {
                e.stopPropagation();
                if (
                  e.eventObject.position.x === 0 &&
                  e.eventObject.position.y === 0 &&
                  e.eventObject.position.z === 0
                ) {
                  tweenCamera(e.face!.normal);
                } else {
                  tweenCamera(e.eventObject.position);
                }
                return null;
              }}
            />
          </GizmoHelper>
        )}
      </Canvas>
    );
  }
);

export default ThreeJsCanvas;

function waitForAnimationFrames(count: number) {
  return new Promise<void>((resolve) => {
    const step = (remaining: number) => {
      if (remaining <= 0) {
        resolve();
        return;
      }

      window.requestAnimationFrame(() => {
        step(remaining - 1);
      });
    };

    step(count);
  });
}
