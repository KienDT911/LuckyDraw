import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useT } from '../i18n';
import { Icon } from './Icon';

// ---------- Confirm dialog ----------

interface ConfirmRequest {
  message: string;
  okLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

const useConfirmStore = create<{ req: ConfirmRequest | null }>(() => ({ req: null }));

export function confirmDialog(
  message: string,
  opts: { okLabel?: string; cancelLabel?: string; danger?: boolean } = {},
): Promise<boolean> {
  return new Promise((resolve) => useConfirmStore.setState({ req: { message, ...opts, resolve } }));
}

export function ConfirmHost() {
  const req = useConfirmStore((s) => s.req);
  const t = useT();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus the dialog itself, not its OK button: the key that opened it (e.g. Space to spin) must not be able
  // to press OK on its key-up.
  useEffect(() => {
    if (req) dialogRef.current?.focus();
  }, [req]);

  if (!req) return null;
  const finish = (ok: boolean) => {
    useConfirmStore.setState({ req: null });
    req.resolve(ok);
  };
  return (
    <div className="modal-backdrop" onMouseDown={() => finish(false)}>
      <div className="modal-shell modal-sm" onMouseDown={(e) => e.stopPropagation()}>
        <div
          ref={dialogRef}
          className="modal"
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.repeat) return;
            if (e.key === 'Escape') {
              e.preventDefault();
              finish(false);
            } else if (e.key === 'Enter' && e.target === e.currentTarget) {
              // preventDefault also tells page-level shortcuts this key is taken.
              e.preventDefault();
              finish(true);
            }
          }}
        >
          <p className="modal-message">{req.message}</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => finish(false)}>
              {req.cancelLabel ?? t('cancel')}
            </button>
            <button className={req.danger ? 'btn btn-danger' : 'btn btn-primary'} onClick={() => finish(true)}>
              {req.okLabel ?? t('ok')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Toasts ----------

interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
  action?: { label: string; run: () => void };
}

const useToastStore = create<{ toasts: Toast[] }>(() => ({ toasts: [] }));
let toastSeq = 0;

export function toast(message: string, kind: Toast['kind'] = 'info', action?: Toast['action']): void {
  const id = ++toastSeq;
  useToastStore.setState((s) => ({ toasts: [...s.toasts, { id, message, kind, action }] }));
  setTimeout(() => dismissToast(id), action ? 15000 : 4500);
}

function dismissToast(id: number) {
  useToastStore.setState((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
}

export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="toast-host" data-noexport>
      {toasts.map((x) => (
        <div key={x.id} className={`toast toast-${x.kind}`}>
          <span>{x.message}</span>
          {x.action && (
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                x.action?.run();
                dismissToast(x.id);
              }}
            >
              {x.action.label}
            </button>
          )}
          <button className="toast-close" aria-label="close" onClick={() => dismissToast(x.id)}>
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
