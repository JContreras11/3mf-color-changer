import Box from '@mui/material/Box';
import { enqueueSnackbar } from 'notistack';
import { ThreeEvent } from '@react-three/fiber';
import React, { useEffect } from 'react';
import { useLoaderData, useLocation } from 'react-router-dom';
import * as THREE from 'three';

import config from '../etc/config.json';
import exportFileJob from '../jobs/exportFile';
import applyRasterOverlay from '../utils/threejs/applyRasterOverlay';
import changeFaceColor from '../utils/threejs/changeFaceColor';
import changeMeshColor from '../utils/threejs/changeMeshColor';
import createImageCanvas from '../utils/threejs/createImageCanvas';
import createTextCanvas from '../utils/threejs/createTextCanvas';
import getFace from '../utils/threejs/getFace';
import getFaceColor from '../utils/threejs/getFaceColor';
import sameVector3 from '../utils/threejs/sameVector3';
import { useJobContext } from './JobProvider';
import ModeSelector, { Mode } from './ModeSelector';
import OverlayBrushPanel from './OverlayBrushPanel';
import PermanentDrawer from './PermanentDrawer';
import ThreeJsCanvas from './threeJs/Canvas';
import useFile from './threeJs/useFile';

type GhostOverlay = {
  pixelsPerWorldUnit: number;
  x: number;
  y: number;
};

export type Settings = {
  workingColor?: string;
  mode?: Mode;
};
type Props = {
  onSettingsChange?: (settings: Settings) => void;
};

export default function Editor({ onSettingsChange }: Props) {
  const settings = useLoaderData() as Settings;
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const title = config.title;
  const file = location.state?.file || searchParams.get('example');
  const { addJob } = useJobContext();

  if (!file) {
    window.location.href = '/';
    return null;
  }

  const [object] = useFile(file);
  const [mode, setMode] = React.useState<Mode>(settings?.mode || 'mesh');
  const [workingColor, setWorkingColor] = React.useState<string>(
    settings?.workingColor || '#f00'
  );
  const [imageCanvas, setImageCanvas] = React.useState<HTMLCanvasElement | null>(
    null
  );
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageName, setImageName] = React.useState<string>();
  const [imageSize, setImageSize] = React.useState(30);
  const [imageRotation, setImageRotation] = React.useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(
    null
  );
  const [textValue, setTextValue] = React.useState('Text');
  const [textSize, setTextSize] = React.useState(24);
  const [textRotation, setTextRotation] = React.useState(0);
  const [ghostOverlay, setGhostOverlay] = React.useState<GhostOverlay | null>(
    null
  );
  const [, setSceneRevision] = React.useState(0);
  const editorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange({
        mode,
        workingColor,
      });
    }
  }, [mode, workingColor]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    if (mode !== 'image') {
      setGhostOverlay(null);
    }
  }, [mode]);

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    if (mode === 'mesh') {
      handleMeshColorChange(e.object.uuid, workingColor);
    } else if (mode === 'triangle') {
      handleFaceColorChange(e, workingColor);
    } else if (mode === 'triangle_neighbors') {
      handleFaceNeighborColorChange(e, workingColor);
    } else if (mode === 'select_color' && e.face) {
      setWorkingColor(getFaceColor(e.object as THREE.Mesh, e.face));
    } else if (mode === 'image') {
      handleImageOverlay(e);
    } else if (mode === 'text') {
      handleTextOverlay(e);
    }
  };

  const handleExport = async () => {
    addJob(exportFileJob(file, object!));
  };

  const handleMeshColorChange = (uuid, color: string) => {
    // TODO: Debounce - no need to re-render the mesh for every color change (e.g. when dragging the color picker)
    object?.traverse((child) => {
      if (child.uuid !== uuid) {
        return;
      }

      changeMeshColor(child as THREE.Mesh, color);
    });
  };

  const handleFaceColorChange = (e: ThreeEvent<MouseEvent>, color) => {
    const mesh = e.object as THREE.Mesh;

    if (e.face) {
      changeFaceColor(mesh, color, e.face);
    }
  };

  // This function will color a single face on a mesh, and will seek its
  // neighbors which have the same orentation as the initial face
  const handleFaceNeighborColorChange = async (
    e: ThreeEvent<MouseEvent>,
    color
  ) => {
    const mesh = e.object as THREE.Mesh;

    if (e.face) {
      const initialFace = getFace(mesh, e.faceIndex!);

      // Change the color of the initial face
      changeFaceColor(mesh, color, e.face);

      const visitedNeighbors: number[] = [];
      const walkNeighbors = (
        neighborFaceIndex: number,
        expectedNormal: THREE.Vector3
      ) => {
        if (visitedNeighbors.includes(neighborFaceIndex)) {
          return;
        }
        const face = getFace(mesh, neighborFaceIndex);

        visitedNeighbors.push(neighborFaceIndex);

        if (!sameVector3(face.normal, expectedNormal)) {
          return;
        }

        changeFaceColor(mesh, color, face);
        mesh.userData.neighbors[neighborFaceIndex].forEach((neighbor) => {
          walkNeighbors(neighbor, expectedNormal);
        });
      };

      mesh.userData.neighbors[e.faceIndex!].forEach((neighbor) => {
        walkNeighbors(neighbor, initialFace.normal);
      });
    }
  };

  const handleWorkingColorChange = (color) => {
    setWorkingColor(color);
  };

  const forceCanvasRender = () => {
    setSceneRevision((prev) => prev + 1);
  };

  const handleImageOverlay = (e: ThreeEvent<MouseEvent>) => {
    if (!imageCanvas) {
      enqueueSnackbar('Select an image before placing it on the model.', {
        variant: 'warning',
      });
      return;
    }

    if (!e.face || !object) {
      return;
    }

    const mesh = e.object as THREE.Mesh;

    if (mesh.userData.excludeFromPainting) {
      return;
    }

    applyRasterOverlay({
      root: object,
      targetMesh: mesh,
      pointWorld: e.point.clone(),
      face: e.face,
      canvas: imageCanvas,
      size: imageSize,
      rotationDegrees: imageRotation,
      name: imageName || 'Image overlay',
    });

    forceCanvasRender();
  };

  const handleTextOverlay = (e: ThreeEvent<MouseEvent>) => {
    if (!e.face || !object) {
      return;
    }

    const mesh = e.object as THREE.Mesh;

    if (mesh.userData.excludeFromPainting) {
      return;
    }

    try {
      const canvas = createTextCanvas(textValue, workingColor);

      applyRasterOverlay({
        root: object,
        targetMesh: mesh,
        pointWorld: e.point.clone(),
        face: e.face,
        canvas,
        size: textSize,
        rotationDegrees: textRotation,
        name: textValue.trim() || 'Text overlay',
      });

      forceCanvasRender();
    } catch (error) {
      enqueueSnackbar(error.toString(), { variant: 'warning' });
    }
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleImageFileChange = async (file: File) => {
    try {
      const canvas = await createImageCanvas(file);
      setImageCanvas(canvas);
      setImageFile(file);
      setImageName(file.name);
    } catch (error) {
      enqueueSnackbar(error.toString(), { variant: 'error' });
    }
  };

  const handlePointerMoveModel = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'image' || !imageCanvas || !editorRef.current) {
      return;
    }

    const bounds = editorRef.current.getBoundingClientRect();
    const pixelsPerWorldUnit = getPixelsPerWorldUnit(
      e.camera as THREE.Camera,
      e.point,
      bounds.height
    );
    const pointerPosition = getPointerClientPosition(e, bounds);

    if (!pointerPosition) {
      return;
    }

    setGhostOverlay({
      x: pointerPosition.x,
      y: pointerPosition.y,
      pixelsPerWorldUnit,
    });
  };

  const handlePointerOverModel = () => {
    if (editorRef.current) {
      if (mode === 'triangle_neighbors') {
        // TODO Draw a circle around the mouse pointer to indicate brush radius
        editorRef.current.style.cursor = `crosshair`;
      } else {
        editorRef.current.style.cursor = 'crosshair';
      }
    }
  };

  const handlePointerOutModel = () => {
    if (editorRef.current) {
      editorRef.current.style.cursor = 'auto';
    }

    setGhostOverlay(null);
  };

  const imageGhostStyle =
    mode === 'image' && imageCanvas && imagePreviewUrl && ghostOverlay && object
      ? getImageGhostStyle({
          imageCanvas,
          imageSize,
          imageRotation,
          object,
          ghostOverlay,
        })
      : null;

  return (
    <PermanentDrawer title={title}>
      <Box component="div" sx={{ position: 'relative', height: '100%' }}>
        <ModeSelector
          color={workingColor}
          mode={mode}
          onColorChange={handleWorkingColorChange}
          onExport={handleExport}
          onModeChange={handleModeChange}
          sx={{
            position: 'absolute',
            top: 5,
            left: 5,
            backgroundColor: 'transparent',
            zIndex: 1,
            '& .MuiButtonBase-root': {
              backgroundColor: 'white',
            },
            '& .MuiButtonBase-root: hover': {
              backgroundColor: '#efefef',
            },
          }}
        />
        <OverlayBrushPanel
          mode={mode}
          imageName={imageName}
          imageRotation={imageRotation}
          imageSize={imageSize}
          onImageRotationChange={setImageRotation}
          onImageSelect={handleImageFileChange}
          onImageSizeChange={setImageSize}
          onTextChange={setTextValue}
          onTextRotationChange={setTextRotation}
          onTextSizeChange={setTextSize}
          text={textValue}
          textRotation={textRotation}
          textSize={textSize}
        />
        {imageGhostStyle && (
          <Box
            component="img"
            alt="Image ghost preview"
            src={imagePreviewUrl!}
            sx={{
              position: 'fixed',
              left: imageGhostStyle.left,
              top: imageGhostStyle.top,
              width: imageGhostStyle.width,
              height: imageGhostStyle.height,
              transform: `translate(-50%, -50%) rotate(${imageRotation}deg)`,
              transformOrigin: 'center center',
              opacity: 0.45,
              pointerEvents: 'none',
              zIndex: 3,
              border: '1px dashed rgba(33, 150, 243, 0.7)',
              borderRadius: 0.5,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              boxShadow: '0 6px 18px rgba(0, 0, 0, 0.18)',
              objectFit: 'contain',
              filter: 'saturate(1.05)',
            }}
          />
        )}
        {object && (
          <div style={{ height: '100%' }} ref={editorRef}>
            <ThreeJsCanvas
              continuousPaint={
                mode === 'mesh' ||
                mode === 'triangle' ||
                mode === 'triangle_neighbors'
              }
              geometry={object}
              onSelect={handleSelect}
              onPointerMoveModel={handlePointerMoveModel}
              onPointerOverModel={handlePointerOverModel}
              onPointerOutModel={handlePointerOutModel}
            />
          </div>
        )}
      </Box>
    </PermanentDrawer>
  );
}

function getPixelsPerWorldUnit(
  camera: THREE.Camera,
  pointWorld: THREE.Vector3,
  viewportHeightPx: number
) {
  if (camera instanceof THREE.PerspectiveCamera) {
    const distance = camera.position.distanceTo(pointWorld);
    const visibleHeight =
      2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * distance;

    if (visibleHeight <= 0) {
      return 1;
    }

    return (viewportHeightPx / visibleHeight) * camera.zoom;
  }

  if (camera instanceof THREE.OrthographicCamera) {
    const visibleHeight = (camera.top - camera.bottom) / camera.zoom;

    if (visibleHeight <= 0) {
      return 1;
    }

    return viewportHeightPx / visibleHeight;
  }

  return 1;
}

function getImageGhostStyle({
  imageCanvas,
  imageSize,
  imageRotation,
  object,
  ghostOverlay,
}: {
  ghostOverlay: GhostOverlay;
  imageCanvas: HTMLCanvasElement;
  imageRotation: number;
  imageSize: number;
  object: THREE.Object3D;
}) {
  const aspect = imageCanvas.width / imageCanvas.height || 1;
  const widthLocal = aspect >= 1 ? imageSize : imageSize * aspect;
  const heightLocal = aspect >= 1 ? imageSize / aspect : imageSize;
  const worldScale = object.getWorldScale(new THREE.Vector3());
  const scaleFactor = Math.max(worldScale.x, worldScale.y, worldScale.z);
  const width = widthLocal * scaleFactor * ghostOverlay.pixelsPerWorldUnit;
  const height = heightLocal * scaleFactor * ghostOverlay.pixelsPerWorldUnit;

  return {
    left: ghostOverlay.x,
    top: ghostOverlay.y,
    width: `${Math.max(width, 18)}px`,
    height: `${Math.max(height, 18)}px`,
    rotation: imageRotation,
  };
}

function getPointerClientPosition(
  e: ThreeEvent<PointerEvent>,
  bounds: DOMRect
) {
  if (e.nativeEvent) {
    return {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
    };
  }

  if (typeof e.clientX === 'number' && typeof e.clientY === 'number') {
    return {
      x: e.clientX,
      y: e.clientY,
    };
  }

  if (e.pointer) {
    return {
      x: bounds.left + ((e.pointer.x + 1) / 2) * bounds.width,
      y: bounds.top + ((1 - e.pointer.y) / 2) * bounds.height,
    };
  }

  return null;
}
