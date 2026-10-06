import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import type { Background, Frame } from '../../types';
import { BackgroundLayer } from './BackgroundLayer';
import { useStage } from './Stage';

/** Layer 2 = spin components, 3 = number boxes, 4 = user elements. Background is layer 1. */
export type LayerIndex = 2 | 3 | 4;

export interface CanvasItem {
  id: string;
  layer: LayerIndex;
  frame: Frame;
  hidden: boolean;
  locked: boolean;
  opacity?: number;
  node: ReactNode;
  /** Receives clicks outside edit mode (buttons). */
  interactive?: boolean;
  /** Left out of PNG/PDF exports (operator-only controls). */
  noExport?: boolean;
}

type Handle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
type Mode = 'move' | 'rotate' | Handle;

const HANDLES: Handle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_SIZE = 10;

function handleVector(h: Handle): { hx: number; hy: number } {
  return {
    hx: h.includes('e') ? 1 : h.includes('w') ? -1 : 0,
    hy: h.includes('s') ? 1 : h.includes('n') ? -1 : 0,
  };
}

function computeFrame(mode: Mode, f0: Frame, dx: number, dy: number, p: { x: number; y: number }, shift: boolean): Frame {
  if (mode === 'move') return { ...f0, x: Math.round(f0.x + dx), y: Math.round(f0.y + dy) };

  const cx = f0.x + f0.w / 2;
  const cy = f0.y + f0.h / 2;

  if (mode === 'rotate') {
    let deg = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
    if (shift) deg = Math.round(deg / 15) * 15;
    deg = ((deg + 540) % 360) - 180;
    return { ...f0, rotation: Math.round(deg * 10) / 10 };
  }

  // Resize in the element's own (rotated) axes, keeping the opposite edge fixed.
  const { hx, hy } = handleVector(mode);
  const th = (f0.rotation * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const ldx = dx * cos + dy * sin;
  const ldy = -dx * sin + dy * cos;

  let w = hx ? Math.max(MIN_SIZE, f0.w + hx * ldx) : f0.w;
  let h = hy ? Math.max(MIN_SIZE, f0.h + hy * ldy) : f0.h;
  if (shift && hx && hy) {
    const s = Math.abs(ldx / f0.w) > Math.abs(ldy / f0.h) ? w / f0.w : h / f0.h;
    w = Math.max(MIN_SIZE, f0.w * s);
    h = Math.max(MIN_SIZE, f0.h * s);
  }
  const sx = (hx * (w - f0.w)) / 2;
  const sy = (hy * (h - f0.h)) / 2;
  const ncx = cx + sx * cos - sy * sin;
  const ncy = cy + sx * sin + sy * cos;
  return { x: Math.round(ncx - w / 2), y: Math.round(ncy - h / 2), w: Math.round(w), h: Math.round(h), rotation: f0.rotation };
}

export function SceneCanvas({
  background,
  items,
  editing,
  selectedId,
  onSelect,
  onFrameChange,
  onInteractionStart,
}: {
  background: Background;
  items: CanvasItem[];
  editing: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onFrameChange: (id: string, frame: Frame) => void;
  onInteractionStart: (id: string) => void;
}) {
  const { scale, rootRef } = useStage();

  const toStage = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale } : { x: 0, y: 0 };
  };

  const begin = (e: ReactPointerEvent, item: CanvasItem, mode: Mode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    // preventDefault keeps focus where it was; blur it so a half-typed inspector value is committed to the
    // item it belongs to before the selection changes.
    (document.activeElement as HTMLElement | null)?.blur?.();
    onSelect(item.id);
    if (item.locked) return;

    // Capture the pointer so the drag still ends when the button is released outside the window.
    const target = e.currentTarget as Element;
    target.setPointerCapture?.(e.pointerId);

    const start = toStage(e.clientX, e.clientY);
    const f0 = item.frame;
    let started = false;
    const move = (ev: PointerEvent) => {
      const p = toStage(ev.clientX, ev.clientY);
      const dx = p.x - start.x;
      const dy = p.y - start.y;
      if (!started) {
        if (Math.hypot(dx, dy) < 2) return;
        started = true;
        onInteractionStart(item.id);
      }
      onFrameChange(item.id, computeFrame(mode, f0, dx, dy, p, ev.shiftKey));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  const selected = editing ? items.find((i) => i.id === selectedId) : undefined;

  return (
    <>
      <BackgroundLayer bg={background} onPointerDown={editing ? () => onSelect(null) : undefined} />
      {([2, 3, 4] as const).map((layer) => (
        <div key={layer} className={`layer layer-${layer}`}>
          {items
            .filter((i) => i.layer === layer && (editing || !i.hidden))
            .map((item) => (
              <div
                key={item.id}
                className={editing ? 'item item-editing' : 'item'}
                data-noexport={item.noExport ? '' : undefined}
                style={{
                  left: item.frame.x,
                  top: item.frame.y,
                  width: item.frame.w,
                  height: item.frame.h,
                  transform: item.frame.rotation ? `rotate(${item.frame.rotation}deg)` : undefined,
                  opacity: item.hidden ? 0.2 : (item.opacity ?? 1),
                  pointerEvents: editing || item.interactive ? 'auto' : 'none',
                }}
                onPointerDown={editing ? (e) => begin(e, item, 'move') : undefined}
              >
                {item.node}
              </div>
            ))}
        </div>
      ))}
      {selected && (
        <div
          className={selected.locked ? 'selection selection-locked' : 'selection'}
          style={
            {
              left: selected.frame.x,
              top: selected.frame.y,
              width: selected.frame.w,
              height: selected.frame.h,
              transform: selected.frame.rotation ? `rotate(${selected.frame.rotation}deg)` : undefined,
              '--inv': 1 / scale,
            } as CSSProperties
          }
          data-noexport=""
          onPointerDown={(e) => begin(e, selected, 'move')}
        >
          {!selected.locked && (
            <>
              {HANDLES.map((h) => (
                <div key={h} className={`handle handle-${h}`} onPointerDown={(e) => begin(e, selected, h)} />
              ))}
              <div className="handle-rotate-stem" />
              <div className="handle handle-rotate" onPointerDown={(e) => begin(e, selected, 'rotate')} />
            </>
          )}
        </div>
      )}
    </>
  );
}
