import React, { useEffect, useRef } from 'react';
import { state } from '../modules/state.js';

/**
 * Reusable Chart.js canvas wrapper with isolated instance lifecycle cleanup.
 */
export default function ChartCanvas({ id, renderFn, deps = [], className = '', ariaLabel = '' }) {
  const canvasRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof renderFn !== 'function') return undefined;

    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    const created = renderFn(canvas);
    instanceRef.current = created || state.charts[id] || null;

    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
      if (state.charts[id]) {
        state.charts[id].destroy();
        delete state.charts[id];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);

  return (
    <canvas
      ref={canvasRef}
      id={id}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel || undefined}
    />
  );
}
