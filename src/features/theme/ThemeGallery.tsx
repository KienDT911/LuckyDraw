import { memo, useMemo, useRef } from 'react';
import { applyTheme, buildSpinScene, resetLayout } from '../../shared/defaults';
import { t as tNow, translate, useLocale } from '../../shared/i18n';
import { SceneCanvas } from '../../shared/stage/SceneCanvas';
import { Stage } from '../../shared/stage/Stage';
import { useCampaign } from '../../shared/store';
import { DEFAULT_THEME, findTheme, THEMES, type Theme } from '../../shared/themes';
import { confirmDialog, toast } from '../../shared/ui/feedback';
import { Icon } from '../../shared/ui/Icon';
import { useEditor } from '../editor/editorStore';
import { sampleCode } from '../stage/sampleData';
import { spinItems } from '../stage/sceneItems';

export function applyThemeNow(th: Theme): void {
  useEditor.getState().snapshot(`theme:${Date.now()}`);
  useCampaign.getState().update((d) => applyTheme(d, th));
  toast(tNow('themeApplied', { name: th.name[useLocale.getState().locale] }), 'success');
}

export async function confirmResetLayout(): Promise<void> {
  if (!(await confirmDialog(tNow('resetLayoutConfirm'), { danger: true, okLabel: tNow('resetLayout') }))) return;
  useEditor.getState().snapshot(`reset:${Date.now()}`);
  useCampaign.getState().update((d) => resetLayout(d, findTheme(d.themeId) ?? DEFAULT_THEME));
  toast(tNow('layoutReset'), 'success');
}

const noop = () => {};
const PREVIEW = { codeLength: 13, charset: '0123456789', prizes: [], phoneMask: 'showLast4' as const };

/** A live, scaled-down render of the spin stage in a theme, built from the real stage components. */
const ThemePreview = memo(function ThemePreview({ theme, locale }: { theme: Theme; locale: 'vi' | 'en' }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scene = useMemo(() => buildSpinScene(theme), [theme]);
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);
  const items = spinItems(
    scene,
    PREVIEW,
    { prizeLabel: 'GIẢI ĐẶC BIỆT', codes: [sampleCode(1, 13, '0123456789')], slots: 3, reelCode: sampleCode(1, 13, '0123456789') },
    t,
  );
  return (
    // inert: the preview is a picture; its buttons must not take focus or clicks.
    <div className="theme-preview" inert>
      <Stage width={1920} height={1080} rootRef={rootRef}>
        <SceneCanvas
          background={scene.background}
          items={items}
          editing={false}
          selectedId={null}
          onSelect={noop}
          onFrameChange={noop}
          onInteractionStart={noop}
        />
      </Stage>
    </div>
  );
});

/** Horizontal strip of theme presets; one click restyles both stages (undo-able in the designer). */
export function ThemeStrip() {
  const locale = useLocale((s) => s.locale);
  const activeId = useCampaign((s) => s.campaign.themeId);
  return (
    <div className="theme-strip">
      {THEMES.map((th) => {
        const active = th.id === activeId;
        return (
          // A div, not a button: the preview inside renders real stage buttons, which cannot nest in a button.
          <div
            key={th.id}
            role="button"
            tabIndex={0}
            aria-pressed={active}
            className={active ? 'theme-card active' : 'theme-card'}
            onClick={() => applyThemeNow(th)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                applyThemeNow(th);
              }
            }}
          >
            <ThemePreview theme={th} locale={locale} />
            <div className="theme-meta">
              <span className="theme-dot" style={{ background: th.accent }} />
              <span className="theme-name">{th.name[locale]}</span>
              {active && (
                <span className="theme-check">
                  <Icon name="check" size={12} />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
