# Cloudflare setup

The app runs on **Cloudflare Workers** (e.g. `https://luckydraw.<your-account>.workers.dev`): the website plus a
small API, with a **D1** database that stores the shared design. Everything fits in Cloudflare's **free plan**.

What ends up in Cloudflare: the shared design and prizes (see the table in README.md) and the images used in
the design. What never does: customer lists and winners — they stay in the browser of the drawing computer.

Everything Cloudflare needs is in **`wrangler.jsonc`** in this repository (Worker name, build, database binding).
You only set **one secret** by hand: **`APP_PASSCODE`**.

> Cloudflare renames menu items from time to time. If a label below is slightly different on your screen,
> look for the closest match — the names `luckydraw`, `DB` and `APP_PASSCODE` are what matter.

---

## Step 1 — Put the code on GitHub

Push this project to a GitHub repository (private is fine). `.gitignore` already keeps `node_modules`, `dist`,
`.wrangler` and `.dev.vars` out of it. Never commit a real customer file.

## Step 2 — Create the Worker from the repository

(Skip if you already have the `luckydraw` Worker connected to GitHub.)

1. https://dash.cloudflare.com → **Workers & Pages** → **Create application** → **Import a repository**.
2. Select the repository. Settings:

   | Field | Value |
   |---|---|
   | Project / Worker name | **`luckydraw`** (must match `"name"` in `wrangler.jsonc`) |
   | Build command | `npm run build` (or leave empty — `wrangler.jsonc` builds anyway) |
   | Deploy command | `npx wrangler deploy` |
   | Root directory | leave empty |

3. **Create and deploy**.

If you name the Worker something else, change `"name"` in `wrangler.jsonc` to the same name.

## Step 3 — The database (automatic)

Nothing to click: on deploy, Wrangler connects the D1 database named **`luckydraw`** to the Worker as **`DB`**,
and creates it if it does not exist. The app creates its tables by itself on first use. You can see it under
**Storage & databases → D1**.

## Step 4 — Set the passcode (secret `APP_PASSCODE`)

1. **Workers & Pages** → `luckydraw` → **Settings** → **Variables and Secrets** → **Add**.
2. **Type:** **Secret**. **Variable name:** `APP_PASSCODE`. **Value:** the passcode your team will type
   (long and hard to guess, not `fmv2026`).
3. **Deploy** / save. Secrets apply immediately and are kept on every later deploy.

## Step 5 — Check

1. Open `https://luckydraw.<your-account>.workers.dev` and enter the passcode.
2. The top bar must show **“Đã lưu lên đám mây”**. If it shows **“Lưu trên máy này”**, the API is not running:
   the deploy did not use `wrangler.jsonc` (check the build log for `env.DB (luckydraw)`), or the deployment is
   older than the commit that added it.
3. Quick test from any browser: `https://luckydraw.<your-account>.workers.dev/api/session` must show
   `{"cloud":true,...}` — not the web page.
4. The **first computer that signs in publishes its design** as the shared one. Every computer that signs in
   afterwards loads that shared design.

---

## Day to day

- **Designing:** sign in, edit in **Thiết lập → Giao diện** (or prizes / campaign settings). The top bar shows
  **Chưa lưu** — only you see the changes so far. Press **Lưu** (or **Ctrl+S**): now everyone sees them. Other
  open computers update within ~15 seconds (immediately when their tab is focused); a computer opened later
  loads the saved design. **Bỏ thay đổi** throws your unsaved changes away.
- **Two people editing at the same time:** the one who saves second is told someone else saved first and
  chooses **Giữ bản của tôi** (replace theirs) or **Dùng bản của họ**. While you have unsaved changes, a newer
  save from someone else is never loaded over your work — the top bar shows **Có bản mới hơn** instead.
- **The drawing computer:** sign in and open the event a while before it starts, import the customer file
  there (it stays on that computer), keep the tab open, and save a backup file (**Lưu file chương trình**)
  before the event and after each prize. A design saved by someone else is never applied in the middle of a draw.
- **Internet drops during the event:** drawing keeps working. Saving the design needs the connection; your
  changes stay on the computer until **Lưu** succeeds. If the page has to be reopened while the server is
  unreachable, the passcode last used on that computer unlocks it offline.
- **Change the passcode:** edit `APP_PASSCODE` in Settings → Variables and Secrets. Everyone is signed out.
- **Updates to the app:** push to `main`; Cloudflare rebuilds and deploys. The shared design in D1 is kept.

## Free plan limits (more than enough here)

| Resource | Free allowance | This app |
|---|---|---|
| Worker requests | 100,000 / day | one open browser checking every 15 s ≈ 2,400 / 10 hours (the website files are free) |
| D1 reads / writes | 5 million / 100,000 rows per day | a few per check / per save |
| D1 storage | 500 MB per database | a design is ~50 KB; each image ≤ 1.5 MB |

Unused images are deleted automatically one day after they stop being used in the design.

## Troubleshooting

| You see | Cause and fix |
|---|---|
| “Lưu trên máy này” on the Cloudflare site, every computer has its own design | The API is not deployed (see Step 5). Push the latest code and check the deploy log. |
| “Máy chủ chưa được thiết lập…” on the passcode screen | The `APP_PASSCODE` secret is missing or misspelled (Step 4). |
| “Sai mã truy cập” with the right passcode | The secret value differs (spaces, capital letters). |
| Deploy fails with a name mismatch | The Worker's name in the dashboard and `"name"` in `wrangler.jsonc` differ. |
| “Hết phiên · đăng nhập” in the top bar | The 7-day session ended or the passcode changed: click it and sign in again. |
| An image does not appear on another computer | It is still uploading; it appears within ~15 seconds once the computer that added it is online. |

## Testing the cloud version on your own computer (optional)

```bash
cp .dev.vars.example .dev.vars
npm run preview:cloud
```

Edit `.dev.vars` to set a test passcode, then open http://127.0.0.1:8788. This runs the real Workers runtime
with a local test database in `.wrangler/` (not uploaded anywhere). Open http://localhost:8788 in the same
browser to act as a second computer.

The API code is in `functions/` (Cloudflare Pages Functions format, so a Pages project also works) and
`worker/index.ts` routes to it on Workers.
