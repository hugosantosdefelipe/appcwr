'use client';

import { useRef, useEffect, useCallback } from 'react';

export function useDragScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const scrollLeft = useRef(0);
  const scrollTop = useRef(0);
  const hasMoved = useRef(false);

  const onMouseDown = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    // Solo botón izquierdo
    if (e.button !== 0) return;

    isDragging.current = true;
    hasMoved.current = false;
    startX.current = e.pageX;
    startY.current = e.pageY;
    scrollLeft.current = el.scrollLeft;
    scrollTop.current = el.scrollTop;
    el.style.cursor = 'grab';
    el.style.userSelect = 'none';
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;
    const el = ref.current;
    if (!el) return;

    e.preventDefault();
    const dx = e.pageX - startX.current;
    const dy = e.pageY - startY.current;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
      el.style.cursor = 'grabbing';
    }

    el.scrollLeft = scrollLeft.current - dx;
    el.scrollTop = scrollTop.current - dy;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    const el = ref.current;
    if (el) {
      el.style.cursor = 'grab';
      el.style.userSelect = '';
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.cursor = 'grab';

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseDown, onMouseMove, onMouseUp]);

  return ref;
}
