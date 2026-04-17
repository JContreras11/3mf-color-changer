'use client';

import RedoRoundedIcon from '@mui/icons-material/RedoRounded';
import ThreeDRotationRoundedIcon from '@mui/icons-material/ThreeDRotationRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import VideocamRoundedIcon from '@mui/icons-material/VideocamRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { ThreeEvent } from '@react-three/fiber';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';
import React, { useEffect } from 'react';
import * as THREE from 'three';

import {
  TRUCKER_ADDON_OPTIONS,
  getCapFamily,
  getCapFamilyLabel,
  getSelectedAddonId,
} from '../etc/designCatalog';
import {
  GRAPHICS_LIBRARY_ITEMS,
  type GraphicLibraryItem,
} from '../etc/graphicsLibrary';
import { generateExportFile } from '../jobs/exportFile';
import { createExportReviewData } from '../utils/exportReview';
import {
  applyTruckerCapPreset,
  TRUCKER_COLOR_PRESETS,
  type TruckerColorSections,
} from '../utils/truckerCapPresets';
import applyRasterOverlay from '../utils/threejs/applyRasterOverlay';
import changeMeshColor from '../utils/threejs/changeMeshColor';
import cloneObjectForHistory from '../utils/threejs/cloneObjectForHistory';
import createImageCanvas from '../utils/threejs/createImageCanvas';
import createTextCanvas from '../utils/threejs/createTextCanvas';
import getPrimaryCapMeshSet from '../utils/threejs/getPrimaryCapMeshSet';
import getFace from '../utils/threejs/getFace';
import mirrorCanvasHorizontally from '../utils/threejs/mirrorCanvasHorizontally';
import {
  type FilamentImageOptions,
  processImageForFilaments,
} from '../utils/threejs/processImageForFilaments';
import {
  getRasterOverlayDimensions,
  getRasterOverlayPlacement,
} from '../utils/threejs/rasterOverlayPlacement';
import { normalizeExamplePath } from '../utils/examplePaths';
import ImagePreparationDialog from './ImagePreparationDialog';
import { useEditorFile } from './EditorFileContext';
import { useExportReview } from './ExportReviewContext';
import ModeSelector, {
  COMING_SOON_PANELS,
  DesignPanel,
  Mode,
} from './ModeSelector';
import OverlayBrushPanel from './OverlayBrushPanel';
import PermanentDrawer from './PermanentDrawer';
import ThreeJsCanvas, { ThreeJsCanvasHandle } from './threeJs/Canvas';
import useFile from './threeJs/useFile';

const BRAND_TITLE = 'MakeYourCaps.com';
const DEFAULT_IMAGE_ROTATION = 0;
const DEFAULT_IMAGE_SIZE = 30;
const DEFAULT_TEXT = 'Text';
const DEFAULT_TEXT_ROTATION = 0;
const DEFAULT_TEXT_SIZE = 24;
const DEFAULT_WORKING_COLOR = '#f00';
const MAX_HISTORY_STEPS = 30;
const DEFAULT_EDITOR_PANEL: DesignPanel = 'objects';
const PANEL_TO_MODE: Record<DesignPanel, Mode> = {
  graphics: 'image',
  materials: 'mesh',
  objects: 'mesh',
  text: 'text',
};

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

type PendingOverlayKind = 'image' | 'text' | null;
type HistoryAvailability = {
  canRedo: boolean;
  canUndo: boolean;
};

export type Settings = {
  workingColor?: string;
  mode?: Mode;
};

type Props = {
  examplePath?: string;
  onSettingsChange?: (settings: Settings) => void;
};

export default function Editor({ examplePath, onSettingsChange }: Props) {
  const { uploadedFile } = useEditorFile();
  const { setReviewData } = useExportReview();
  const router = useRouter();
  const initialSettingsRef = React.useRef<Settings>(loadEditorSettings());
  const file = examplePath || uploadedFile || undefined;

  useEffect(() => {
    if (!file) {
      router.replace('/');
    }
  }, [file, router]);

  const initialMode = initialSettingsRef.current.mode || 'mesh';
  const initialWorkingColor =
    initialSettingsRef.current.workingColor || DEFAULT_WORKING_COLOR;
  const capFamily = React.useMemo(() => getCapFamily(file), [file]);
  const capFamilyLabel = React.useMemo(
    () => getCapFamilyLabel(capFamily),
    [capFamily]
  );
  const selectedAddonId = React.useMemo(() => getSelectedAddonId(file), [file]);
  const canUseCuratedAddons =
    capFamily === 'trucker' && typeof file === 'string';
  const defaultActivePanel: DesignPanel = DEFAULT_EDITOR_PANEL;

  const [object, setObject, fileState] = useFile(file);
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [activePanel, setActivePanel] =
    React.useState<DesignPanel>(defaultActivePanel);
  const [workingColor, setWorkingColor] =
    React.useState<string>(initialWorkingColor);
  const [sourceImageCanvas, setSourceImageCanvas] =
    React.useState<HTMLCanvasElement | null>(null);
  const [imageName, setImageName] = React.useState<string>();
  const [imagePreparationCanvas, setImagePreparationCanvas] =
    React.useState<HTMLCanvasElement | null>(null);
  const [imagePreparationName, setImagePreparationName] = React.useState('');
  const [isImagePreparationOpen, setIsImagePreparationOpen] =
    React.useState(false);
  const [isApplyingImagePreparation, setIsApplyingImagePreparation] =
    React.useState(false);
  const [imageSize, setImageSize] = React.useState(DEFAULT_IMAGE_SIZE);
  const [imageRotation, setImageRotation] = React.useState(
    DEFAULT_IMAGE_ROTATION
  );
  const [imageMirrored, setImageMirrored] = React.useState(false);
  const [textValue, setTextValue] = React.useState(DEFAULT_TEXT);
  const [textSize, setTextSize] = React.useState(DEFAULT_TEXT_SIZE);
  const [textRotation, setTextRotation] = React.useState(DEFAULT_TEXT_ROTATION);
  const [textMirrored, setTextMirrored] = React.useState(false);
  const [ghostOverlay, setGhostOverlay] = React.useState<GhostOverlay | null>(
    null
  );
  const [pendingOverlayKind, setPendingOverlayKind] =
    React.useState<PendingOverlayKind>(null);
  const [historyAvailability, setHistoryAvailability] =
    React.useState<HistoryAvailability>({
      canRedo: false,
      canUndo: false,
    });
  const [isPreparingExport, setIsPreparingExport] = React.useState(false);
  const [isSceneReady, setIsSceneReady] = React.useState(false);
  const [sceneRevision, setSceneRevision] = React.useState(0);
  const forceCanvasRender = React.useCallback(() => {
    setSceneRevision((prev) => prev + 1);
  }, []);
  const canvasControlsRef = React.useRef<ThreeJsCanvasHandle | null>(null);
  const editorRef = React.useRef<HTMLDivElement>(null);
  const undoStackRef = React.useRef<THREE.Object3D[]>([]);
  const redoStackRef = React.useRef<THREE.Object3D[]>([]);
  const paintStrokeActiveRef = React.useRef(false);
  const handleModelReady = React.useCallback(() => {
    setIsSceneReady(true);
  }, []);
  const canUndo = historyAvailability.canUndo;
  const canRedo = historyAvailability.canRedo;
  const showHistoryControls = canUndo || canRedo;
  const isApplyingOverlay = pendingOverlayKind !== null;
  const isEditorLoading = fileState.isLoading || (!!object && !isSceneReady);
  const isEditorBusy =
    isEditorLoading ||
    isApplyingOverlay ||
    isPreparingExport ||
    isApplyingImagePreparation;
  const modelLoadingTitle = object
    ? 'Preparing your atelier view'
    : 'Loading 3MF file';
  const modelLoadingDescription = object
    ? 'Almost there — controls unlock as soon as the model finishes mounting in the canvas.'
    : 'Some 3MF files take a few seconds to unzip and parse. The editor will unlock automatically.';
  const processingTitle =
    pendingOverlayKind === 'image' ? 'Projecting image' : 'Projecting text';
  const processingDescription =
    pendingOverlayKind === 'image'
      ? 'Optimizing and projecting your graphic onto the cap surface.'
      : 'Calculating the text projection and fitting it onto the cap surface.';
  const exportPreparingTitle = 'Generating ready-to-print 3MF';
  const exportPreparingDescription =
    'Baking your latest geometry edits into a final export package before opening the review step.';
  const busyTitle = isPreparingExport
    ? exportPreparingTitle
    : isApplyingOverlay
      ? processingTitle
      : modelLoadingTitle;
  const busyDescription = isPreparingExport
    ? exportPreparingDescription
    : isApplyingOverlay
      ? processingDescription
      : modelLoadingDescription;
  const addonPanelDescription = canUseCuratedAddons
    ? `Swap between curated ${capFamilyLabel} accessory variations. Selecting one reloads the matching 3MF directly in the browser.`
    : capFamily === 'custom'
      ? 'Curated accessory variations are currently available for the prepared Trucker Cap base. Select that silhouette from Base to explore add-ons.'
      : `Accessory-ready 3MF variations are currently prepared for the Trucker Cap base. ${capFamilyLabel} add-ons will arrive in a future version.`;
  const primaryCapMeshSet = React.useMemo(
    () => getPrimaryCapMeshSet(object),
    [object]
  );
  const editingCapOnly =
    activePanel === 'graphics' || activePanel === 'text';
  const imageCanvas = React.useMemo(() => {
    if (!sourceImageCanvas) {
      return null;
    }

    return mirrorCanvasHorizontally(sourceImageCanvas, imageMirrored);
  }, [imageMirrored, sourceImageCanvas]);
  const imagePreviewUrl = React.useMemo(
    () => imageCanvas?.toDataURL() || null,
    [imageCanvas]
  );
  const baseTextCanvas = React.useMemo(() => {
    try {
      return createTextCanvas(textValue, workingColor);
    } catch {
      return null;
    }
  }, [textValue, workingColor]);
  const textCanvas = React.useMemo(() => {
    if (!baseTextCanvas) {
      return null;
    }

    return mirrorCanvasHorizontally(baseTextCanvas, textMirrored);
  }, [baseTextCanvas, textMirrored]);
  const textPreviewUrl = React.useMemo(
    () => textCanvas?.toDataURL() || null,
    [textCanvas]
  );

  const hasAddons = !!selectedAddonId && selectedAddonId !== 'base';

  const capColorCount = React.useMemo(() => {
    if (!object || !primaryCapMeshSet) return 0;
    const uniqueColors = new Set<string>();
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        
        // Use the sophisticated primary mesh detection for high accuracy
        if (!primaryCapMeshSet.has(mesh.uuid)) return;

        if (mesh.geometry && mesh.geometry.attributes.color) {
          const colorArray = mesh.geometry.attributes.color.array as Float32Array;
          if (colorArray && colorArray.length >= 3) {
            const threeColor = new THREE.Color(
              colorArray[0],
              colorArray[1],
              colorArray[2]
            );
            uniqueColors.add(`#${threeColor.getHexString()}`.toUpperCase());
          }
        }
      }
    });
    return uniqueColors.size;
  }, [object, sceneRevision, primaryCapMeshSet]);

  const isColorLimitExceeded = hasAddons && capColorCount > 3;

  useEffect(() => {
    const nextSettings = {
      mode,
      workingColor,
    };

    persistEditorSettings(nextSettings);
    onSettingsChange?.(nextSettings);
  }, [mode, onSettingsChange, workingColor]);

  useEffect(() => {
    setIsSceneReady(false);
    setGhostOverlay(null);
    setIsImagePreparationOpen(false);
    setImagePreparationCanvas(null);
    setImagePreparationName('');
    setIsApplyingImagePreparation(false);
    setActivePanel(defaultActivePanel);
  }, [defaultActivePanel, file]);

  useEffect(() => {
    const nextMode = PANEL_TO_MODE[activePanel];

    setMode((currentMode) =>
      currentMode === nextMode ? currentMode : nextMode
    );
  }, [activePanel]);

  useEffect(() => {
    if (COMING_SOON_PANELS.includes(activePanel)) {
      setActivePanel(DEFAULT_EDITOR_PANEL);
    }
  }, [activePanel]);

  useEffect(() => {
    setGhostOverlay(null);
  }, [object]);

  useEffect(() => {
    if (!object) {
      return;
    }

    object.traverse((child) => {
      const mesh = child as THREE.Mesh;

      if (!mesh.isMesh || mesh.userData.isOverlay) {
        return;
      }

      const shouldShow =
        !editingCapOnly ||
        primaryCapMeshSet.size === 0 ||
        primaryCapMeshSet.has(mesh.uuid);
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      materials.forEach((material) => {
        const nextMaterial = material as THREE.Material & {
          depthWrite?: boolean;
          opacity?: number;
          transparent?: boolean;
          userData?: Record<string, unknown>;
        };
        const userData = (nextMaterial.userData ||= {});

        if (userData.editorOriginalOpacity === undefined) {
          userData.editorOriginalOpacity = nextMaterial.opacity ?? 1;
          userData.editorOriginalTransparent = !!nextMaterial.transparent;
          userData.editorOriginalDepthWrite = nextMaterial.depthWrite ?? true;
        }

        if (shouldShow) {
          nextMaterial.opacity = Number(userData.editorOriginalOpacity);
          nextMaterial.transparent = Boolean(userData.editorOriginalTransparent);
          nextMaterial.depthWrite = Boolean(userData.editorOriginalDepthWrite);
        } else {
          nextMaterial.opacity = 0;
          nextMaterial.transparent = true;
          nextMaterial.depthWrite = false;
        }

        nextMaterial.needsUpdate = true;
      });
    });

    forceCanvasRender();
  }, [editingCapOnly, forceCanvasRender, object, primaryCapMeshSet]);

  useEffect(() => {
    if (activePanel === 'objects') {
      setGhostOverlay(null);
    }
  }, [activePanel]);

  useEffect(() => {
    if (fileState.error) {
      enqueueSnackbar(fileState.error.message, { variant: 'error' });
    }
  }, [fileState.error]);

  const syncHistoryAvailability = React.useCallback(() => {
    setHistoryAvailability({
      canRedo: redoStackRef.current.length > 0,
      canUndo: undoStackRef.current.length > 0,
    });
  }, []);

  const resetHistory = React.useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    paintStrokeActiveRef.current = false;
    syncHistoryAvailability();
  }, [syncHistoryAvailability]);

  const createHistorySnapshot = React.useCallback(
    (sourceObject: THREE.Object3D | null) => {
      if (!sourceObject) {
        return null;
      }

      return cloneObjectForHistory(sourceObject);
    },
    []
  );

  const pushUndoSnapshot = React.useCallback(
    (snapshot: THREE.Object3D | null) => {
      if (!snapshot) {
        return;
      }

      undoStackRef.current.push(snapshot);

      if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
        undoStackRef.current.shift();
      }

      redoStackRef.current = [];
      syncHistoryAvailability();
    },
    [syncHistoryAvailability]
  );

  useEffect(() => {
    if (!object || !file) {
      return;
    }

    if (object.userData.factoryColorsApplied) {
      return;
    }

    const family = getCapFamily(file);
    if (family === 'trucker') {
      // Inyección pre-curada de colores (Opción A aprobada por el usuario).
      // Aplica Classic Americana para romper con el color gris inicial del motor.
      const factoryPreset = TRUCKER_COLOR_PRESETS[0];
      
      applyTruckerCapPreset(object, factoryPreset.sections);
      
      object.userData.factoryColorsApplied = true;
      forceCanvasRender();
      
      // Capturamos esto en el primer frame para que la base del usuario empiece con color
      pushUndoSnapshot(createHistorySnapshot(object));
    }
  }, [file, forceCanvasRender, object, pushUndoSnapshot, createHistorySnapshot]);

  useEffect(() => {
    resetHistory();
  }, [file, resetHistory]);

  useEffect(() => {
    const handlePointerUp = () => {
      paintStrokeActiveRef.current = false;
    };

    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  const handlePanelChange = React.useCallback((panel: DesignPanel) => {
    setActivePanel(panel);
    setGhostOverlay(null);
  }, []);

  const isMeshAvailableForProjection = React.useCallback(
    (mesh: THREE.Mesh) => {
      if (mesh.userData.excludeFromPainting) {
        return false;
      }

      if (!editingCapOnly || primaryCapMeshSet.size === 0) {
        return true;
      }

      return primaryCapMeshSet.has(mesh.uuid);
    },
    [editingCapOnly, primaryCapMeshSet]
  );

  const handleSelect = (e: ThreeEvent<MouseEvent>) => {
    if (isEditorBusy || activePanel === 'objects') {
      return;
    }

    if (mode === 'mesh') {
      performSyncSceneMutation(
        () => {
          handleMeshColorChange(e.object.uuid, workingColor);
        },
        {
          batchDuringStroke: e.type === 'pointermove',
        }
      );
    } else if (mode === 'image') {
      void handleImageOverlay(e);
    } else if (mode === 'text') {
      void handleTextOverlay(e);
    }
  };

  const handleExport = React.useCallback(async () => {
    if (!file || !object || isEditorBusy) {
      return;
    }

    // Validation: Limit to 3 colors if addons are active
    if (hasAddons && capColorCount > 3) {
      enqueueSnackbar(
        `Selection exceeds color limit: Please use a maximum of 3 colors for the cap base to preserve ${capFamilyLabel} accessory fidelity.`,
        {
          variant: 'warning',
          autoHideDuration: 6000,
        }
      );
      return;
    }

    let shouldResetPreparingExport = true;

    setIsPreparingExport(true);
    setGhostOverlay(null);

    try {
      await waitForNextPaint(2);

      const generatedFile = await generateExportFile(file, object);
      const previewObject = cloneObjectForHistory(object);

      setReviewData(
        createExportReviewData({
          fileOrPath: file,
          object,
          previewObject,
          generatedFile,
        })
      );

      shouldResetPreparingExport = false;
      router.push('/export');
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : String(error), {
        variant: 'error',
      });
    } finally {
      if (shouldResetPreparingExport) {
        setIsPreparingExport(false);
      }
    }
  }, [
    file,
    isEditorBusy,
    object,
    router,
    setReviewData,
    hasAddons,
    capColorCount,
    isColorLimitExceeded,
    capFamilyLabel,
  ]);

  const handleMeshColorChange = (uuid, color: string) => {
    object?.traverse((child) => {
      if (child.uuid !== uuid) {
        return;
      }

      changeMeshColor(child as THREE.Mesh, color);
    });
  };

  const handleWorkingColorChange = React.useCallback((color) => {
    setWorkingColor(color);
  }, []);

  const handleUndo = React.useCallback(() => {
    if (!object || isEditorBusy || undoStackRef.current.length === 0) {
      return;
    }

    const previousSnapshot = undoStackRef.current.pop() || null;

    if (!previousSnapshot) {
      syncHistoryAvailability();
      return;
    }

    redoStackRef.current.push(cloneObjectForHistory(object));
    paintStrokeActiveRef.current = false;
    setObject(previousSnapshot);
    setGhostOverlay(null);
    syncHistoryAvailability();
  }, [isEditorBusy, object, setObject, syncHistoryAvailability]);

  const handleRedo = React.useCallback(() => {
    if (!object || isEditorBusy || redoStackRef.current.length === 0) {
      return;
    }

    const nextSnapshot = redoStackRef.current.pop() || null;

    if (!nextSnapshot) {
      syncHistoryAvailability();
      return;
    }

    undoStackRef.current.push(cloneObjectForHistory(object));
    paintStrokeActiveRef.current = false;
    setObject(nextSnapshot);
    setGhostOverlay(null);
    syncHistoryAvailability();
  }, [isEditorBusy, object, setObject, syncHistoryAvailability]);

  const performSyncSceneMutation = React.useCallback(
    (
      mutate: () => void,
      options?: {
        batchDuringStroke?: boolean;
      }
    ) => {
      if (!object) {
        return;
      }

      const shouldBatchDuringStroke = !!options?.batchDuringStroke;
      const shouldCaptureSnapshot =
        !shouldBatchDuringStroke || !paintStrokeActiveRef.current;
      const snapshot = shouldCaptureSnapshot
        ? createHistorySnapshot(object)
        : null;

      if (shouldBatchDuringStroke) {
        paintStrokeActiveRef.current = true;
      }

      mutate();

      if (shouldCaptureSnapshot) {
        pushUndoSnapshot(snapshot);
      }

      forceCanvasRender();
    },
    [createHistorySnapshot, forceCanvasRender, object, pushUndoSnapshot]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreEditorShortcut(event)) {
        return;
      }

      const key = event.key.toLowerCase();
      const usesModifier = event.metaKey || event.ctrlKey;
      const wantsUndo = usesModifier && !event.shiftKey && key === 'z';
      const wantsRedo =
        (event.ctrlKey && !event.metaKey && !event.shiftKey && key === 'y') ||
        (usesModifier && event.shiftKey && key === 'z');

      if (wantsUndo) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (wantsRedo) {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRedo, handleUndo]);

  const handleImageOverlay = async (e: ThreeEvent<MouseEvent>) => {
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

    if (!isMeshAvailableForProjection(mesh)) {
      return;
    }

    const camera = e.camera as THREE.Camera;
    const pointWorld = e.point.clone();
    const overlayFace = e.face;
    const overlayName = imageName || 'Image overlay';

    await runOverlayPlacement(
      'image',
      async () => {
        await applyRasterOverlay({
          camera,
          root: object,
          targetMesh: mesh,
          pointWorld,
          face: overlayFace,
          canvas: imageCanvas,
          size: imageSize,
          rotationDegrees: imageRotation,
          name: overlayName,
        });
      },
      object
    );
  };

  const handleTextOverlay = async (e: ThreeEvent<MouseEvent>) => {
    if (!e.face || !object) {
      return;
    }

    const mesh = e.object as THREE.Mesh;

    if (!isMeshAvailableForProjection(mesh)) {
      return;
    }

    try {
      if (!textCanvas) {
        throw new Error(
          'Please enter some text before placing it on the model.'
        );
      }

      const camera = e.camera as THREE.Camera;
      const pointWorld = e.point.clone();
      const overlayFace = e.face;
      const overlayName = textValue.trim() || 'Text overlay';

      await runOverlayPlacement(
        'text',
        async () => {
          await applyRasterOverlay({
            camera,
            root: object,
            targetMesh: mesh,
            pointWorld,
            face: overlayFace,
            canvas: textCanvas,
            size: textSize,
            rotationDegrees: textRotation,
            name: overlayName,
          });
        },
        object
      );
    } catch (error) {
      enqueueSnackbar(error.toString(), { variant: 'warning' });
    }
  };

  const openImagePreparation = React.useCallback(
    (canvas: HTMLCanvasElement, name: string) => {
      setImagePreparationCanvas(canvas);
      setImagePreparationName(name);
      setIsImagePreparationOpen(true);
    },
    []
  );

  const handleImageFileChange = React.useCallback(
    async (uploadedFile: File) => {
      try {
        const canvas = await createImageCanvas(uploadedFile);
        openImagePreparation(canvas, uploadedFile.name);
      } catch (error) {
        enqueueSnackbar(error.toString(), { variant: 'error' });
      }
    },
    [openImagePreparation]
  );

  const handleLibraryGraphicSelect = React.useCallback(
    async (item: GraphicLibraryItem) => {
      try {
        const response = await fetch(item.path, {
          cache: 'force-cache',
        });

        if (!response.ok) {
          throw new Error('Could not load the selected library graphic.');
        }

        const blob = await response.blob();
        const fileName = `${item.id}.${item.type}`;
        const file = new File([blob], fileName, {
          type: blob.type || (item.type === 'svg' ? 'image/svg+xml' : 'image/png'),
        });
        const canvas = await createImageCanvas(file);

        openImagePreparation(canvas, `${item.label} (${item.type.toUpperCase()})`);
      } catch (error) {
        enqueueSnackbar(error.toString(), { variant: 'error' });
      }
    },
    [openImagePreparation]
  );

  const handleCancelImagePreparation = React.useCallback(() => {
    if (isApplyingImagePreparation) {
      return;
    }

    setIsImagePreparationOpen(false);
    setImagePreparationCanvas(null);
    setImagePreparationName('');
  }, [isApplyingImagePreparation]);

  const handleConfirmImagePreparation = React.useCallback(
    async (options: FilamentImageOptions) => {
      if (!imagePreparationCanvas) {
        return;
      }

      setIsApplyingImagePreparation(true);

      try {
        await waitForNextPaint(1);

        const { canvas, palette } = processImageForFilaments(
          imagePreparationCanvas,
          options
        );

        setSourceImageCanvas(canvas);
        setImageName(imagePreparationName);
        setIsImagePreparationOpen(false);
        setImagePreparationCanvas(null);
        setImagePreparationName('');

        if (palette.length > 0) {
          enqueueSnackbar(
            `Graphic prepared with ${palette.length} mapped color${
              palette.length === 1 ? '' : 's'
            }.`,
            {
              variant: 'success',
            }
          );
        }
      } catch (error) {
        enqueueSnackbar(error.toString(), { variant: 'error' });
      } finally {
        setIsApplyingImagePreparation(false);
      }
    },
    [imagePreparationCanvas, imagePreparationName]
  );

  const handlePointerMoveModel = (e: ThreeEvent<PointerEvent>) => {
    if (
      isEditorBusy ||
      activePanel === 'objects' ||
      (activePanel === 'graphics' && mode !== 'image') ||
      (activePanel === 'text' && mode !== 'text')
    ) {
      setGhostOverlay(null);
      return;
    }

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

    if (!isMeshAvailableForProjection(mesh)) {
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
    if (isEditorBusy || activePanel === 'objects') {
      return;
    }

    if (editorRef.current) {
      editorRef.current.style.cursor = 'crosshair';
    }
  };

  const handlePointerOutModel = () => {
    if (editorRef.current) {
      editorRef.current.style.cursor = 'auto';
    }

    setGhostOverlay(null);
  };

  const runOverlayPlacement = React.useCallback(
    async (
      kind: Exclude<PendingOverlayKind, null>,
      action: () => Promise<void>,
      sourceObject: THREE.Object3D | null
    ) => {
      setPendingOverlayKind(kind);
      setGhostOverlay(null);

      try {
        await waitForNextPaint(2);
        const snapshot = createHistorySnapshot(sourceObject);
        await action();
        pushUndoSnapshot(snapshot);
        forceCanvasRender();
      } catch (error) {
        enqueueSnackbar(error.toString(), { variant: 'error' });
      } finally {
        setPendingOverlayKind(null);
      }
    },
    [createHistorySnapshot, forceCanvasRender, pushUndoSnapshot]
  );

  const handleApplyTruckerPreset = React.useCallback(
    (sections: TruckerColorSections) => {
      if (!object) {
        return;
      }

      performSyncSceneMutation(() => {
        const applied = applyTruckerCapPreset(object, sections);

        if (!applied) {
          throw new Error(
            'The current 3MF layout could not be matched to the trucker cap section presets.'
          );
        }
      });
    },
    [object, performSyncSceneMutation]
  );

  const handleAddonSelect = React.useCallback(
    (option: (typeof TRUCKER_ADDON_OPTIONS)[number]) => {
      if (isEditorBusy) {
        return;
      }

      if (!canUseCuratedAddons) {
        enqueueSnackbar(
          capFamily === 'custom'
            ? 'Curated add-ons are available for the prepared Trucker Cap base.'
            : `${capFamilyLabel} add-ons are coming in a future version.`,
          {
            variant: 'info',
          }
        );
        return;
      }

      if (selectedAddonId === option.id) {
        return;
      }

      router.push(
        '/editor?example=' + encodeURIComponent(normalizeExamplePath(option.path))
      );
    },
    [
      canUseCuratedAddons,
      capFamily,
      capFamilyLabel,
      isEditorBusy,
      router,
      selectedAddonId,
    ]
  );

  const previewSource: OverlayPreviewSource | null =
    activePanel === 'graphics' &&
    mode === 'image' &&
    imageCanvas &&
    imagePreviewUrl
      ? {
          canvas: imageCanvas,
          rotationDegrees: imageRotation,
          size: imageSize,
          url: imagePreviewUrl,
        }
      : activePanel === 'text' &&
          mode === 'text' &&
          textCanvas &&
          textPreviewUrl
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

  const floatingControls = [
    ...(showHistoryControls
      ? [
          {
            disabled: !canUndo || isEditorBusy,
            icon: <UndoRoundedIcon />,
            key: 'undo',
            label: 'Undo (Ctrl/Cmd+Z)',
            onClick: handleUndo,
          },
          {
            disabled: !canRedo || isEditorBusy,
            icon: <RedoRoundedIcon />,
            key: 'redo',
            label: 'Redo (Ctrl+Y / Cmd+Shift+Z)',
            onClick: handleRedo,
          },
        ]
      : []),
    {
      disabled: !object || isEditorBusy,
      icon: <VideocamRoundedIcon />,
      key: 'reset-view',
      label: 'Reset view',
      onClick: () => canvasControlsRef.current?.resetView(),
    },
    {
      disabled: !object || isEditorBusy,
      icon: <ThreeDRotationRoundedIcon />,
      key: 'orbit-left',
      label: 'Rotate view',
      onClick: () => canvasControlsRef.current?.orbitLeft(),
    },
    {
      disabled: !object || isEditorBusy,
      icon: <ZoomInRoundedIcon />,
      key: 'zoom-in',
      label: 'Zoom in',
      onClick: () => canvasControlsRef.current?.zoomIn(),
    },
    {
      disabled: !object || isEditorBusy,
      icon: <ZoomOutRoundedIcon />,
      key: 'zoom-out',
      label: 'Zoom out',
      onClick: () => canvasControlsRef.current?.zoomOut(),
    },
  ] as const;

  const exportAction = (
    <Tooltip
      title={isColorLimitExceeded ? `Compatibility limit reached: Use a maximum of 3 colors for the cap base to preserve ${capFamilyLabel} accessory fidelity.` : ""}
      placement="bottom"
      arrow
    >
      <span>
        <Button
          disabled={!object || isEditorBusy || isColorLimitExceeded}
          onClick={handleExport}
          sx={{
            px: { xs: 2.75, md: 3.5 },
            py: 1.35,
            borderRadius: '999px',
            background: isColorLimitExceeded 
              ? alpha('#ef4444', 0.12)
              : 'linear-gradient(145deg, #0058bc 0%, #0f6fe3 100%)',
            color: isColorLimitExceeded ? '#ef4444' : '#ffffff',
            border: isColorLimitExceeded ? `1.5px dashed ${alpha('#ef4444', 0.4)}` : 'none',
            fontFamily: '"Manrope", "Inter", sans-serif',
            fontSize: { xs: 14, md: 15 },
            fontWeight: 800,
            letterSpacing: '-0.02em',
            textTransform: 'none',
            boxShadow: isColorLimitExceeded ? 'none' : '0 16px 28px rgba(0, 88, 188, 0.22)',
            '&:hover': {
              background: isColorLimitExceeded 
                ? alpha('#ef4444', 0.18)
                : 'linear-gradient(145deg, #004da6 0%, #0c67d6 100%)',
            },
            '&.Mui-disabled': {
              bgcolor: isColorLimitExceeded ? alpha('#ef4444', 0.08) : undefined,
              color: isColorLimitExceeded ? alpha('#ef4444', 0.45) : undefined,
            }
          }}
        >
          {isColorLimitExceeded ? 'Color Limit Error' : 'Export .3MF'}
        </Button>
      </span>
    </Tooltip>
  );

  if (!file) {
    return null;
  }

  return (
    <PermanentDrawer title={BRAND_TITLE} action={exportAction}>
      <Box
        component="div"
        sx={{
          position: 'relative',
          height: '100%',
          p: { xs: 2, md: 3 },
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: 'minmax(0, 1fr) 390px',
            xl: 'minmax(0, 1fr) 420px',
          },
          gridTemplateRows: { xs: 'minmax(420px, 1fr) auto', lg: '1fr' },
          gap: { xs: 2, md: 3 },
          overflow: { xs: 'auto', lg: 'hidden' },
        }}
      >
        <ModeSelector
          activePanel={activePanel}
          disabled={isEditorBusy}
          onPanelChange={handlePanelChange}
          sx={{
            position: 'absolute',
            left: { xs: 12, md: 20, xl: 28 },
            top: { xs: 12, sm: '50%' },
            transform: { xs: 'none', sm: 'translateY(-50%)' },
            zIndex: 6,
          }}
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

        <Box
          sx={{
            position: 'relative',
            minWidth: 0,
            minHeight: { xs: 420, lg: 0 },
            pl: { xs: 0, sm: 13, md: 14, xl: 15 },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              height: '100%',
              overflow: 'hidden',
              borderRadius: { xs: '32px', md: '40px' },
              border: 'none',
              boxShadow: '0 36px 110px rgba(2, 6, 23, 0.34)',
              background: '#bdbdbd',
            }}
          >
            {/* Eliminado: Direct 3MF Preview Badge */}

            <Box
              ref={editorRef}
              sx={{
                position: 'relative',
                height: '100%',
                pointerEvents: isEditorBusy ? 'none' : 'auto',
                '& canvas': {
                  outline: 'none',
                },
              }}
            >
              {object && (
                <ThreeJsCanvas
                  ref={canvasControlsRef}
                  continuousPaint={activePanel === 'materials'}
                  geometry={object}
                  onModelReady={handleModelReady}
                  onSelect={handleSelect}
                  onPointerMoveModel={handlePointerMoveModel}
                  onPointerOutModel={handlePointerOutModel}
                  onPointerOverModel={handlePointerOverModel}
                  showGroundGrid={false}
                  showViewCube={false}
                />
              )}
            </Box>

            {isColorLimitExceeded && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  zIndex: 5,
                  pointerEvents: 'none',
                  pt: { xs: 2.5, md: 4 }, // Posición en el borde superior
                  bgcolor: alpha('#000000', 0.02),
                }}
              >
                <Box
                  sx={{
                    px: 3,
                    py: 1.75,
                    borderRadius: '20px',
                    bgcolor: alpha('#ffffff', 0.96),
                    backdropFilter: 'blur(12px)',
                    border: '1.2px solid #ef4444',
                    boxShadow: '0 12px 32px rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    maxWidth: 560,
                    pointerEvents: 'auto',
                  }}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '12px',
                      bgcolor: '#fee2e2',
                      color: '#ef4444',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <WarningAmberRoundedIcon sx={{ fontSize: 24 }} />
                  </Box>
                  <Box>
                    <Typography
                      sx={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: '#991b1b',
                        fontFamily: '"Manrope", "Inter", sans-serif',
                        lineHeight: 1.1,
                        mb: 0.25,
                      }}
                    >
                      Bambu Studio Color Limit
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: '#b91c1c',
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      Use a maximum of 3 colors for this cap with accessories to avoid slicer coloring errors.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            <Stack
              direction="row"
              spacing={1}
              sx={{
                position: 'absolute',
                bottom: 22,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2,
                px: 1.25,
                py: 1,
                borderRadius: '999px',
                bgcolor: alpha('#ffffff', 0.86),
                backdropFilter: 'blur(16px)',
                boxShadow: '0 18px 36px rgba(15, 23, 42, 0.10)',
              }}
            >
              {floatingControls.map((control, index) => (
                <React.Fragment key={control.key}>
                  {index > 0 && (
                    <Box
                      sx={{
                        width: 1,
                        alignSelf: 'stretch',
                        bgcolor: alpha('#c1c6d7', 0.5),
                      }}
                    />
                  )}
                  <FloatingControlButton
                    disabled={control.disabled}
                    label={control.label}
                    onClick={control.onClick}
                  >
                    {control.icon}
                  </FloatingControlButton>
                </React.Fragment>
              ))}
            </Stack>

            <Box
              component="div"
              aria-busy={isEditorBusy}
              aria-live="polite"
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                opacity: isEditorBusy ? 1 : 0,
                pointerEvents: 'none',
                transition: 'opacity 180ms ease',
                zIndex: isEditorBusy ? 5 : -1,
                background: alpha('#f8fafc', 0.4),
                backdropFilter: isEditorBusy ? 'blur(18px)' : 'blur(0px)',
              }}
            >
              <Stack
                spacing={2}
                alignItems="center"
                sx={{
                  width: 'min(460px, calc(100vw - 48px))',
                  px: { xs: 3, md: 4 },
                  py: { xs: 3, md: 3.5 },
                  borderRadius: '28px',
                  bgcolor: alpha('#ffffff', 0.72),
                  boxShadow: '0 40px 100px rgba(0, 0, 0, 0.16)',
                  border: 'none',
                  textAlign: 'center',
                }}
              >
                <CircularProgress
                  size={44}
                  thickness={4}
                  sx={{ color: '#0058bc' }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Manrope", "Inter", sans-serif',
                    fontSize: { xs: 24, md: 30 },
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: '#111827',
                  }}
                >
                  {busyTitle}
                </Typography>
                <Typography
                  sx={{
                    maxWidth: 360,
                    color: '#4b5563',
                    fontSize: { xs: 14, md: 15 },
                    lineHeight: 1.6,
                  }}
                >
                  {busyDescription}
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0, minHeight: { xs: 480, lg: 0 } }}>
          <OverlayBrushPanel
            activePanel={activePanel}
            addonOptions={TRUCKER_ADDON_OPTIONS}
            addonPanelDescription={addonPanelDescription}
            addonsEnabled={canUseCuratedAddons}
            color={workingColor}
            disabled={isEditorBusy}
            graphicLibraryItems={GRAPHICS_LIBRARY_ITEMS}
            imageName={imageName}
            imageMirrored={imageMirrored}
            imageRotation={imageRotation}
            imageSize={imageSize}
            isColorLimitExceeded={isColorLimitExceeded}
            capColorCount={capColorCount}
            onAddonSelect={handleAddonSelect}
            onApplyTruckerPreset={handleApplyTruckerPreset}
            onColorChange={handleWorkingColorChange}
            onImageMirrorChange={setImageMirrored}
            onImageRotationChange={setImageRotation}
            onImageSelect={handleImageFileChange}
            onImageSizeChange={setImageSize}
            onLibraryGraphicSelect={handleLibraryGraphicSelect}
            onTextChange={setTextValue}
            onTextMirrorChange={setTextMirrored}
            onTextRotationChange={setTextRotation}
            onTextSizeChange={setTextSize}
            selectedAddonId={canUseCuratedAddons ? selectedAddonId : null}
            showTruckerPresets={capFamily === 'trucker'}
            text={textValue}
            textMirrored={textMirrored}
            textRotation={textRotation}
            textSize={textSize}
            truckerPresets={TRUCKER_COLOR_PRESETS}
          />
        </Box>
      </Box>
      <ImagePreparationDialog
        fileName={imagePreparationName}
        open={isImagePreparationOpen}
        sourceCanvas={imagePreparationCanvas}
        submitting={isApplyingImagePreparation}
        onCancel={handleCancelImagePreparation}
        onConfirm={handleConfirmImagePreparation}
      />
    </PermanentDrawer>
  );
}

const floatingControlButtonSx = {
  color: '#374151',
  width: 44,
  height: 44,
  '&:hover': {
    bgcolor: alpha('#ffffff', 0.92),
  },
};

function FloatingControlButton({
  children,
  disabled,
  label,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Tooltip title={label} arrow enterDelay={180}>
      <Box component="span" sx={{ display: 'inline-flex' }}>
        <IconButton
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          sx={floatingControlButtonSx}
        >
          {children}
        </IconButton>
      </Box>
    </Tooltip>
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

  if (
    projectedCorners.some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y)
    )
  ) {
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
        Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])
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

function loadEditorSettings(): Settings {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem('settings');

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as Settings & { mode?: string };

    return {
      ...parsed,
      mode: normalizeEditorMode(parsed.mode),
    };
  } catch {
    return {};
  }
}

function persistEditorSettings(settings: Settings) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem('settings', JSON.stringify(settings));
  } catch {
    // Ignore storage write failures (private mode, quota, etc.).
  }
}

function normalizeEditorMode(
  mode: Settings['mode'] | string | undefined
): Mode | undefined {
  if (mode === 'add_text') {
    return 'text';
  }

  if (mode === 'add_image_decal') {
    return 'image';
  }

  if (
    mode === 'triangle_neighbors' ||
    mode === 'triangle' ||
    mode === 'select_color'
  ) {
    return 'mesh';
  }

  if (
    mode === 'mesh' ||
    mode === 'text' ||
    mode === 'image'
  ) {
    return mode;
  }

  return undefined;
}

function waitForNextPaint(frames = 1) {
  return new Promise<void>((resolve) => {
    const step = (remainingFrames: number) => {
      window.requestAnimationFrame(() => {
        if (remainingFrames <= 1) {
          resolve();
          return;
        }

        step(remainingFrames - 1);
      });
    };

    step(frames);
  });
}

function shouldIgnoreEditorShortcut(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;

  if (!target) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}
