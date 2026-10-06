import { clearSessionCookie, isAuthed, isConfigured, json, makeSessionCookie, passcodeMatches, sameOrigin, type Env } from '../../server/lib';

/** Tells the app that a cloud backend exists, whether it is set up, and whether this browser is signed in. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const configured = isConfigured(env);
  return json({ cloud: true, configured, authed: configured ? await isAuthed(request, env) : false });
};

/** Sign in with the passcode (the APP_PASSCODE secret set in Cloudflare). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!isConfigured(env)) return json({ error: 'not_configured' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  let passcode = '';
  try {
    const body = (await request.json()) as { passcode?: unknown };
    passcode = typeof body.passcode === 'string' ? body.passcode.slice(0, 200) : '';
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!(await passcodeMatches(env, passcode))) {
    // Slow down guessing.
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: 'wrong_passcode' }, 401);
  }
  return json({ authed: true }, 200, { 'Set-Cookie': await makeSessionCookie(env) });
};

/** Sign out. */
export const onRequestDelete: PagesFunction<Env> = async () => json({ authed: false }, 200, { 'Set-Cookie': clearSessionCookie() });
