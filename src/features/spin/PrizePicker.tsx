import { useEffect, useRef } from 'react';
import { useT } from '../../shared/i18n';
import { winnersOf } from '../../shared/store';
import { Icon } from '../../shared/ui/Icon';
import type { Prize, Winner } from '../../types';

/** Opened by clicking the prize bar on the live stage. */
export function PrizePicker({
  prizes,
  winners,
  currentId,
  onPick,
  onClose,
}: {
  prizes: Prize[];
  winners: Winner[];
  currentId: string | null;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector<HTMLButtonElement>('.picker-item.on')?.focus();
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        ref={listRef}
        className="modal picker"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <h3>{t('selectPrize')}</h3>
        {prizes.map((p) => {
          const n = winnersOf(winners, p.id).length;
          const done = n >= p.slots;
          return (
            <button
              key={p.id}
              className={p.id === currentId ? 'picker-item on' : 'picker-item'}
              onClick={(e) => {
                // Hand the keyboard back to the stage so Space spins.
                e.currentTarget.blur();
                onPick(p.id);
              }}
            >
              <span className="picker-name">
                {done && <Icon name="check" size={14} />}
                {p.name}
              </span>
              <span className={done ? 'pill pill-done' : n ? 'pill pill-partial' : 'pill'}>
                {n}/{p.slots}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
