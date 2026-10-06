# Cloudflare setup

This puts the app online on **Cloudflare Pages** with a small backend (Pages Functions) and a **D1** database
that stores the shared design. Everything here fits in Cloudflare's **free plan** (Pages + D1 normally do not ask
for a payment method).

What ends up in Cloudflare: the shared design and prizes (see the table in README.md) and the images used in
the design. What never does: customer lists and winners — they stay in the browser of the drawing computer.

You will create **3 things** and set **2 settings**:

| # | What | Name to use |
|---|---|---|
| 1 | GitHub repository with this code | e.g. `fmv-luckydraw` (private is fine) |
| 2 | D1 database | `luckydraw` |
| 3 | Pages project connected to the repository | e.g. `fmv-luckydraw` → `https://fmv-luckydraw.pages.dev` |
| A | Binding from the project to the database | variable name **`DB`** (exactly) |
| B | Secret with the passcode | variable name **`APP_PASSCODE`** (exactly) |

> Cloudflare renames menu items from time to time. If a label below is slightly different on your screen,
> look for the closest match — the names `DB` and `APP_PASSCODE` are what matter.

---

## Step 1 — Put the code on GitHub

1. Create a repository on https://github.com/new (for example `fmv-luckydraw`). **Private** is recommended;
   Cloudflare can deploy private repositories.
2. In the project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Lucky Draw"
   git branch -M main
   git remote add origin https://github.com/<your-account>/fmv-luckydraw.git
   git push -u origin main
   ```

   `.gitignore` already keeps `node_modules`, `dist`, `.wrangler` and `.dev.vars` out of the repository.
   Never commit a real customer file.

## Step 2 — Create the D1 database

1. Sign in to https://dash.cloudflare.com.
2. In the left menu open **Storage & databases → D1 SQL database** (or search “D1” at the top).
3. Click **Create Database**.
4. Name: **`luckydraw`**. Location: leave automatic, or choose **Asia-Pacific** if offered.
5. Click **Create**.

You do not need to create tables or run any SQL: the app creates its two tables (`design`, `assets`) by
itself the first time it is used.

## Step 3 — Create the Pages project

1. In the left menu open **Workers & Pages**.
2. Click **Create application** → choose the **Pages** tab → **Connect to Git** (on some accounts the button is
   **Import an existing Git repository**, or there is a link “Looking to deploy Pages? Get started”).
   Make sure you are creating a **Pages** project, not a Worker.
3. Connect your GitHub account when asked, give Cloudflare access to the repository, select it, and click
   **Begin setup**.
4. Fill in the build settings:

   | Field | Value |
   |---|---|
   | Project name | `fmv-luckydraw` (becomes `https://fmv-luckydraw.pages.dev`) |
   | Production branch | `main` |
   | Framework preset | **None** |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory (advanced) | leave empty |
   | Environment variables (advanced) | add `NODE_VERSION` = `22` |

5. Click **Save and Deploy** and wait until the build finishes (2–4 minutes).

The site now opens, but shows **“Máy chủ chưa được thiết lập”** — that is expected until steps 4 and 5 are done.

## Step 4 — Connect the database (binding `DB`)

1. Open the Pages project (**Workers & Pages** → your project) → **Settings** → **Bindings**.
2. Click **Add** → **D1 database**.
3. **Variable name:** `DB` (capital letters, exactly).  **D1 database:** `luckydraw`.
4. Save.

If the page lets you choose between **Production** and **Preview**, set it for **Production** (and also for
Preview if you plan to use preview branches).

## Step 5 — Set the passcode (secret `APP_PASSCODE`)

1. In the same project: **Settings** → **Variables and Secrets** → **Add**.
2. **Type:** **Secret** (on some screens: tick **Encrypt**).
3. **Variable name:** `APP_PASSCODE`.  **Value:** the passcode your team will type to open the app.
   Use something long and hard to guess (at least 10–12 characters), not `fmv2026`.
4. Save (again for **Production**, and Preview if you use it).

The passcode is only ever checked on the server; it is not inside the website's code.

## Step 6 — Redeploy

Bindings and secrets only apply to **new** deployments:

1. Open the project's **Deployments** tab.
2. On the latest deployment click **⋯** → **Retry deployment** (or push any new commit to `main`).
3. Wait for it to finish.

## Step 7 — First use and check

1. Open `https://<your-project>.pages.dev` and enter the passcode.
2. The top bar should show **“Đã lưu lên đám mây”** (cloud). If it shows “Lưu trên máy này”, the Functions were
   not deployed — check that the repository contains the `functions` folder and redeploy.
3. The **first computer that signs in publishes its design** as the shared one. Every computer that signs in
   afterwards loads that shared design (replacing whatever design it had locally).
4. Test sharing: open the site on a second computer or phone, sign in, change something small in
   **Thiết lập → Giao diện**; within about 15 seconds the first computer shows it too.

---

## Day to day

- **Designing:** any team member can open the site, sign in, and edit in **Thiết lập → Giao diện**. Changes are
  saved automatically and appear on every computer within ~15 seconds. Deleting something deletes it for
  everyone.
- **The drawing computer:** sign in and open the event a while before it starts, import the customer file
  there (it stays on that computer), keep the tab open, and save a backup file (**Lưu file chương trình**)
  before the event and after each prize. Avoid editing the design while drawing; updates from others are
  never applied in the middle of a draw.
- **Internet drops during the event:** drawing keeps working (everything needed is in the browser). The badge
  shows “Mất kết nối” and saving resumes when the connection returns. If the page has to be reopened while
  the server is unreachable, the passcode last used on that computer unlocks it offline.
- **Two people editing at the same moment:** the second one is asked **Giữ bản của tôi** / **Dùng bản mới
  nhất**.
- **Change the passcode:** edit `APP_PASSCODE` in Settings → Variables and Secrets, then redeploy (Step 6).
  Everyone is signed out and must use the new passcode.
- **Updates to the app:** push to `main` on GitHub; Cloudflare rebuilds and deploys automatically. The shared
  design in D1 is kept.

## Optional

- **Own domain** (e.g. `quayso.yourcompany.vn`): project → **Custom domains** → **Set up a custom domain**.
- **Extra protection with company e-mail sign-in:** Cloudflare **Zero Trust → Access** can put an e-mail
  login in front of the whole site (free for up to 50 users). The passcode keeps working behind it.

## Free plan limits (more than enough here)

| Resource | Free allowance | This app |
|---|---|---|
| D1 reads | 5 million rows / day | one open browser checking every 15 s ≈ 2,400 / 10 hours |
| D1 writes | 100,000 rows / day | 1–2 per design save |
| D1 storage | 500 MB per database, 5 GB per account | a design is ~50 KB; each image ≤ 1.5 MB |
| Pages builds | 500 / month | one per push to GitHub |

Unused images are deleted automatically one day after they stop being used in the design.

## Troubleshooting

| You see | Cause and fix |
|---|---|
| “Máy chủ chưa được thiết lập…” on the passcode screen | The `DB` binding or the `APP_PASSCODE` secret is missing, misspelled, or was added after the last deployment. Check Steps 4–5, then Step 6. |
| Top bar says “Lưu trên máy này” on the Cloudflare site | The Functions are not running: the `functions` folder is missing from the repository, or the project was created as a Worker instead of Pages. |
| “Sai mã truy cập” with the right passcode | The secret value differs (spaces, capital letters) or the redeploy did not happen after changing it. |
| Build fails | Open the failed deployment's log. Check Build command `npm run build`, output `dist`, `NODE_VERSION` = `22`. |
| “Hết phiên · đăng nhập” in the top bar | The 7-day session ended or the passcode changed: click it and sign in again. |
| An image does not appear on another computer | It is still uploading from the computer that added it; it appears within ~15 seconds once that computer is online. |

## Testing the cloud version on your own computer (optional)

```bash
cp .dev.vars.example .dev.vars
npm run preview:cloud
```

Edit `.dev.vars` to set a test passcode, then open http://127.0.0.1:8788. This runs the real Cloudflare
runtime with a local test database in `.wrangler/` (not uploaded anywhere).
