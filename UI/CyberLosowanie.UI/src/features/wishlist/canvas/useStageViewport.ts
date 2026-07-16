import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MAX_USER_ZOOM,
  MIN_USER_ZOOM,
  WHEEL_ZOOM_FACTOR,
  ZOOM_STEP_FACTOR,
} from './canvasConstants';

export interface StageViewportOptions {
  /** Whether dragging the stage background should pan (viewer: always; editor: select tool). */
  panEnabled: boolean;
  /** Called when a two-finger gesture starts — the editor cancels the in-progress stroke. */
  onPinchStart?: () => void;
}

interface PinchState {
  distance: number;
  center: { x: number; y: number };
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Responsive viewport for the fixed 1080x1528 document: fit-to-width base scale
 * (ResizeObserver), user zoom 1–4x (Ctrl+wheel, buttons, two-finger pinch) and
 * clamped panning. Konva-specific — the stage is transformed, layers stay in
 * document coordinates.
 */
export function useStageViewport({ panEnabled, onPinchStart }: StageViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [zoom, setZoom] = useState(MIN_USER_ZOOM);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<PinchState | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setContainerWidth(width);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const baseScale = containerWidth > 0 ? containerWidth / CANVAS_WIDTH : 0;
  const stageScale = baseScale * zoom;
  const stageWidth = containerWidth;
  // At zoom 1 the whole portrait document is visible (page scrolls if needed);
  // zooming magnifies within this fixed frame.
  const stageHeight = CANVAS_HEIGHT * baseScale;

  const clampPosition = useCallback(
    (position: { x: number; y: number }, forZoom: number) => {
      const scale = baseScale * forZoom;
      const minX = Math.min(0, stageWidth - CANVAS_WIDTH * scale);
      const minY = Math.min(0, stageHeight - CANVAS_HEIGHT * scale);
      return { x: clamp(position.x, minX, 0), y: clamp(position.y, minY, 0) };
    },
    [baseScale, stageWidth, stageHeight],
  );

  // Re-clamp after container resizes (e.g. rotation) so content never drifts away.
  useEffect(() => {
    setStagePosition((position) => clampPosition(position, zoom));
  }, [clampPosition, zoom]);

  /** Zooms so the document point under `anchor` (container px) stays put. */
  const zoomAt = useCallback(
    (anchor: { x: number; y: number }, nextZoomRaw: number) => {
      const nextZoom = clamp(nextZoomRaw, MIN_USER_ZOOM, MAX_USER_ZOOM);
      const scale = baseScale * zoom;
      const nextScale = baseScale * nextZoom;
      if (scale <= 0) {
        return;
      }
      const documentX = (anchor.x - stagePosition.x) / scale;
      const documentY = (anchor.y - stagePosition.y) / scale;
      setZoom(nextZoom);
      setStagePosition(
        clampPosition(
          { x: anchor.x - documentX * nextScale, y: anchor.y - documentY * nextScale },
          nextZoom,
        ),
      );
    },
    [baseScale, zoom, stagePosition, clampPosition],
  );

  const viewCenter = useCallback(
    () => ({ x: stageWidth / 2, y: stageHeight / 2 }),
    [stageWidth, stageHeight],
  );

  const zoomIn = useCallback(
    () => zoomAt(viewCenter(), zoom * ZOOM_STEP_FACTOR),
    [zoomAt, viewCenter, zoom],
  );
  const zoomOut = useCallback(
    () => zoomAt(viewCenter(), zoom / ZOOM_STEP_FACTOR),
    [zoomAt, viewCenter, zoom],
  );
  const resetView = useCallback(() => {
    setZoom(MIN_USER_ZOOM);
    setStagePosition({ x: 0, y: 0 });
  }, []);

  // --- stage event handlers ---------------------------------------------------

  const handleWheel = useCallback(
    (event: KonvaEventObject<WheelEvent>) => {
      // Plain wheel keeps scrolling the page; Ctrl+wheel (and trackpad pinch,
      // which browsers report as ctrlKey) zooms at the pointer.
      if (!event.evt.ctrlKey) {
        return;
      }
      event.evt.preventDefault();
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) {
        return;
      }
      const factor = event.evt.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
      zoomAt(pointer, zoom * factor);
    },
    [zoomAt, zoom],
  );

  const handleTouchMove = useCallback(
    (event: KonvaEventObject<TouchEvent>) => {
      const touches = event.evt.touches;
      if (touches.length !== 2) {
        return;
      }
      event.evt.preventDefault();
      const stage = event.target.getStage();
      if (!stage) {
        return;
      }
      const rect = stage.container().getBoundingClientRect();
      const first = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
      const second = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top };
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const center = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };

      const previous = pinchRef.current;
      if (!previous) {
        // Gesture start: from now on the fingers zoom/pan, never draw.
        pinchRef.current = { distance, center };
        onPinchStart?.();
        return;
      }

      if (previous.distance > 0) {
        zoomAt(center, zoom * (distance / previous.distance));
      }
      // Two-finger pan: follow the gesture center between frames.
      setStagePosition((position) =>
        clampPosition(
          {
            x: position.x + (center.x - previous.center.x),
            y: position.y + (center.y - previous.center.y),
          },
          zoom,
        ),
      );
      pinchRef.current = { distance, center };
    },
    [clampPosition, onPinchStart, zoom, zoomAt],
  );

  const handleTouchEnd = useCallback((event: KonvaEventObject<TouchEvent>) => {
    if (event.evt.touches.length < 2) {
      pinchRef.current = null;
    }
  }, []);

  const isPinching = useCallback(() => pinchRef.current !== null, []);

  // Dragging the stage pans; item drags bubble here too, so only accept the
  // stage itself as the drag target.
  const handleDragEnd = useCallback(
    (event: KonvaEventObject<DragEvent>) => {
      const stage = event.target.getStage();
      if (!stage || event.target !== stage) {
        return;
      }
      setStagePosition(clampPosition({ x: stage.x(), y: stage.y() }, zoom));
    },
    [clampPosition, zoom],
  );

  const stageProps = useMemo(
    () => ({
      width: stageWidth,
      height: stageHeight,
      scaleX: stageScale,
      scaleY: stageScale,
      x: stagePosition.x,
      y: stagePosition.y,
      // At zoom 1 everything fits — dragging would just fight with drawing.
      draggable: panEnabled && zoom > MIN_USER_ZOOM,
      dragBoundFunc: (position: { x: number; y: number }) => clampPosition(position, zoom),
      onWheel: handleWheel,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onDragEnd: handleDragEnd,
    }),
    [
      stageWidth,
      stageHeight,
      stageScale,
      stagePosition,
      panEnabled,
      zoom,
      clampPosition,
      handleWheel,
      handleTouchMove,
      handleTouchEnd,
      handleDragEnd,
    ],
  );

  return {
    containerRef,
    isMeasured: containerWidth > 0,
    stageScale,
    stagePosition,
    zoom,
    zoomPercentage: Math.round(zoom * 100),
    canZoomIn: zoom < MAX_USER_ZOOM,
    canZoomOut: zoom > MIN_USER_ZOOM,
    zoomIn,
    zoomOut,
    resetView,
    isPinching,
    stageProps,
  };
}

export type StageViewport = ReturnType<typeof useStageViewport>;
