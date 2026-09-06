import { useCallback, useRef, useState } from 'react';

/**
 * useResizable — provides draggable resize behaviour for a panel.
 *
 * @param {'horizontal' | 'vertical'} direction
 * @param {number} initialSize  initial size in px
 * @param {number} minSize      minimum allowed size in px
 * @param {number} maxSize      maximum allowed size in px
 */
export function useResizable(direction, initialSize, minSize = 80, maxSize = Infinity, reverse = false) {
  const [size, setSize] = useState(initialSize);
  const dragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(initialSize);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSize.current = size;

    // Prevent iframes from stealing pointer events during drag
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((f) => {
      f.style.pointerEvents = 'none';
    });

    const onMouseMove = (me) => {
      if (!dragging.current) return;
      const rawDelta = (direction === 'horizontal' ? me.clientX : me.clientY) - startPos.current;
      const delta = reverse ? -rawDelta : rawDelta;
      const next = Math.max(minSize, Math.min(maxSize, startSize.current + delta));
      setSize(next);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      iframes.forEach((f) => {
        f.style.pointerEvents = '';
      });
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [direction, minSize, maxSize, size, reverse]);

  return { size, setSize, handleMouseDown };
}
