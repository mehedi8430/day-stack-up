# DayStackUp promo video

`daystackup-promo.mp4` — 47s, 1920×1080 (16:9), 30fps, silent, H.264/yuv420p with faststart for web playback.

It is built from `index.html`: seven scenes (hook → brand reveal → monthly calendar → daily planner → milestones → analytics → close) animated on a deterministic timeline via a single `render(t)` function, matching the app's design system (Geist Sans, zinc neutrals, category colors, black completion cells). The screens are stylized recreations, not live captures.

## Re-render after editing

1. Edit scenes/copy in `index.html` (scene timings are at the top of the script: `T1`…`T7`, `DUR`).
2. Capture frames (needs `playwright-core` and a Playwright Chromium in `~/.cache/ms-playwright`; adjust `EXEC`/`URL` constants inside `capture.mjs` if your setup differs):

   ```bash
   npm i playwright-core          # anywhere convenient
   node capture.mjs full          # writes frames/f%05d.png
   ```

3. Encode (full static ffmpeg works; ffmpeg-static via npm is easiest):

   ```bash
   ffmpeg -framerate 30 -i frames/f%05d.png \
     -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
     -movflags +faststart daystackup-promo.mp4
   ```

Tip: run `node capture.mjs preview` first — it renders ~25 sample frames at key moments for a quick look without the full 1,410-frame run.

## Where to change things

| Content | Where in `index.html` |
| --- | --- |
| Hook/CTA copy | `s1` / `s7` scene markup |
| Brand name, tagline | `s2` / `s7` markup (title uses the header tagline) |
| Habits, month, patterns | `HABITS`, `PAT` arrays (patterns drive the live "tasks done" counter) |
| Planner week dates, tasks | `WEEK`, task list inside `buildS4` |
| Milestones | `MILES` array |
| Analytics numbers | `BARSV`, stat tiles in `buildS6` |
| Fonts | `@font-face` at the top (points at the `geist` npm package's woff2 files) |
