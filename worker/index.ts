/**
 * Cloudflare Workers entry (used when the site is deployed as a Worker with `wrangler deploy`, see wrangler.jsonc).
 *
 * The API itself lives in /functions (Pages Functions format) so the same code also works on Cloudflare Pages.
 * This file only routes /api/* requests to those handlers; every other path is served from the built app by the
 * static assets (`run_worker_first` sends only /api/* here).
 */
import { onRequest as middleware } from '../functions/api/_middleware';
import * as assets from '../functions/api/assets/[id]';
import * as design from '../functions/api/design';
import * as session from '../functions/api/session';
import { json, type Env } from '../server/lib';

type Handler = PagesFunction<Env>;
type Module = Partial<Record<'onRequestGet' | 'onRequestPost' | 'onRequestPut' | 'onRequestDelete', Handler>>;

const routes: { pattern: RegExp; module: Module }[] = [
  { pattern: /^\/api\/session$/, module: session },
  { pattern: /^\/api\/design$/, module: design },
  { pattern: /^\/api\/assets\/(?<id>[^/]+)$/, module: assets },
];

function handlerFor(module: Module, method: string): Handler | undefined {
  const name = `onRequest${method.charAt(0)}${method.slice(1).toLowerCase()}` as keyof Module;
  return module[name];
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const route = routes.map((r) => ({ r, m: r.pattern.exec(pathname) })).find((x) => x.m);
    if (!route) return json({ error: 'not_found' }, 404);
    const handler = handlerFor(route.r.module, request.method);
    if (!handler) return json({ error: 'method_not_allowed' }, 405);

    // The same context shape Pages Functions receive.
    const base = {
      request,
      env,
      params: { ...route.m!.groups } as Record<string, string>,
      data: {},
      functionPath: pathname,
      waitUntil: (p: Promise<unknown>) => ctx.waitUntil(p),
      passThroughOnException: () => {},
    };
    const run = () => handler({ ...base, next: () => Promise.reject(new Error('no next')) } as unknown as EventContext<Env, string, Record<string, unknown>>);
    return middleware({ ...base, next: run } as unknown as EventContext<Env, string, Record<string, unknown>>);
  },
} satisfies ExportedHandler<Env>;
