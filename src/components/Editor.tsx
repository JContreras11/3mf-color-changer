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
import {
  getRasterOverlayDimensions,
  getRasterOverlayPlacement,
} from '../utils/threejs/rasterOverlayPlacement';
import sameVector3 from '../utils/threejs/sameVector3';
import { useJobContext } from './JobProvider';
import ModeSelector, { Mode } from './ModeSelector';
import OverlayBrushPanel from './OverlayBrushPanel';
import PermanentDrawer from './PermanentDrawer';
import ThreeJsCanvas from './threeJs/Canvas';
import useFile from './threeJs/useFile';

type GhostOverlay = {
  camera: THREE.Camera;
  faceIndex: number;
  pointWorld: THREE.Vector3;
  targetMesh: THREE.Mesh;
};

type OverlayPreviewSource = {
  canvas: HTMLCanvasElement;
  rotationDegrees: number;
  size: number;
  url: string;
};

type OverlayGhostPreview = {
  center: {
    x: number;
    y: number;
  };
  corners: {
    x: number;
    y: number;
  }[];
  height: number;
  transform: string;
  width: number;
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
  const textCanvas = React.useMemo(() => {
    try {
      return createTextCanvas(textValue, workingColor);
    } catch (error) {
      return null;
    }
  }, [textValue, workingColor]);
  const textPreviewUrl = React.useMemo(
    () => textCanvas?.toDataURL() || null,
    [textCanvas]
  );

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
    if (mode !== 'image' && mode !== 'text') {
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
      camera: e.camera as THREE.Camera,
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
      if (!textCanvas) {
        throw new Error('Please enter some text before placing it on the model.');
      }

      applyRasterOverlay({
        camera: e.camera as THREE.Camera,
        root: object,
        targetMesh: mesh,
        pointWorld: e.point.clone(),
        face: e.face,
        canvas: textCanvas,
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
    const previewCanvas =
      mode === 'image' ? imageCanvas : mode === 'text' ? textCanvas : null;

    if (
      !previewCanvas ||
      !editorRef.current ||
      !object ||
      e.faceIndex === undefined ||
      e.faceIndex === null
    ) {
      setGhostOverlay(null);
      return;
    }

    const mesh = e.object as THREE.Mesh;

    if (mesh.userData.excludeFromPainting) {
      setGhostOverlay(null);
      return;
    }

    setGhostOverlay({
      camera: e.camera as THREE.Camera,
      faceIndex: e.faceIndex,
      pointWorld: e.point.clone(),
      targetMesh: mesh,
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

  const previewSource: OverlayPreviewSource | null =
    mode === 'image' && imageCanvas && imagePreviewUrl
      ? {
          canvas: imageCanvas,
          rotationDegrees: imageRotation,
          size: imageSize,
          url: imagePreviewUrl,
        }
      : mode === 'text' && textCanvas && textPreviewUrl
        ? {
            canvas: textCanvas,
            rotationDegrees: textRotation,
            size: textSize,
            url: textPreviewUrl,
          }
        : null;

  const overlayGhostPreview =
    previewSource && ghostOverlay && object && editorRef.current
      ? getOverlayGhostPreview({
          bounds: editorRef.current.getBoundingClientRect(),
          camera: ghostOverlay.camera,
          canvas: previewSource.canvas,
          face: getFace(ghostOverlay.targetMesh, ghostOverlay.faceIndex),
          pointWorld: ghostOverlay.pointWorld,
          root: object,
          rotationDegrees: previewSource.rotationDegrees,
          size: previewSource.size,
          targetMesh: ghostOverlay.targetMesh,
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
        {overlayGhostPreview && previewSource && (
          <>
            <Box
              component="div"
              sx={{
                position: 'fixed',
                left: 0,
                top: 0,
                width: overlayGhostPreview.width,
                height: overlayGhostPreview.height,
                transform: overlayGhostPreview.transform,
                transformOrigin: '0 0',
                opacity: 0.42,
                pointerEvents: 'none',
                zIndex: 3,
                objectFit: 'fill',
                willChange: 'transform',
              }}
            >
              <Box
                component="img"
                alt="Overlay ghost preview"
                src={previewSource.url}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'fill',
                  filter: 'saturate(1.05)',
                  transform: 'scaleX(-1) rotate(180deg)',
                  transformOrigin: 'center center',
                  display: 'block',
                }}
              />
            </Box>
            <Box
              component="svg"
              viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
              preserveAspectRatio="none"
              sx={{
                position: 'fixed',
                inset: 0,
                width: '100vw',
                height: '100vh',
                pointerEvents: 'none',
                zIndex: 4,
                overflow: 'visible',
              }}
            >
              <polygon
                points={overlayGhostPreview.corners
                  .map((point) => `${point.x},${point.y}`)
                  .join(' ')}
                fill="rgba(33,150,243,0.05)"
                stroke="rgba(33,150,243,0.80)"
                strokeWidth="1.5"
                strokeDasharray="6 4"
              />
              <circle
                cx={overlayGhostPreview.center.x}
                cy={overlayGhostPreview.center.y}
                r="7"
                fill="rgba(255,255,255,0.55)"
                stroke="rgba(33,150,243,0.95)"
                strokeWidth="1.5"
              />
              <line
                x1={overlayGhostPreview.center.x - 12}
                y1={overlayGhostPreview.center.y}
                x2={overlayGhostPreview.center.x + 12}
                y2={overlayGhostPreview.center.y}
                stroke="rgba(33,150,243,0.95)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1={overlayGhostPreview.center.x}
                y1={overlayGhostPreview.center.y - 12}
                x2={overlayGhostPreview.center.x}
                y2={overlayGhostPreview.center.y + 12}
                stroke="rgba(33,150,243,0.95)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </Box>
          </>
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

function getOverlayGhostPreview({
  bounds,
  camera,
  canvas,
  face,
  pointWorld,
  root,
  rotationDegrees,
  size,
  targetMesh,
}: {
  bounds: DOMRect;
  camera: THREE.Camera;
  canvas: HTMLCanvasElement;
  face: THREE.Face;
  pointWorld: THREE.Vector3;
  root: THREE.Object3D;
  rotationDegrees: number;
  size: number;
  targetMesh: THREE.Mesh;
}): OverlayGhostPreview | null {
  const dimensions = getRasterOverlayDimensions(canvas, size);
  const placement = getRasterOverlayPlacement({
    camera,
    face,
    height: dimensions.height,
    pointWorld,
    root,
    rotationDegrees,
    targetMesh,
    width: dimensions.width,
  });
  const projectedCorners = [
    placement.cornersRoot[3],
    placement.cornersRoot[2],
    placement.cornersRoot[1],
    placement.cornersRoot[0],
  ].map((cornerRoot) =>
    projectWorldPoint(root.localToWorld(cornerRoot.clone()), camera, bounds)
  );

  if (projectedCorners.some((point) => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    return null;
  }

  const transform = getQuadTransform(
    [
      { x: 0, y: 0 },
      { x: canvas.width, y: 0 },
      { x: canvas.width, y: canvas.height },
      { x: 0, y: canvas.height },
    ],
    projectedCorners
  );

  if (!transform) {
    return null;
  }

  const center = projectWorldPoint(
    root.localToWorld(placement.positionRoot.clone()),
    camera,
    bounds
  );

  return {
    center,
    corners: projectedCorners,
    height: canvas.height,
    transform,
    width: canvas.width,
  };
}

function projectWorldPoint(
  pointWorld: THREE.Vector3,
  camera: THREE.Camera,
  bounds: DOMRect
) {
  const projected = pointWorld.clone().project(camera);

  return {
    x: bounds.left + ((projected.x + 1) / 2) * bounds.width,
    y: bounds.top + ((1 - projected.y) / 2) * bounds.height,
  };
}

function getQuadTransform(
  source: { x: number; y: number }[],
  target: { x: number; y: number }[]
) {
  const homography = solveHomography(source, target);

  if (!homography) {
    return null;
  }

  const [a, b, c, d, e, f, g, h, i] = homography;

  return `matrix3d(${a}, ${d}, 0, ${g}, ${b}, ${e}, 0, ${h}, 0, 0, 1, 0, ${c}, ${f}, 0, ${i})`;
}

function solveHomography(
  source: { x: number; y: number }[],
  target: { x: number; y: number }[]
) {
  if (source.length !== 4 || target.length !== 4) {
    return null;
  }

  const matrix: number[][] = [];
  const values: number[] = [];

  for (let index = 0; index < 4; index += 1) {
    const { x, y } = source[index];
    const { x: X, y: Y } = target[index];

    matrix.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    values.push(X);
    matrix.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    values.push(Y);
  }

  const solution = solveLinearSystem(matrix, values);

  if (!solution) {
    return null;
  }

  return [...solution, 1];
}

function solveLinearSystem(matrix: number[][], values: number[]) {
  const size = matrix.length;
  const augmented = matrix.map((row, index) => [...row, values[index]]);

  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;

    for (let row = pivot + 1; row < size; row += 1) {
      if (
        Math.abs(augmented[row][pivot]) >
        Math.abs(augmented[maxRow][pivot])
      ) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < 1e-10) {
      return null;
    }

    if (maxRow !== pivot) {
      const temp = augmented[pivot];
      augmented[pivot] = augmented[maxRow];
      augmented[maxRow] = temp;
    }

    const pivotValue = augmented[pivot][pivot];

    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) {
        continue;
      }

      const factor = augmented[row][pivot];

      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}
