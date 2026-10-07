# Lucky Draw

Lucky draw for promotion campaigns. Import customers from Excel/CSV, configure prizes, spin slot-reel style
for a 13-character code, and export the winners board as PNG/PDF.

Hosted on **Cloudflare Workers**, the **design is shared**: press **Lưu** (Save) and everyone who opens the site
sees the same design. **Customer lists and winners never leave the drawing computer.**

| Stored in the cloud (shared when you press Save) | Stays in this browser only |
|---|---|
| Campaign name, screen size, code length, phone display, confetti / confirmation options | Customer list (names, phones, codes) |
| Theme, spin-screen and results-board layouts, text, shapes, uploaded images | Winners |
| Prizes (name, reward, number of winners, spin/pause seconds) | Imported file name and its header row |

The whitelist lives in `src/shared/sharedDesign.ts` and is enforced twice: by the app before uploading and
by the server before storing.

## Deploy to Cloudflare

Step-by-step guide: **[CLOUDFLARE_SETUP.md](CLOUDFLARE_SETUP.md)** (GitHub → Cloudflare Worker from the repository →
`APP_PASSCODE` secret). `wrangler.jsonc` holds the rest (build, D1 database `DB`). Everything fits in the free plan.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Without Cloudflare the app runs in **local mode** (top bar: “Lưu trên máy này”):
everything stays in this browser and the passcode is the local one, **fmv2026** by default.

To try the cloud version on your computer (real Cloudflare runtime with a local database):

```bash
cp .dev.vars.example .dev.vars
npm run preview:cloud
```

Set your test passcode in `.dev.vars`, then open http://127.0.0.1:8788.

## Passcode

- **On Cloudflare:** the passcode is the `APP_PASSCODE` secret, checked by the server. Change it in the
  Cloudflare dashboard; everyone is signed out. Sessions last 7 days per browser.
- **Local mode only:** a cosmetic gate. Generate a new hash with `npm run passcode -- my-new-code` and paste it
  into `src/config.ts` (set it to `''` to disable).

## How it works

| Page | What it does |
|---|---|
| **Setup** (`/#/setup`) | Tabs: **Chương trình** (name, screen size, code length, phone display, backup & restore), **Giải thưởng** (prizes, spin/pause seconds), **Khách hàng** (import Excel/CSV, download remaining list / winners), **Giao diện** (themes + layout designer). |
| **Spin** (`/#/spin`) | Presentation only. Press **Spin** (or Space); all remaining slots of the prize draw automatically one after another. |
| **Results** (`/#/results`) | Presentation only. Winners board grouped by prize, auto-fitted to the box; export PNG/PDF. |

**Live screen controls:** a round button in the bottom-right corner opens a small menu (status, results/back,
**Thoát** to leave, language, fullscreen). The button, the menu and the mouse cursor hide after 2.5 s without
mouse movement. Choose the prize by clicking the prize bar on the stage (or ←/→). Keys: **Space/Enter** spin,
**P** pause/resume (or click the stage spin button while drawing), **F** fullscreen, **Esc** closes menus.

### Design (Setup → Giao diện)

All design work happens here; the live spin and results screens have no editing tools.

- **Mẫu giao diện** — 8 bright templates with live previews: Đỏ May Mắn (default), Xanh Đại Dương, Vàng Tết,
  Xanh Tươi, Cam Năng Động, Hồng Ngọt Ngào, Tím Oải Hương, Trắng Tinh Gọn. One click restyles both screens;
  positions, your images and labels are kept, and Ctrl+Z undoes it. **Đặt lại bố cục** restores the default
  composition.
- **Designer** — switch between *Màn hình quay số* and *Bảng kết quả*, drag/resize/rotate anything, add your
  own text/images/shapes, and fine-tune every style in the panel on the right. Before any draw the results
  board is previewed with sample winners (never saved).
- Uploaded images are scaled to at most 2560 px and compressed under 1.5 MB.
- Shortcuts: drag to move, handles to resize/rotate, Shift = keep ratio / snap angle, arrows nudge
  (Shift = 10 px), Ctrl+Z / Ctrl+Y, Ctrl+D duplicate, Del delete. Text shrinks to fit its box.

### Sharing the design (cloud)

- Edits (design, prizes, campaign settings) are a draft on your computer: the top bar shows **Chưa lưu** with
  **Lưu** and **Bỏ thay đổi**. Press **Lưu** (or Ctrl+S) to share them; the top bar then shows “Đã lưu lên đám mây”.
  Closing the tab with unsaved changes asks first.
- Other open computers pick up a save within ~15 seconds (and immediately when their tab is focused); a computer
  opened later loads it. A running draw is never changed; the update is applied after it.
- While you have unsaved changes, someone else's newer save is not loaded over them (top bar: **Có bản mới hơn**).
  Pressing **Lưu** then asks: **Giữ bản của tôi** (replaces theirs) or **Dùng bản của họ**. Closing the question
  keeps the other person's work.
- No connection? Editing and drawing keep working; the badge shows “Mất kết nối” and **Lưu** works again once
  the connection is back. If the server is unreachable when the page opens, the passcode last used on that computer
  unlocks it offline.
- A prize that already has winners on a computer is never removed there, even if someone deletes it elsewhere.

### Draw rules

- A winner is written to storage **before** the reels animate, so refreshing mid-draw never changes or loses a result. There is no redraw.
- One customer (identified by phone number) can win only one prize; on winning, all of their codes leave the pool.
- Duplicate codes in the import are dropped (first one kept). Codes that are not exactly the configured length are rejected and listed in the import report.
- Each row (code) is one entry, so a customer with more codes has more chances.
- Random selection uses `crypto.getRandomValues` with rejection sampling (no modulo bias).

### Customer file format

Excel (`.xlsx`, `.xls`) or CSV, one entry per row, always in this column order:

| A | B | C |
|---|---|---|
| Code — exactly 13 digits | Name | Phone |

- A header row is optional; it is recognised automatically (its column A has no digits) and kept for exports.
- Before anything is replaced, **Kiểm tra file** shows a preview and the counts: valid entries, repeated codes
  (skipped, first one kept), invalid codes (not exactly 13 digits, listed with their Excel row numbers) and
  customers who already won (skipped).
- Excel cells stored as numbers are repaired: phones get their leading `0` back, codes get their leading zeros back.
- **Danh sách còn lại** (`.xlsx` / `.csv`) is the same file without every customer who has won — all of their
  rows, since a customer is identified by phone — in the same A/B/C layout with the same header row, so it can be
  imported again. Codes and phones are written as text so Excel keeps all digits and the leading `0`.
- **Danh sách trúng thưởng** lists winners in the same A/B/C order, followed by prize, reward, number and time.
- `public/sample-customers.xlsx` (fake data, downloadable from the app) shows the layout.

### Data safety

Customer data and winners live only in the drawing computer's browser, at this exact address. Clearing site
data, private windows, another browser or another computer all start without them. Use **Lưu file chương
trình** before the event and after each prize (the app reminds you); **Mở file chương trình** restores
everything, including images. On Cloudflare, **Xoá dữ liệu khách hàng** clears only this computer's customer
data and leaves the shared design alone.

## Project structure

```
functions/api/ ............. API handlers: session (sign-in), design, assets/[id]
worker/index.ts ............ Cloudflare Workers entry, routes /api/* to functions/ (config: wrangler.jsonc)
server/lib.ts .............. auth (signed cookie), D1 schema, helpers
src/
  app shell, routes ........ App.tsx, main.tsx, config.ts, styles.css
  shared/ .................. db (Dexie), store (Zustand), cloud (sync), sharedDesign (cloud whitelist),
                             images, i18n (vi/en), defaults, themes, rng, fonts, ui/, stage/
  features/
    setup/ ................. setup page, import dialog
    import/ ................ file parsing, validation/dedupe, xlsx/csv exports
    draw/ .................. drawEngine (atomic pick + commit)
    spin/ .................. spin page, slot reels, prize bar, prize picker
    results/ ............... results board (auto-fit), PNG/PDF export
    design/ ................ Setup → Giao diện: theme strip + layout designer
    editor/ ................ editor panel, scene operations, undo/redo, shortcuts
    stage/ ................. shared stage contents (live screens, designer, previews) + sample data
    theme/ ................. theme previews and apply/reset helpers
    backup/ ................ campaign file save/restore
    gate/ .................. passcode screen (cloud sign-in / local gate)
```
