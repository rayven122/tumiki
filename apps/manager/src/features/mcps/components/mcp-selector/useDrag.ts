"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type DragState = {
  isDragging: boolean;
  itemId: string | null;
  position: { x: number; y: number } | null;
};

type UseDragOptions = {
  onDragEnd?: (itemId: string, dropZone: string | null) => void;
};

export const useDrag = (options: UseDragOptions = {}) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    itemId: null,
    position: null,
  });

  const dropZonesRef = useRef<Map<string, HTMLElement>>(new Map());

  const startDrag = useCallback(
    (itemId: string, event: React.PointerEvent | PointerEvent) => {
      event.preventDefault();
      setDragState({
        isDragging: true,
        itemId,
        position: { x: event.clientX, y: event.clientY },
      });
      (event.target as HTMLElement).setPointerCapture(event.pointerId);
    },
    [],
  );

  const detectDropZone = useCallback((x: number, y: number): string | null => {
    for (const [zoneId, element] of dropZonesRef.current.entries()) {
      const rect = element.getBoundingClientRect();
      if (
        x >= rect.left &&
        x <= rect.right &&
        y >= rect.top &&
        y <= rect.bottom
      ) {
        return zoneId;
      }
    }
    return null;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    setDragState((prev) => {
      if (!prev.isDragging) return prev;
      return {
        ...prev,
        position: { x: event.clientX, y: event.clientY },
      };
    });
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }

      setDragState((prev) => {
        if (!prev.isDragging || !prev.itemId) return prev;
        const dropZone = detectDropZone(event.clientX, event.clientY);
        options.onDragEnd?.(prev.itemId, dropZone);
        return { isDragging: false, itemId: null, position: null };
      });
    },
    [options, detectDropZone],
  );

  const registerDropZone = useCallback(
    (zoneId: string, element: HTMLElement | null) => {
      if (element) {
        dropZonesRef.current.set(zoneId, element);
      } else {
        dropZonesRef.current.delete(zoneId);
      }
    },
    [],
  );

  const getHoveredDropZone = useCallback((): string | null => {
    if (!dragState.position) return null;
    return detectDropZone(dragState.position.x, dragState.position.y);
  }, [dragState.position, detectDropZone]);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState.isDragging, handlePointerMove, handlePointerUp]);

  return { dragState, startDrag, registerDropZone, getHoveredDropZone };
};
