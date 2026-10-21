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
  /**
   * Hand-tool pan with any tool: the middle mouse button always pans, the
   * primary button pans while this returns true (the editor's held Space).
   */
  isHandPanActive?: () => boolean;
  /** Called when a two-finger gesture starts — the editor cancels the in-progress stroke. */
  onPinchStart?: () => void;
  /**
   * 'width' (default): the page fills the container width and the container
   * grows to the page height (the surrounding page scrolls). 'contain': the
   * whole page fits inside the container's measured box — the full-screen
   * mobile editor, where nothing around the canvas scrolls.
   */
  fit?: 'width' | 'contain';
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
export function useStageViewport({
  panEnabled,
  isHandPanActive,
  onPinchStart,
  fit = 'width',
}: StageViewportOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [zoom, setZoom] = useState(MIN_USER_ZOOM);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<PinchState | null>(null);
  // Last pointer position (client px) of an active hand-tool pan.
  const handPanRef = useRef<{ x: number; y: number } | null>(null);
  const isHandPanActiveRef = useRef(isHandPanActive);
  isHandPanActiveRef.current = isHandPanActive;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      setContainerWidth(rect?.width ?? 0);
      setContainerHeight(rect?.height ?? 0);
    });
    observer.observe(container);
    return () => observer.disconnect();
    // The editor swaps its container element when the layout (and with it
    // `fit`) changes, so the observer re-attaches then.
  }, [fit]);

  const fitsBox = fit === 'contain' && containerHeight > 0;
  const baseScale = containerWidth <= 0
    ? 0
    : fitsBox
      ? Math.min(containerWidth / CANVAS_WIDTH, containerHeight / CANVAS_HEIGHT)
      : containerWidth / CANVAS_WIDTH;
  const stageScale = baseScale * zoom;
  // At zoom 1 the whole portrait document is visible (in 'width' mode the page
  // scrolls if needed); zooming magnifies within this fixed frame.
  const stageWidth = fitsBox ? CANVAS_WIDTH * baseScale : containerWidth;
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

  // Latest values for the long-lived DOM listeners of the hand-tool pan.
  const clampPositionRef = useRef(clampPosition);
  clampPositionRef.current = clampPosition;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

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

  // Hand-tool pan, on the container's DOM events: pointerdown fires before the
  // mousedown Konva reacts to, so the editor can check isHandPanning() and skip
  // starting a stroke. Window listeners keep the pan going outside the canvas.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const wantsPan = event.button === 1 || (event.button === 0 && isHandPanActiveRef.current?.());
      if (!wantsPan || event.pointerType === 'touch') {
        return;
      }
      event.preventDefault(); // no middle-click autoscroll
      handPanRef.current = { x: event.clientX, y: event.clientY };
    };
    const handlePointerMove = (event: PointerEvent) => {
      const last = handPanRef.current;
      if (!last) {
        return;
      }
      handPanRef.current = { x: event.clientX, y: event.clientY };
      setStagePosition((position) =>
        clampPositionRef.current(
          { x: position.x + event.clientX - last.x, y: position.y + event.clientY - last.y },
          zoomRef.current,
        ),
      );
    };
    const handlePointerUp = () => {
      handPanRef.current = null;
    };
    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [fit]);

  const isHandPanning = useCallback(() => handPanRef.current !== null, []);

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
    isMeasured: containerWidth > 0 && (fit === 'width' || containerHeight > 0),
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
    isHandPanning,
    stageProps,
  };
}

export type StageViewport = ReturnType<typeof useStageViewport>;
