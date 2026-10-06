import { ASSET_ID_RE } from '../../../src/shared/sharedDesign';
import { json, toBytes, type Env, type ReadyEnv } from '../../../server/lib';

/** D1 rows are limited to 2 MB; the app compresses images to well under this before uploading. */
const MAX_ASSET_BYTES = 1_900_000;
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml']);

function idOf(params: Record<string, string | string[]>): string | null {
  const id = params.id;
  return typeof id === 'string' && ASSET_ID_RE.test(id) ? id : null;
}

/** An image used by the shared design. */
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = idOf(params);
  if (!id) return json({ error: 'bad_id' }, 400);
  const row = await (env as ReadyEnv).DB.prepare('SELECT mime, data FROM assets WHERE id = ?1').bind(id).first<{ mime: string; data: unknown }>();
  const bytes = row ? toBytes(row.data) : null;
  if (!row || !bytes) return json({ error: 'not_found' }, 404);
  return new Response(bytes, {
    headers: {
      'Content-Type': row.mime,
      // Ids are never reused, so the content of an id never changes.
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      // Images only: an uploaded SVG opened directly cannot run scripts.
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
};

/** Upload an image (raw bytes; Content-Type must be an image type). */
export const onRequestPut: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = idOf(params);
  if (!id) return json({ error: 'bad_id' }, 400);
  const mime = (request.headers.get('Content-Type') ?? '').split(';')[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(mime)) return json({ error: 'unsupported_type' }, 415);
  const data = await request.arrayBuffer();
  if (!data.byteLength) return json({ error: 'empty' }, 400);
  if (data.byteLength > MAX_ASSET_BYTES) return json({ error: 'too_large' }, 413);
  await (env as ReadyEnv).DB.prepare(
    'INSERT INTO assets (id, mime, data, size, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(id) DO NOTHING',
  )
    .bind(id, mime, data, data.byteLength, Date.now())
    .run();
  return json({ ok: true }, 201);
};
