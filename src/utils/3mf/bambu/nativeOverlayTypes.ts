export type BambuNativeOverlayGeometryPart = {
  color: string;
  triangles: [number, number, number][];
  vertices: [number, number, number][];
};

export type BambuNativeOverlayTarget = {
  modelPath: string;
  objectId: string;
  objectName?: string | null;
};

export type BambuNativeOverlayPatch = {
  geometryParts: BambuNativeOverlayGeometryPart[];
  overlayId: string;
  overlayName?: string;
  palette: string[];
  target: BambuNativeOverlayTarget;
};

export type BambuNativeOverlayExportReport = {
  appendedColors: string[];
  colorSlots: Array<{
    color: string;
    slot: number;
    source: 'existing' | 'appended';
  }>;
  finalColorCount: number;
  geometryTriangles?: number;
  injectedObjects?: number;
  injectedParts?: number;
  warnings: string[];
};
