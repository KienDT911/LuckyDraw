import { useEffect, useRef } from 'react';
import { FONTS } from '../../shared/fonts';
import { useT, type MessageKey } from '../../shared/i18n';
import { useCampaign } from '../../shared/store';
import { ColorInput, Field, NumberInput, OptionalColorInput, Select, TextInput, Toggle } from '../../shared/ui/fields';
import { Icon, type IconName } from '../../shared/ui/Icon';
import type { Frame, PageId, SceneElement, SystemComponent } from '../../types';
import { REEL_SHAPE_IDS } from '../spin/reelShapes';
import { useEditor } from './editorStore';
import {
  addImage,
  addShape,
  addText,
  duplicateElement,
  importImage,
  moveElement,
  patchItem,
  removeElement,
  replaceImage,
  systemComponents,
  updateScene,
} from './sceneOps';

// ---------- Schema-driven property fields ----------

type FieldDesc =
  | { key: string; label: MessageKey; kind: 'color' | 'optColor' | 'bool' | 'font' }
  | { key: string; label: MessageKey; kind: 'text'; multiline?: boolean }
  | { key: string; label: MessageKey; kind: 'number'; min?: number; max?: number; step?: number }
  | { key: string; label: MessageKey; kind: 'select'; options: SelectOption[] };

interface SelectOption {
  value: string | number;
  /** Literal label, or `labelKey` for a translated one. */
  label?: string;
  labelKey?: MessageKey;
}

const BUTTON_FIELDS: FieldDesc[] = [
  { key: 'label', label: 'label', kind: 'text' },
  { key: 'bg', label: 'fill', kind: 'color' },
  { key: 'bg2', label: 'metallic', kind: 'optColor' },
  { key: 'color', label: 'textColor', kind: 'color' },
  { key: 'glow', label: 'glow', kind: 'optColor' },
  { key: 'font', label: 'font', kind: 'font' },
  { key: 'fontSize', label: 'fontSize', kind: 'number', min: 8, max: 200 },
  { key: 'letterSpacing', label: 'letterSpacing', kind: 'number', min: 0, max: 60 },
  { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 300 },
  { key: 'borderColor', label: 'border', kind: 'color' },
  { key: 'borderWidth', label: 'borderWidth', kind: 'number', min: 0, max: 40 },
];

const COMPONENT_FIELDS: Record<string, FieldDesc[]> = {
  reels: [
    {
      key: 'shape',
      label: 'boxShape',
      kind: 'select',
      options: REEL_SHAPE_IDS.map((id) => ({
        value: id,
        labelKey: `boxShape${id.charAt(0).toUpperCase()}${id.slice(1)}` as MessageKey,
      })),
    },
    { key: 'bg', label: 'fill', kind: 'color' },
    { key: 'bg2', label: 'gradientEnd', kind: 'optColor' },
    { key: 'color', label: 'textColor', kind: 'color' },
    { key: 'glow', label: 'glow', kind: 'optColor' },
    { key: 'font', label: 'font', kind: 'font' },
    { key: 'fontScale', label: 'glyphScale', kind: 'number', min: 0.2, max: 1.5, step: 0.05 },
    { key: 'borderColor', label: 'border', kind: 'color' },
    { key: 'borderColor2', label: 'rimGradient', kind: 'optColor' },
    { key: 'borderWidth', label: 'borderWidth', kind: 'number', min: 0, max: 40 },
    { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 300 },
    { key: 'gap', label: 'gap', kind: 'number', min: 0, max: 200 },
    { key: 'idleChar', label: 'idleChar', kind: 'text' },
    { key: 'shadow', label: 'shadow', kind: 'bool' },
  ],
  prizeBar: [
    { key: 'bg', label: 'fill', kind: 'color' },
    { key: 'color', label: 'textColor', kind: 'color' },
    { key: 'labelBg', label: 'labelBg', kind: 'color' },
    { key: 'labelBg2', label: 'labelGradient', kind: 'optColor' },
    { key: 'labelColor', label: 'labelColor', kind: 'color' },
    { key: 'labelFont', label: 'labelFont', kind: 'font' },
    { key: 'font', label: 'font', kind: 'font' },
    { key: 'fontSize', label: 'fontSize', kind: 'number', min: 8, max: 200 },
    { key: 'letterSpacing', label: 'letterSpacing', kind: 'number', min: 0, max: 40 },
    { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 300 },
    { key: 'borderColor', label: 'border', kind: 'color' },
    { key: 'borderWidth', label: 'borderWidth', kind: 'number', min: 0, max: 40 },
    { key: 'maxVisible', label: 'maxVisible', kind: 'number', min: 1, max: 50 },
    { key: 'showCount', label: 'showCount', kind: 'bool' },
  ],
  spinButton: BUTTON_FIELDS,
  resultsButton: BUTTON_FIELDS,
  backButton: BUTTON_FIELDS,
  board: [
    { key: 'columns', label: 'columns', kind: 'select', options: [{ value: 1, label: '1' }, { value: 2, label: '2' }] },
    { key: 'baseFontSize', label: 'fontSize', kind: 'number', min: 8, max: 80 },
    { key: 'showName', label: 'showName', kind: 'bool' },
    { key: 'showPhone', label: 'showPhone', kind: 'bool' },
    { key: 'showCode', label: 'showCode', kind: 'bool' },
    { key: 'hideEmpty', label: 'hideEmpty', kind: 'bool' },
    { key: 'ornament', label: 'ornament', kind: 'bool' },
    { key: 'font', label: 'font', kind: 'font' },
    { key: 'labelFont', label: 'labelFont', kind: 'font' },
    { key: 'bg', label: 'fill', kind: 'color' },
    { key: 'bg2', label: 'gradientEnd', kind: 'optColor' },
    { key: 'textColor', label: 'textColor', kind: 'color' },
    { key: 'descColor', label: 'descColor', kind: 'color' },
    { key: 'labelBg', label: 'labelBg', kind: 'color' },
    { key: 'labelBg2', label: 'labelGradient', kind: 'optColor' },
    { key: 'labelColor', label: 'labelColor', kind: 'color' },
    { key: 'borderColor', label: 'border', kind: 'color' },
    { key: 'borderWidth', label: 'borderWidth', kind: 'number', min: 0, max: 40 },
    { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 300 },
    { key: 'padding', label: 'padding', kind: 'number', min: 0, max: 200 },
  ],
};

const TEXT_FIELDS: FieldDesc[] = [
  { key: 'text', label: 'text', kind: 'text', multiline: true },
  { key: 'font', label: 'font', kind: 'font' },
  { key: 'fontSize', label: 'fontSize', kind: 'number', min: 6, max: 600 },
  {
    key: 'fontWeight',
    label: 'fontWeight',
    kind: 'select',
    options: [400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: String(w) })),
  },
  {
    key: 'align',
    label: 'align',
    kind: 'select',
    options: [
      { value: 'left', label: '⟸' },
      { value: 'center', label: '⟺' },
      { value: 'right', label: '⟹' },
    ],
  },
  { key: 'color', label: 'color', kind: 'color' },
  { key: 'color2', label: 'metallic', kind: 'optColor' },
  { key: 'glow', label: 'glow', kind: 'optColor' },
  { key: 'letterSpacing', label: 'letterSpacing', kind: 'number', min: -20, max: 100 },
  { key: 'lineHeight', label: 'lineHeight', kind: 'number', min: 0.5, max: 4, step: 0.05 },
  { key: 'strokeColor', label: 'stroke', kind: 'color' },
  { key: 'strokeWidth', label: 'strokeWidth', kind: 'number', min: 0, max: 60 },
  { key: 'italic', label: 'italic', kind: 'bool' },
  { key: 'uppercase', label: 'uppercase', kind: 'bool' },
  { key: 'shadow', label: 'shadow', kind: 'bool' },
];

const SHAPE_FIELDS: FieldDesc[] = [
  {
    key: 'shape',
    label: 'shape',
    kind: 'select',
    options: [
      { value: 'rect', labelKey: 'shapeRect' },
      { value: 'ellipse', labelKey: 'shapeEllipse' },
    ],
  },
  { key: 'fill', label: 'fill', kind: 'color' },
  { key: 'borderColor', label: 'border', kind: 'color' },
  { key: 'borderWidth', label: 'borderWidth', kind: 'number', min: 0, max: 60 },
  { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 600 },
];

const FIT_OPTIONS = [
  { value: 'cover', labelKey: 'fitCover' },
  { value: 'contain', labelKey: 'fitContain' },
  { value: 'fill', labelKey: 'fitFill' },
] as const;

const DECOR_OPTIONS = [
  { value: 'none', labelKey: 'decorNone' },
  { value: 'spotlight', labelKey: 'decorSpotlight' },
  { value: 'sparkle', labelKey: 'decorSparkle' },
  { value: 'rays', labelKey: 'decorRays' },
  { value: 'deco', labelKey: 'decorDeco' },
] as const;

const IMAGE_FIELDS: FieldDesc[] = [
  { key: 'fit', label: 'fit', kind: 'select', options: [...FIT_OPTIONS] },
  { key: 'radius', label: 'radius', kind: 'number', min: 0, max: 600 },
];

function PropFields({
  fields,
  values,
  onChange,
}: {
  fields: FieldDesc[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const t = useT();
  return (
    <div className="prop-grid">
      {fields.map((f) => {
        const v = values[f.key];
        switch (f.kind) {
          case 'color':
            return (
              <Field key={f.key} label={t(f.label)}>
                <ColorInput value={String(v)} onChange={(x) => onChange(f.key, x)} />
              </Field>
            );
          case 'optColor':
            return (
              <Field key={f.key} label={t(f.label)}>
                <OptionalColorInput value={String(v ?? '')} onChange={(x) => onChange(f.key, x)} />
              </Field>
            );
          case 'bool':
            return <Toggle key={f.key} label={t(f.label)} checked={Boolean(v)} onChange={(x) => onChange(f.key, x)} />;
          case 'font':
            return (
              <Field key={f.key} label={t(f.label)}>
                <Select
                  value={String(v)}
                  options={FONTS.map((o) => ({ value: o.value as string, label: o.label }))}
                  onChange={(x) => onChange(f.key, x)}
                />
              </Field>
            );
          case 'text':
            return (
              <Field key={f.key} label={t(f.label)} wide={f.multiline}>
                <TextInput value={String(v ?? '')} multiline={f.multiline} onChange={(x) => onChange(f.key, x)} />
              </Field>
            );
          case 'number':
            return (
              <Field key={f.key} label={t(f.label)}>
                <NumberInput value={Number(v)} min={f.min} max={f.max} step={f.step} onChange={(x) => onChange(f.key, x)} />
              </Field>
            );
          case 'select':
            return (
              <Field key={f.key} label={t(f.label)}>
                <Select
                  value={v as string | number}
                  options={f.options.map((o) => ({
                    value: o.value,
                    label: o.labelKey ? t(o.labelKey) : (o.label ?? String(o.value)),
                  }))}
                  onChange={(x) => onChange(f.key, x)}
                />
              </Field>
            );
        }
      })}
    </div>
  );
}

// ---------- Panel ----------

const COMPONENT_LABELS: Record<string, MessageKey> = {
  reels: 'compReels',
  prizeBar: 'compPrizeBar',
  spinButton: 'compSpinButton',
  resultsButton: 'compResultsButton',
  board: 'compBoard',
  backButton: 'compBackButton',
};

export function EditorPanel({ page }: { page: PageId }) {
  const t = useT();
  const scene = useCampaign((s) => s.campaign.scenes[page]);
  const { selectedId, select, undo, redo, past, future } = useEditor();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bgInput = useRef<HTMLInputElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const comps = systemComponents(scene);
  const numberIds = page === 'spin' ? ['reels'] : [];
  const componentIds = Object.keys(comps).filter((id) => !numberIds.includes(id));
  const bg = scene.background;
  const hasSelection = Boolean(selectedId && (scene.elements.some((e) => e.id === selectedId) || comps[selectedId]));

  // Show the properties of whatever was just picked on the canvas, without hunting for them.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [selectedId, page]);

  const setBg = (recipe: (b: typeof bg) => void, key: string) => updateScene(page, (s) => recipe(s.background), `bg:${key}`);

  return (
    <aside className="editor-panel" data-noexport>
      <header className="editor-head">
        <strong>{t(page === 'spin' ? 'editorTitleSpin' : 'editorTitleResults')}</strong>
        <div className="row-gap">
          <button className="icon-btn" disabled={!past.length} onClick={undo} title={`${t('undo')} (Ctrl+Z)`}>
            <Icon name="undo" />
          </button>
          <button className="icon-btn" disabled={!future.length} onClick={redo} title={`${t('redo')} (Ctrl+Y)`}>
            <Icon name="redo" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="editor-scroll">
        <section className="editor-section">
          <h4>{t('addElement')}</h4>
          <div className="row-gap">
            <button className="btn btn-sm" onClick={() => addText(page, t('text'))}>
              <Icon name="type" size={14} />
              {t('addText')}
            </button>
            <button className="btn btn-sm" onClick={() => imgInput.current?.click()}>
              <Icon name="image" size={14} />
              {t('addImage')}
            </button>
            <button className="btn btn-sm" onClick={() => addShape(page)}>
              <Icon name="shape" size={14} />
              {t('addShape')}
            </button>
          </div>
          <input
            ref={imgInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void addImage(page, f);
              e.target.value = '';
            }}
          />
        </section>

        <section className="editor-section">
          <div className="section-title">
            <h4>{hasSelection ? t('properties') : t('background')}</h4>
            {hasSelection && (
              <button className="btn btn-sm btn-link" onClick={() => select(null)}>
                <Icon name="x" size={13} />
                {t('deselect')}
              </button>
            )}
          </div>
          {hasSelection && selectedId ? (
            <Inspector page={page} id={selectedId} onReplaceImage={() => replaceInput.current?.click()} />
          ) : (
            <div className="prop-grid">
              <Field label={t('bgColor')}>
                <ColorInput value={bg.color} onChange={(v) => setBg((b) => void (b.color = v), 'color')} />
              </Field>
              <Field label={t('bgColor2')}>
                <OptionalColorInput value={bg.color2} fallback="#000000" onChange={(v) => setBg((b) => void (b.color2 = v), 'color2')} />
              </Field>
              <Field label={t('decor')}>
                <Select
                  value={bg.decor}
                  options={DECOR_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                  onChange={(v) => setBg((b) => void (b.decor = v), 'decor')}
                />
              </Field>
              <Field label={t('decorColor')}>
                <ColorInput value={bg.decorColor} onChange={(v) => setBg((b) => void (b.decorColor = v), 'decorColor')} />
              </Field>
              <Field label={t('bgImage')} wide>
                <div className="row-gap">
                  <button className="btn btn-sm" onClick={() => bgInput.current?.click()}>
                    <Icon name="upload" size={14} />
                    {bg.imageId ? t('replaceImage') : t('uploadImage')}
                  </button>
                  {bg.imageId && (
                    <button className="btn btn-sm" onClick={() => setBg((b) => void (b.imageId = null), 'image')}>
                      <Icon name="x" size={14} />
                      {t('removeImage')}
                    </button>
                  )}
                </div>
              </Field>
              {bg.imageId && (
                <Field label={t('bgFit')}>
                  <Select
                    value={bg.fit}
                    options={FIT_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                    onChange={(v) => setBg((b) => void (b.fit = v), 'fit')}
                  />
                </Field>
              )}
              <div className="field field-wide">
                <Toggle label={t('bgFrame')} checked={bg.frame} onChange={(v) => setBg((b) => void (b.frame = v), 'frame')} />
              </div>
            </div>
          )}
          <input
            ref={replaceInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && selectedId) void replaceImage(page, selectedId, f);
              e.target.value = '';
            }}
          />
          <input
            ref={bgInput}
            type="file"
            accept="image/*"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              const id = await importImage(f);
              if (id) setBg((b) => void (b.imageId = id), 'image');
            }}
          />
        </section>

        <section className="editor-section">
          <h4>{t('layers')}</h4>
          <div className="layer-group-title">{t('layerUser')}</div>
          {[...scene.elements].reverse().map((el, ri) => (
            <LayerRow
              key={el.id}
              label={el.type === 'text' ? el.props.text || el.name : el.name}
              icon={el.type === 'text' ? 'type' : el.type === 'image' ? 'image' : 'shape'}
              selected={el.id === selectedId}
              hidden={el.hidden}
              locked={el.locked}
              onSelect={() => select(el.id)}
              onToggleHidden={() => patchItem(page, el.id, (it) => void ((it as SceneElement).hidden = !el.hidden), 'hidden')}
              onToggleLocked={() => patchItem(page, el.id, (it) => void ((it as SceneElement).locked = !el.locked), 'locked')}
              onUp={ri > 0 ? () => moveElement(page, el.id, 1) : undefined}
              onDown={ri < scene.elements.length - 1 ? () => moveElement(page, el.id, -1) : undefined}
            />
          ))}
          {numberIds.length > 0 && <div className="layer-group-title">{t('layerNumbers')}</div>}
          {numberIds.map((id) => (
            <LayerRow
              key={id}
              label={t(COMPONENT_LABELS[id])}
              icon="sparkle"
              selected={id === selectedId}
              hidden={comps[id].hidden}
              onSelect={() => select(id)}
              onToggleHidden={() => patchItem(page, id, (it) => void (it.hidden = !comps[id].hidden), 'hidden')}
            />
          ))}
          <div className="layer-group-title">{t('layerComponents')}</div>
          {componentIds.map((id) => (
            <LayerRow
              key={id}
              label={t(COMPONENT_LABELS[id] ?? 'properties')}
              icon="layers"
              selected={id === selectedId}
              hidden={comps[id].hidden}
              onSelect={() => select(id)}
              onToggleHidden={() => patchItem(page, id, (it) => void (it.hidden = !comps[id].hidden), 'hidden')}
            />
          ))}
          <div className="layer-group-title">{t('layerBackground')}</div>
          <LayerRow label={t('background')} icon="image" selected={!hasSelection} onSelect={() => select(null)} />
        </section>

        <p className="small editor-hint">{t('editorKeysHint')}</p>
      </div>
    </aside>
  );
}

function LayerRow({
  label,
  icon,
  selected,
  hidden = false,
  locked,
  onSelect,
  onToggleHidden,
  onToggleLocked,
  onUp,
  onDown,
}: {
  label: string;
  icon: IconName;
  selected: boolean;
  hidden?: boolean;
  locked?: boolean;
  onSelect: () => void;
  onToggleHidden?: () => void;
  onToggleLocked?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const t = useT();
  return (
    <div className={selected ? 'layer-row selected' : 'layer-row'} onClick={onSelect}>
      <span className="layer-icon">
        <Icon name={icon} size={14} />
      </span>
      <span className={hidden ? 'layer-name dim' : 'layer-name'}>{label}</span>
      <span className="layer-actions" onClick={(e) => e.stopPropagation()}>
        {onToggleLocked && (
          <button className={locked ? 'icon-btn on' : 'icon-btn'} title={t('locked')} onClick={onToggleLocked}>
            <Icon name={locked ? 'lock' : 'lockOpen'} size={14} />
          </button>
        )}
        {onToggleHidden && (
          <button className={hidden ? 'icon-btn on' : 'icon-btn'} title={t('hidden')} onClick={onToggleHidden}>
            <Icon name={hidden ? 'eyeOff' : 'eye'} size={14} />
          </button>
        )}
        {(onUp || onDown) && (
          <>
            <button className="icon-btn" title={t('bringForward')} disabled={!onUp} onClick={onUp}>
              <Icon name="chevronUp" size={14} />
            </button>
            <button className="icon-btn" title={t('sendBackward')} disabled={!onDown} onClick={onDown}>
              <Icon name="chevronDown" size={14} />
            </button>
          </>
        )}
      </span>
    </div>
  );
}

function Inspector({ page, id, onReplaceImage }: { page: PageId; id: string; onReplaceImage: () => void }) {
  const t = useT();
  const scene = useCampaign((s) => s.campaign.scenes[page]);
  const user = scene.elements.find((e) => e.id === id);
  const comp = user ? undefined : systemComponents(scene)[id];
  const target = user ?? comp;
  if (!target) return <p className="muted">{t('noSelection')}</p>;

  const f = target.frame;
  const setFrame = (key: keyof Frame, v: number) =>
    patchItem(page, id, (it) => void (it.frame = { ...it.frame, [key]: v }), `frame:${key}`);

  return (
    <div className="inspector">
      <div className="prop-grid frame-grid">
        {(['x', 'y', 'w', 'h', 'rotation'] as const).map((k) => (
          <Field key={k} label={t(k === 'x' ? 'posX' : k === 'y' ? 'posY' : k === 'w' ? 'width' : k === 'h' ? 'height' : 'rotation')}>
            <NumberInput value={f[k]} min={k === 'w' || k === 'h' ? 10 : undefined} onChange={(v) => setFrame(k, v)} />
          </Field>
        ))}
      </div>

      {user && (
        <>
          <div className="prop-grid">
            <Field label={t('opacity')}>
              <NumberInput
                value={Math.round(user.opacity * 100)}
                min={0}
                max={100}
                onChange={(v) => patchItem(page, id, (it) => void ((it as SceneElement).opacity = v / 100), 'opacity')}
              />
            </Field>
          </div>
          <PropFields
            fields={user.type === 'text' ? TEXT_FIELDS : user.type === 'shape' ? SHAPE_FIELDS : IMAGE_FIELDS}
            values={user.props as unknown as Record<string, unknown>}
            onChange={(key, v) =>
              patchItem(
                page,
                id,
                (it) => {
                  ((it as SceneElement).props as unknown as Record<string, unknown>)[key] = v;
                },
                key,
              )
            }
          />
          <div className="row-gap inspector-actions">
            {user.type === 'image' && (
              <button className="btn btn-sm" onClick={onReplaceImage}>
                <Icon name="image" size={14} />
                {t('replaceImage')}
              </button>
            )}
            <button className="btn btn-sm" onClick={() => duplicateElement(page, id)}>
              <Icon name="copy" size={14} />
              {t('duplicate')}
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => removeElement(page, id)}>
              <Icon name="trash" size={14} />
              {t('delete')}
            </button>
          </div>
        </>
      )}

      {comp && COMPONENT_FIELDS[id] && (
        <PropFields
          fields={COMPONENT_FIELDS[id]}
          values={(comp as SystemComponent<Record<string, unknown>>).style}
          onChange={(key, v) =>
            patchItem(page, id, (it) => void ((it as SystemComponent<Record<string, unknown>>).style[key] = v), key)
          }
        />
      )}
    </div>
  );
}
