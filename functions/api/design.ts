import { designAssetIds, sanitizeSharedDesign } from '../../src/shared/sharedDesign';
import { json, type Env, type ReadyEnv } from '../../server/lib';

/** A design is a few dozen KB; this cap leaves plenty of room. */
const MAX_DESIGN_BYTES = 1_000_000;
/** Images no longer used by the design are deleted after a day (keeps undo working in the meantime). */
const ASSET_GRACE_MS = 24 * 60 * 60 * 1000;

interface DesignRow {
  version: number;
  config: string;
  updated_at: number;
}

async function current(env: ReadyEnv): Promise<DesignRow | null> {
  return env.DB.prepare('SELECT version, config, updated_at FROM design WHERE id = 1').first<DesignRow>();
}

function designResponse(row: DesignRow, status = 200): Response {
  // `config` is already JSON; embed it without re-parsing.
  return new Response(`{"version":${row.version},"updatedAt":${row.updated_at},"design":${row.config}}`, {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ETag: `"v${row.version}"` },
  });
}

/** Latest shared design. Supports If-None-Match so polling costs almost nothing when nothing changed. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const row = await current(env as ReadyEnv);
  if (!row) return json({ version: 0, updatedAt: null, design: null });
  if (request.headers.get('If-None-Match') === `"v${row.version}"`) {
    return new Response(null, { status: 304, headers: { ETag: `"v${row.version}"`, 'Cache-Control': 'no-store' } });
  }
  return designResponse(row);
};

/**
 * Saves a new version. The body is `{ baseVersion, design }`; the save only succeeds when `baseVersion` is still
 * the latest version, otherwise 409 is returned with the newer design so the client can resolve the conflict.
 */
export const onRequestPut: PagesFunction<Env> = async ({ request, env: rawEnv }) => {
  const env = rawEnv as ReadyEnv;
  const text = await request.text();
  if (text.length > MAX_DESIGN_BYTES) return json({ error: 'too_large' }, 413);

  let body: { baseVersion?: unknown; design?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'bad_json' }, 400);
  }
  const baseVersion = typeof body.baseVersion === 'number' && Number.isInteger(body.baseVersion) ? body.baseVersion : -1;
  // Whitelist: whatever else the request contains (e.g. customer data) is never stored.
  const design = sanitizeSharedDesign(body.design);
  if (!design || baseVersion < 0) return json({ error: 'invalid_design' }, 400);

  const config = JSON.stringify(design);
  const now = Date.now();
  const result =
    baseVersion === 0
      ? await env.DB.prepare('INSERT INTO design (id, version, config, updated_at) VALUES (1, 1, ?1, ?2) ON CONFLICT(id) DO NOTHING')
          .bind(config, now)
          .run()
      : await env.DB.prepare('UPDATE design SET version = version + 1, config = ?1, updated_at = ?2 WHERE id = 1 AND version = ?3')
          .bind(config, now, baseVersion)
          .run();

  if (!result.meta.changes) {
    const latest = await current(env);
    return latest ? designResponse(latest, 409) : json({ error: 'conflict' }, 409);
  }

  // Report referenced images the server does not have yet, and drop old images nothing uses any more.
  const referenced = new Set(designAssetIds(design));
  const stored = (await env.DB.prepare('SELECT id, created_at FROM assets').all<{ id: string; created_at: number }>()).results;
  const storedIds = new Set(stored.map((a) => a.id));
  const missingAssets = [...referenced].filter((id) => !storedIds.has(id));
  // At most 40 per save: D1 allows 50 queries per request; anything left over is removed on a later save.
  const stale = stored.filter((a) => !referenced.has(a.id) && now - a.created_at > ASSET_GRACE_MS).slice(0, 40);
  if (stale.length) {
    await env.DB.batch(stale.map((a) => env.DB.prepare('DELETE FROM assets WHERE id = ?1').bind(a.id)));
  }

  return json({ version: baseVersion + 1, updatedAt: now, missingAssets });
};
