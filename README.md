# irie – saving memories

A simple online photobooth for **crismiel and irish**. Take photos with your camera (or upload them), pick a layout, and download your strip. Everything runs in the browser. By default photos stay on your own device. If you turn on the optional shared gallery (see below), saved pictures go to that gallery.

**Flow:** Capture → Customize → Download

## What works now (Phase 1 + 2)

- Camera in the browser (asks for permission only when you open the Photobooth)
- Front / rear camera flip, camera picker, mirror toggle, fullscreen
- Countdown (none, 3, 5, 10 seconds) with a big animated number
- Multi-shot sessions with a delay between photos, flash effect and shutter sound (mute option)
- Review screen: retake one photo, retake all, or upload a photo in place
- Layouts: **Normal photo** (just one plain photo, no strip, landscape or portrait), Classic 4-cut, 3-cut, 2-cut, 6-cut, Horizontal strip, 2 × 2 / 2 × 3 / 3 × 3 grids, Polaroid, Double Polaroid, Film strip, Collage, Scrapbook, plus **your own frames** from the `frames/` folder
- Customize: background color or gradient, photo spacing, rounded corners, caption, date
- Download as PNG (Standard 1200 px or High 1800 px wide)
- Light and dark theme, pink + purple glass look

**Phase 5 – gallery management**
- **Rename** a creation: click its name in the gallery, type, press Enter.
- **Favorite** with the heart button.
- **Sort** by newest, oldest, favorites first or name A–Z.
- **Filter** by layout, by theme, or show favorites only. Your choices are remembered.
- Download again as PNG or JPEG, edit again, or delete one.
- **Delete all except favorites**, or delete everything.
- Shows how much space your saved creations use on your device. irie also asks the browser to keep them safe from automatic cleanup.

**Phase 4 – advanced photobooth**
- **8 new layouts:** 6-cut strip, horizontal strip, 2 × 2, 2 × 3 and 3 × 3 grids, Double Polaroid, Film strip (with sprocket holes), asymmetric Collage and a tilted Scrapbook.
- **Multi-camera and mirror effects** (live on the camera, in the new **Multi** group): Horizontal Mirror, Vertical Mirror, Four-Way Mirror, Symmetry, Quad Cam, Mirror Quad, Lomo Quad, Pop Booth, Spy Cam, Split Screen, Repeating.
- **3 new artistic effects:** Halftone, Pop Art, Watercolor. Total: 52 effects.
- **12 themes** in the editor's Design tab: Y2K, Korean Photobooth, Vintage Film, Retro Arcade, Pink Coquette, Dreamy Pastel, Dark Academia, Summer Memories, Christmas, Valentine's Day, Birthday, Classic Black & White. Each sets a layout (when you took enough photos), colors, caption, stickers and a filter preset. You can change everything afterwards.
- **Photos tab** for individual photo editing: pick a photo, give it its own filter, zoom and move it inside its frame, move it earlier or later in the strip, replace it, or reset it. All of this can be undone.

**Phase 3 – Webcam Toy (live effects)**
- See effects **live on the camera** before you take the picture. Switch effects instantly without restarting the camera.
- 38 effects in three categories, each with a live thumbnail:
  - **Color:** Black & White, Sepia, Vintage, Retro, Lomo, Warm Tone, Cool Tone, Faded, Pastel, Matte, High Contrast, Cinematic, Negative, Thermal, Night Vision, Neon, Underwater, Citrus, Bloom, Dreamy
  - **Distortion:** Fisheye, Bulge, Pinch, Ripple, Spiral, Twist, Stretch, Wave
  - **Artistic:** Cartoon, Comic Book, Sketch, Pixelate, Posterize, Glitch, Kaleidoscope, Mirror, Double Vision, Crosshatch
- None and Random buttons, previous / next arrows on the camera (they work in fullscreen too), and an effect strength slider.
- The photo you capture is saved as the **untouched original**. The effect is applied on top, so you can change or remove it later in the editor.
- The downloaded image uses the same shaders as the live preview, so they match.
- **Save to gallery** (stored on your device with IndexedDB): keeps the finished picture, the original photos and your edits. Open the **Gallery** page to edit again, download as PNG or JPEG, delete one, or delete everything.
- Download as **PNG or JPEG** from the editor.
- Recently saved creations show on the home page.

**Phase 2 – editing**
- **Filters:** the same effect gallery as the live camera (see Phase 3), with a strength slider
- **Adjustments:** brightness, contrast, saturation, exposure, temperature, tint, highlights, shadows, sharpness, vignette, grain (double-click a slider to reset it), plus a Reset button
- **Hold to compare:** press and hold the button to see the original photos
- **Stickers:** built-in emoji in 10 categories, plus your own PNGs from `stickers/`
- **Text:** 6 fonts (including handwritten), color, size, rotation, outline, shadow, and a date stamp
- Drag to move, drag the round handle to resize and rotate, duplicate, delete, bring forward / send back, lock in place
- **Undo / Redo** for every change (also Ctrl+Z and Ctrl+Y)
- Filters, warps, stickers and text are all included in the downloaded PNG

## Where your saved creations are

(This is the default, on-device storage. With the shared gallery turned on, pictures are stored in your Supabase project instead.)

The gallery uses your browser's built-in storage (IndexedDB), so everything stays on **your own computer or phone**. See it on the **Gallery** page of the website. It is not a normal file in your Pictures folder, so use **Download** (PNG or JPEG) for a copy you can keep. Saved creations belong to one browser on one device and one website address, so a different browser, another device, or `localhost` versus your GitHub Pages link will each show an empty gallery. Clearing your browser's site data deletes them.

## Passcode

irie asks for a 4-digit passcode before you can use it. There is no sign-in. Tick "Remember me on this device" to skip it next time, or press the lock button in the top bar to lock again.

**Please note:** this is a casual lock to keep strangers out of a personal site. It runs in the browser, so anyone who is good with developer tools could get past it. It does not protect the shared gallery's storage (see below). Don't put anything private on it.

To change the passcode: open the site, open the browser console (F12), type `irieHash('1234')` with your new number, and paste the result into `PASS_HASH` in `lock.js`.

## Shared gallery (optional)

By default each person's saved pictures live only on their own device. To let everyone who has the passcode see the same gallery, irie can use a free [Supabase](https://supabase.com) project as shared storage. No sign-in is needed for visitors.

1. Create a free Supabase account and a new project.
2. In the project, open **SQL Editor**, paste this and press Run:

```sql
create table creations (
  id text primary key,
  created bigint not null,
  name text not null,
  layout_id text, layout_name text, theme_id text, theme_name text,
  favorite boolean default false,
  final_path text not null, thumb_path text not null,
  originals jsonb default '[]', project jsonb
);
alter table creations enable row level security;
create policy "read" on creations for select using (true);
create policy "add" on creations for insert with check (true);
create policy "change" on creations for update using (true) with check (true);
create policy "remove" on creations for delete using (true);

insert into storage.buckets (id, name, public) values ('irie', 'irie', true);
create policy "read files" on storage.objects for select using (bucket_id = 'irie');
create policy "add files" on storage.objects for insert with check (bucket_id = 'irie');
create policy "remove files" on storage.objects for delete using (bucket_id = 'irie');
```

3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. Paste them into `config.js` and upload it to GitHub.

When both values are filled in, "Save to gallery" saves to the shared gallery and the Gallery page shows everyone's pictures. Leave them empty to keep pictures on each device.

**What "public" means here:** the gallery is open to anyone who has the site address and the key in `config.js`, because there is no sign-in. The passcode is only a front door. Anyone can also delete pictures, and "Delete all" removes them for everybody, so use it carefully. Favorites, names and delete work for the whole group.

## Run it

Camera access needs **https** or **localhost**.

- **GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from the `main` branch. GitHub Pages uses https, so the camera works.
- **Locally:** run `python -m http.server 8000` in this folder and open `http://localhost:8000`.

Opening `index.html` by double-click will show the page, but the camera and `frames/` will not load.

Live effects need **WebGL**, which all current desktop and phone browsers have. Without it, irie still takes plain photos and shows a note instead of the effects.

## Folder structure

```
index.html        the page
style.css         look and feel
app.js            all the logic
frames/           your photobooth frame designs (PNG) + frames.json
fx.js             effects engine (WebGL): live camera, thumbnails, editor and download all use it
stickers/         your own sticker PNGs + stickers.json
README.md         this file
```

## Adding your own frames

1. Make a PNG where the **photo spots are transparent** (the rest of the design is solid). The photo is placed behind the frame.
2. Put it in `frames/`, for example `frames/wish-willow.png`.
3. List it in `frames/frames.json`:

```json
{
  "frames": [
    { "name": "Wish Willow", "file": "wish-willow.png" },
    { "name": "Halloween", "file": "halloween.png" }
  ]
}
```

irie finds the transparent windows by itself and sets the number of photos to match (a frame with 4 windows takes 4 photos). Windows are ordered top to bottom, then left to right.

Optional settings per frame:

- `"photos": 3` – use only the first 3 windows.
- `"slots": [{ "x": 40, "y": 40, "w": 520, "h": 390 }]` – set the windows yourself (pixels of the PNG).

Tips: keep frame PNGs under about 2000 px wide for smooth phones. A window that touches the PNG edge is ignored.

## Adding your own stickers

Put transparent PNGs in `stickers/` and list them in `stickers/stickers.json`. See `stickers/README.md`.

## Roadmap

All five planned phases are done. Ideas for later: custom frame images that switch with each theme, more themes, portrait-shaped single photo, and an easy backup export of the whole gallery.

## Changelog

### v0.6.0 – 2026-11-19
- **Passcode screen** (4 digits) before entering irie, with a "Remember me on this device" option and a lock button. No sign-in. New file `lock.js`.
- Optional **shared gallery** using a free Supabase project, so everyone with the passcode sees the same saved pictures. Set up with `config.js` (see README). Without it, the gallery stays on each device. Rename, favorite, sort, filter, edit again, download and delete all work in both modes.
- **Normal photo** layout (was "No strip") is now the default, plus a **Normal photo (portrait)** option.

### v0.5.0 – 2026-11-19
- Phase 5: gallery management. Rename, favorite, sort (newest, oldest, favorites first, name), filter by layout and theme, favorites only.
- Delete all except favorites, plus the existing delete one / delete all.
- Gallery shows storage used and asks the browser to keep saved creations (persistent storage).
- Saved creations remember which theme was used.
- Roadmap updated: all planned phases complete.

### v0.4.0 – 2026-11-19
- Phase 4: 8 new layouts (6-cut, horizontal strip, 2 × 2, 2 × 3, 3 × 3, Double Polaroid, Film strip, Collage, Scrapbook).
- New **Multi** effect group with 11 mirror and multi-camera effects, live on the camera. The old Mirror effect is now "Horizontal Mirror" in this group.
- New artistic effects: Halftone, Pop Art, Watercolor (52 effects in total).
- 12 themes with coordinated layout, colors, caption, stickers and filter preset.
- New **Photos** tab: per-photo filter, zoom, reposition, reorder, replace and reset, all with undo / redo and saved with your gallery projects.
- Layout lists now scroll when long.

### v0.3.1 – 2026-11-19
- New **No strip** layout: take a single plain photo with no photobooth strip, border or background. Effects, stickers and text still work on it.
- Uploading one photo from the home page now uses No strip.

### v0.3.0 – 2026-11-19
- Phase 3 (Webcam Toy): live effects on the camera preview, powered by a new WebGL engine in `fx.js` (replaces the old pixel-by-pixel filters).
- 38 effects with live thumbnails, category tabs, None, Random, previous / next arrows and a strength slider.
- New effects: Lomo, Negative, Cartoon, Comic Book, Sketch, Pixelate, Posterize, Glitch, Double Vision, Crosshatch. Kaleidoscope and Mirror moved to Artistic.
- Captured photos keep the untouched original; effects are applied on top and can be changed in the editor.
- The editor, review screen and download use the same shaders as the live preview, so they match.
- Adjustment sliders (brightness, contrast, etc.) now run on the same engine.
- New Gallery page (IndexedDB): save creations with their originals, edit again, download PNG or JPEG, delete one or all.
- JPEG download option in the editor. Recently saved creations on the home page.

### v0.2.1 – 2026-11-19
- Roadmap updated: added **Phase 3 – Webcam Toy** (live camera effects). Previous Phase 3 and 4 are now Phase 4 and 5. No code changes.

### v0.2.0 – 2026-11-19
- Phase 2: new editor with Design, Filters, Stickers and Text tabs.
- 19 color filters and 10 warp effects with thumbnails and strength sliders.
- 11 adjustment sliders, Reset, and hold-to-compare.
- Stickers (emoji + your own PNGs via `stickers/stickers.json`) and text with fonts, color, outline, shadow and date stamp.
- Move, resize, rotate, duplicate, delete, layer order and lock.
- Undo / Redo for all editing actions.
- Effects, stickers and text are included in the PNG download.
- New files: `fx.js`, `stickers/stickers.json`, `stickers/README.md`.

### v0.1.0 – 2026-11-18
- First version (Phase 1): renamed to **irie**, tagline "saving memories", headline "crismiel and irish own little photobooth".
- Pink and purple highlights with a simple glass design, light and dark theme.
- Camera with permission handling, flip/choose camera, mirror, fullscreen.
- Countdown, multi-shot sessions, flash + shutter sound with mute.
- Review screen with retake one / retake all / upload photo.
- Layouts: 4-cut, 3-cut, 2-cut, Polaroid, and custom frames from `frames/frames.json` (windows detected automatically).
- Customize background, spacing, rounded corners, caption and date.
- PNG download in two sizes.
- Upload Photos from the home page (picks a layout based on how many photos you choose).
