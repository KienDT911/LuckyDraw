import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';

interface StageContextValue {
  scale: number;
  rootRef: RefObject<HTMLDivElement | null>;
}

const StageContext = createContext<StageContextValue>({ scale: 1, rootRef: { current: null } });
export const useStage = () => useContext(StageContext);

/**
 * Renders children on a fixed-size design canvas (e.g. 1920×1080) scaled to fit its container,
 * so what the audience sees and what gets exported are pixel-identical.
 */
export function Stage({
  width,
  height,
  children,
  rootRef,
}: {
  width: number;
  height: number;
  children: ReactNode;
  rootRef: RefObject<HTMLDivElement | null>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = box.w && box.h ? Math.min(box.w / width, box.h / height) : 0;
  const left = (box.w - width * scale) / 2;
  const top = (box.h - height * scale) / 2;

  return (
    <div ref={containerRef} className="stage-container">
      <StageContext.Provider value={{ scale: scale || 1, rootRef }}>
        <div
          ref={rootRef}
          className="stage-root"
          style={{
            width,
            height,
            left,
            top,
            transform: `scale(${scale})`,
            visibility: scale ? 'visible' : 'hidden',
          }}
        >
          {children}
        </div>
      </StageContext.Provider>
    </div>
  );
}
