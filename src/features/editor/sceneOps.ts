import { defaultTextProps, frame } from '../../shared/defaults';
import { uid } from '../../shared/rng';
import { t } from '../../shared/i18n';
import { useCampaign } from '../../shared/store';
import { toast } from '../../shared/ui/feedback';
import { DEFAULT_THEME, findTheme } from '../../shared/themes';
import type { Frame, PageId, ResultsScene, SceneElement, SpinScene, SystemComponent } from '../../types';
import { useEditor } from './editorStore';

type AnyScene = SpinScene | ResultsScene;

export function isUserElement(id: string): boolean {
  return id.startsWith('e_');
}

export function updateScene(page: PageId, recipe: (scene: AnyScene) => void, historyKey?: string): void {
  if (historyKey !== undefined) useEditor.getState().snapshot(historyKey);
  useCampaign.getState().update((c) => recipe(c.scenes[page]));
}

export function systemComponents(scene: AnyScene): Record<string, SystemComponent<unknown>> {
  return scene.components as unknown as Record<string, SystemComponent<unknown>>;
}

export function setItemFrame(page: PageId, id: string, f: Frame): void {
  updateScene(page, (scene) => {
    const el = scene.elements.find((e) => e.id === id);
    if (el) el.frame = f;
    else {
      const comp = systemComponents(scene)[id];
      if (comp) comp.frame = f;
    }
  });
}

/** Patch any item: a user element (fields like opacity/hidden/props) or a system component. */
export function patchItem(page: PageId, id: string, recipe: (item: SceneElement | SystemComponent<unknown>) => void, key: string) {
  updateScene(
    page,
    (scene) => {
      const target = scene.elements.find((e) => e.id === id) ?? systemComponents(scene)[id];
      if (target) recipe(target);
    },
    `${id}:${key}`,
  );
}

function centerFrame(w: number, h: number): Frame {
  const { stage } = useCampaign.getState().campaign;
  return frame(Math.round((stage.w - w) / 2), Math.round((stage.h - h) / 2), w, h);
}

function addElement(page: PageId, el: SceneElement) {
  updateScene(page, (scene) => void scene.elements.push(el), `add:${el.id}`);
  useEditor.getState().select(el.id);
}

export function addText(page: PageId, text: string): void {
  // New text picks up the active theme's lettering so it matches the stage straight away.
  const th = findTheme(useCampaign.getState().campaign.themeId) ?? DEFAULT_THEME;
  addElement(page, {
    id: uid('e_'),
    name: text,
    type: 'text',
    frame: centerFrame(800, 140),
    opacity: 1,
    hidden: false,
    locked: false,
    props: defaultTextProps({ text, font: th.title.font, color: th.title.color, color2: th.title.color2, shadow: th.title.shadow }),
  });
}

export function addShape(page: PageId): void {
  addElement(page, {
    id: uid('e_'),
    name: 'Shape',
    type: 'shape',
    frame: centerFrame(400, 240),
    opacity: 1,
    hidden: false,
    locked: false,
    props: { shape: 'rect', fill: '#ffffff', borderColor: '#1b1b1b', borderWidth: 0, radius: 24 },
  });
}

function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 400, h: 400 });
    img.src = url;
  });
}

/** Adds an uploaded image to the asset store; shows a message and returns null when it cannot be used. */
export async function importImage(file: File): Promise<string | null> {
  try {
    return await useCampaign.getState().addAsset(file, file.name);
  } catch {
    toast(t('imageTooLarge'), 'error');
    return null;
  }
}

export async function addImage(page: PageId, file: File): Promise<void> {
  const store = useCampaign.getState();
  const assetId = await importImage(file);
  if (!assetId) return;
  const { w, h } = await imageSize(useCampaign.getState().assetUrls[assetId]);
  const { stage } = store.campaign;
  const k = Math.min(1, (stage.w * 0.5) / w, (stage.h * 0.5) / h);
  addElement(page, {
    id: uid('e_'),
    name: file.name.replace(/\.[^.]+$/, '').slice(0, 24),
    type: 'image',
    frame: centerFrame(Math.round(w * k), Math.round(h * k)),
    opacity: 1,
    hidden: false,
    locked: false,
    props: { assetId, fit: 'contain', radius: 0 },
  });
}

export async function replaceImage(page: PageId, id: string, file: File): Promise<void> {
  const assetId = await importImage(file);
  if (!assetId) return;
  patchItem(page, id, (it) => {
    const el = it as SceneElement;
    if (el.type === 'image') el.props.assetId = assetId;
  }, 'image');
}

export function removeElement(page: PageId, id: string): void {
  if (!isUserElement(id)) return;
  updateScene(page, (scene) => {
    scene.elements = scene.elements.filter((e) => e.id !== id);
  }, `remove:${id}`);
  useEditor.getState().select(null);
}

export function duplicateElement(page: PageId, id: string): void {
  const scene = useCampaign.getState().campaign.scenes[page];
  const el = scene.elements.find((e) => e.id === id);
  if (!el) return;
  const copy = structuredClone(el) as SceneElement;
  copy.id = uid('e_');
  copy.frame = { ...copy.frame, x: copy.frame.x + 30, y: copy.frame.y + 30 };
  addElement(page, copy);
}

/** dir = +1 moves the element up (towards the viewer). */
export function moveElement(page: PageId, id: string, dir: 1 | -1): void {
  updateScene(page, (scene) => {
    const i = scene.elements.findIndex((e) => e.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= scene.elements.length) return;
    [scene.elements[i], scene.elements[j]] = [scene.elements[j], scene.elements[i]];
  }, `order:${id}:${Date.now()}`);
}

export function nudge(page: PageId, id: string, dx: number, dy: number): void {
  const scene = useCampaign.getState().campaign.scenes[page];
  const target = scene.elements.find((e) => e.id === id) ?? systemComponents(scene)[id];
  if (!target || ('locked' in target && target.locked)) return;
  useEditor.getState().snapshot(`nudge:${id}`);
  setItemFrame(page, id, { ...target.frame, x: target.frame.x + dx, y: target.frame.y + dy });
}
