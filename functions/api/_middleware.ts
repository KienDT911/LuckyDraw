import { ensureSchema, isAuthed, isConfigured, json, sameOrigin, type Env } from '../../server/lib';

/** Every /api route except /api/session (which handles sign-in) requires a valid session. */
export const onRequest: PagesFunction<Env> = async (ctx) => {
  try {
    const { pathname } = new URL(ctx.request.url);
    if (pathname === '/api/session') return await ctx.next();

    const env = ctx.env;
    if (!isConfigured(env)) return json({ error: 'not_configured' }, 503);
    if (!sameOrigin(ctx.request)) return json({ error: 'forbidden' }, 403);
    if (!(await isAuthed(ctx.request, env))) return json({ error: 'unauthorized' }, 401);
    await ensureSchema(env.DB);
    return await ctx.next();
  } catch (err) {
    return json({ error: 'server_error', detail: err instanceof Error ? err.message : String(err) }, 500);
  }
};
