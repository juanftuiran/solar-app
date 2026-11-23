import React, { useEffect, useRef } from 'react';
import { state } from '../modules/state.js';

/**
 * Reusable Chart.js canvas wrapper with automatic instance cleanup.
 */
export default function ChartCanvas({ id, renderFn, deps = [], className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof renderFn !== 'function') return undefined;

    renderFn(canvas);

    return () => {
      if (state.charts[id]) {
        state.charts[id].destroy();
        delete state.charts[id];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, ...deps]);

  return <canvas ref={canvasRef} id={id} className={className} />;
}
