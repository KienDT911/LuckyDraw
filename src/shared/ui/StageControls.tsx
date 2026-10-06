import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useT } from '../i18n';
import { Icon } from './Icon';

const HIDE_AFTER_MS = 2500;

export function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.();
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
}

/**
 * Operator controls for the live screens: a round button in the bottom-right corner that opens an island of
 * actions. Everything (button, island and mouse cursor) hides after a moment without mouse movement, so the
 * audience only ever sees the stage.
 */
export function StageControls({ children, busy = false }: { children: ReactNode; busy?: boolean }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const [awake, setAwake] = useState(true);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(false);
  const busyRef = useRef(busy);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  busyRef.current = busy;

  useEffect(() => {
    const sleep = () => {
      // Never hide under the pointer, during an export, or while a dropdown in the island is in use.
      const active = document.activeElement;
      if (hoverRef.current || busyRef.current || (active?.tagName === 'SELECT' && rootRef.current?.contains(active))) {
        timer.current = setTimeout(sleep, HIDE_AFTER_MS);
        return;
      }
      setAwake(false);
      setOpen(false);
    };
    const wake = () => {
      setAwake(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(sleep, HIDE_AFTER_MS);
    };
    const closeOnOutside = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      else if (e.key.toLowerCase() === 'f' && !e.repeat && !isTyping(e.target) && !document.querySelector('.modal-backdrop')) {
        toggleFullscreen();
      }
    };
    wake();
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('pointerdown', closeOnOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer.current);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('pointerdown', closeOnOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // Hide the mouse cursor together with the controls.
  useEffect(() => {
    document.body.classList.toggle('stage-idle', !awake);
    return () => document.body.classList.remove('stage-idle');
  }, [awake]);

  const classes = ['stage-controls', awake || busy ? '' : 'is-hidden', open ? 'is-open' : ''].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={classes}
      data-noexport
      onPointerEnter={() => (hoverRef.current = true)}
      onPointerLeave={() => (hoverRef.current = false)}
    >
      <div className="stage-island" role="toolbar" inert={!open}>
        {children}
        <span className="tb-sep" />
        <button className="tb-btn tb-icon" onClick={() => setLocale(locale === 'vi' ? 'en' : 'vi')} title={t('language')}>
          {locale === 'vi' ? 'VI' : 'EN'}
        </button>
        <button className="tb-btn tb-icon" onClick={toggleFullscreen} title={`${t('fullscreen')} (F)`}>
          <Icon name="expand" />
        </button>
      </div>
      <button
        type="button"
        className="stage-fab"
        aria-label={t('controls')}
        aria-expanded={open}
        title={t('controls')}
        onClick={(e) => {
          setOpen((o) => !o);
          // Keep Space/Enter free for spinning.
          e.currentTarget.blur();
        }}
      >
        <Icon name={open ? 'x' : 'dots'} size={22} />
      </button>
    </div>
  );
}
