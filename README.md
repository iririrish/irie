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

The very first thing anyone sees is a full-screen **"Enter the password"** page with a number keypad. The rest of the site stays hidden until the right 4-digit code is entered. There is no sign-in. You can tap the keypad or type the digits on a keyboard. Tick "Remember me on this device" to skip it next time, or press the lock button in the top bar to lock again.

**Please note:** this is a casual lock to keep strangers out of a personal site. It runs in the browser, so anyone who is good with developer tools could get past it. It does not protect the shared gallery's storage (see below). Don't put anything private on it.

To change the passcode: open the site, open the browser console (F12), type `irieHash('1234')` with your new number, and paste the result into `PASS_HASH` in `lock.js`.

## Your pictures on the home page

The photo strips on the right of the home page can show your own pictures, in every theme.
- **For everyone:** put up to 4 pictures in the `home/` folder on GitHub and list them in `home/home.json` (see `home/README.md`).
- **Just for you:** open Settings (gear button) and use **Home page pictures → Choose pictures**. They are saved on that device and win over the folder.

## Settings and themes

Press the gear button in the top bar to open **Settings**. There you can pick a **Theme** and switch between **Light** and **Dark**. The choice is saved on that device, and the passcode page uses it too. **Classic Glass** (the default), **Pixel Pastel Town**, **Night Garden** and **Y2K Desktop** are ready. The other two are shown as "Coming soon" and are built in Phase 9. Night Garden is always dark, so the Light / Dark switch has no effect on it.

## Shared gallery (optional)

By default each person's saved pictures live only on their own device. To let everyone who has the passcode see the same gallery, irie can use a free [Supabase](https://supabase.com) project as shared storage. No sign-in is needed for visitors.

### Step 1. Create your Supabase project
1. Go to **supabase.com** and press **Start your project**. Sign up with GitHub or an email.
2. Press **New project** (if it asks for an organization, create one with any name and choose the **Free** plan).
3. Fill in: **Name** `irie`, **Database password** (press Generate and save it somewhere; irie never uses it), **Region** the closest one to you (for the Philippines, choose Southeast Asia / Singapore).
4. Press **Create new project** and wait about 2 minutes until the dashboard finishes setting up.

### Step 2. Create the storage
1. In the left menu, open **SQL Editor** (the `</>` icon), then **New query**.
2. Copy the whole SQL block above, paste it in, and press **Run**. You should see "Success. No rows returned."
3. Check it worked: **Table Editor** should list a table called `creations`, and **Storage** should list a bucket called `irie` marked Public.
4. If you see "already exists", you ran it twice. That is fine.

### Step 3. Copy your two values
1. Open **Project Settings** (gear icon, bottom left), then **API Keys** (it may be called **API**).
2. Copy the **Project URL**. It looks like `https://abcdefgh.supabase.co`.
3. Copy the public key. Either one works: the **anon** key (starts with `eyJ`, sometimes under "Legacy API keys") or the **publishable** key (starts with `sb_publishable_`). Never copy the `service_role` or `secret` key.

### Step 4. Put them in irie
1. On GitHub, open your irie repository and click `config.js`, then the pencil icon (Edit).
2. Paste each value between the quotes, with no spaces:

```js
window.IRIE_CONFIG = {
  supabaseUrl: 'https://abcdefgh.supabase.co',
  supabaseKey: 'eyJ...your key...'
};
```

3. Press **Commit changes**. GitHub Pages updates in about a minute. Then open irie and refresh the page with Ctrl+F5 (on a phone, close the tab and open it again).

### Step 5. Test it
1. Open irie, enter the passcode, take a picture, go to the editor and press **Save to gallery**. You should see "Saved to the shared gallery".
2. Open the **Gallery** page. Your picture is there, and the note under the title says "Shared gallery".
3. Open irie on another phone or browser, enter the passcode, and open the Gallery. You should see the same picture.
4. In Supabase, **Table Editor → creations** shows a new row, and **Storage → irie** shows a folder with the image files.

### If something goes wrong
- **"Could not reach the shared gallery":** check `config.js` for a typo, a missing quote, or an extra space. Then press F12, open the **Network** tab, save again, and look at the red line. `401` or `403` means the key is wrong or Step 2 was skipped. `404` means the `creations` table is missing. A message about "row-level security" means the policies in Step 2 did not run.
- **The page still says "Saved on this device only":** `config.js` is still empty or the browser kept the old version. Refresh with Ctrl+F5.
- **The project stopped working after a quiet week:** free Supabase projects pause when nobody uses them. Open the dashboard and press **Restore project**.
- **Space:** the free plan gives 1 GB of file storage. Each saved picture uses roughly 1 to 4 MB, so it holds hundreds.

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
lock.js           the passcode page
theme.js          the theme list and the Settings panel
home/             pictures for the home page photo strips (see home/README.md)
themes/           one stylesheet per extra theme (pixel.css, night.css, y2k.css) and theme images (see themes/README.md). The default look lives in style.css
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

Phases 1 to 8 are done (see above). The next phases are the **kawaii redesign with switchable themes**. Phases 9 and 10 are planned, not built yet.

### The six themes (design concepts)
Ready now: Classic Glass, Pixel Pastel Town, Night Garden and Y2K Desktop. (Candy Bento was tried and removed.)
Picked from the concept boards. The visitor chooses one in **Settings**, and irie remembers it on that device.

1. **Classic Glass** (default): the original pink and purple glass look.
2. **Pixel Pastel Town**: pixel city background, chunky pixel buttons, pixel font, taskbar-style menu.
3. **Night Garden**: night garden background, glass cards, drifting firefly lights.
4. **Y2K Desktop**: sparkle-grid background, desktop windows, glossy bubble buttons, taskbar clock.
5. **Sticker Book**: notebook page, paper tabs, taped photos, handwritten titles.
6. **Halftone Pop Zine**: halftone pink background, bold collage, menu rail down the left side.

All six keep the same content and features. Only the look, fonts, backgrounds, menu style and small animations change.

### Phase 6: Passcode page and theme setting (done)
- The passcode becomes its **own full-screen page**, the first thing anyone sees. The rest of the site stays hidden until the right passcode is entered.
- The lock page uses the big **"Enter the password" keypad** (from your pink pixel reference): number buttons, dots for typed digits, shake on a wrong code. On phones it uses the number keypad. "Remember me on this device" and the lock button stay.
- The small keypad card from the concepts is not used, because the lock is now a separate page.
- A **Settings** panel with a **Theme** picker (a preview card for each theme). The choice is saved on the device and is also used for the lock page.
- The current look is reorganized into theme files so every theme shares the same features.

### Phase 7: Themes 1 and 2 (done: home page, passcode page and Settings; the other pages get their final look in Phase 10)
- Build the default look and **Pixel Pastel Town** for the home page and lock page.
- Your background images go in a `themes/` folder on GitHub (resized so pages load fast).

### Phase 8: Themes 3 and 4 (done: home page, passcode page and Settings)
- Build **Night Garden** and **Y2K Desktop**.

### Phase 9: Themes 5 and 6
- Build **Sticker Book** and **Halftone Pop Zine**.

### Phase 10: Every page, every theme, polish
- Apply all six themes to the camera, review, editor and gallery pages, not just the home page.
- Phone layouts, keyboard use, contrast checks, and reduced-motion support for the animations.
- Faster loading (smaller background images), then a full test of the whole site.

### Ideas for later
Custom frame images that switch with each theme, more themes, a portrait-shaped single photo, and an easy backup export of the whole gallery.

## Changelog

### v0.9.1 – 2026-11-21
- **Full UI cleanup.** The stylesheet was rewritten in one clean order (tokens, base, shell, components, pages, responsive) and the conflicting, duplicate and outdated rules were removed.
- **Uses the whole screen.** The 1100 px column is gone. Pages now fill the width with one shared side margin that scales with the screen, and the menu bar lines up with the page.
- **Cause of the home page looking different:** the three strips on the right were drawing the wrong layouts (a plain photo instead of the 4-cut strip) after the Normal photo layouts were added. Fixed, so the strips look like the design again.
- **Overlaps fixed:** the effect name no longer sits on top of the progress pill and fullscreen button on narrow cameras; the Pixel taskbar style links no longer collide with the menu on mid-size screens; the phone menu wraps instead of squeezing; editor tabs wrap; Night Garden's menu no longer slides under the page; the passcode page decorations hide on short screens.
- **One size for everything:** shared sizes for buttons, inputs, dropdowns, chips and icon buttons; shared corner radii and spacing; the review and gallery grids resize instead of using fixed widths.
- Side panels in the camera and editor stay in view and scroll on their own instead of making the whole page scroll.
- **Home page pictures:** your own pictures can fill the home page photo strips (folder `home/` or Settings).
- Night Garden now shows the strips on the right of the home page too.

### v0.9.0 – 2026-11-20
- Phase 8: **Night Garden** theme. Your night garden image as the background, a glass hero card, gold accents, a Caveat tagline, softly drifting fireflies, a floating centered menu, and a matching passcode page. Always dark.
- **Y2K Desktop** theme. Your sparkle-grid image, the hero and preview shown as desktop windows with title bars, glossy bubble buttons, twinkling sparkles, a taskbar along the bottom with a live clock, and a small "enter password.exe" window for the passcode page.
- Both themes are chosen in Settings, are remembered, keep the one-screen home page, and use thin scrollbars in their own colors.
- New files: `themes/night.css`, `themes/y2k.css`, `themes/images/night-garden.jpg`, `themes/images/y2k-grid.jpg`.

### v0.8.2 – 2026-11-20
- **Pixel Pastel Town** now follows the concept board more closely: "Pick a style" sits in the taskbar as text links (Photo, 4-cut, Polaroid, Film, Collage), "Recently created ▸ N strips" is a small badge above the taskbar, and the taskbar has the irie badge and menu on the left with the icon buttons on the right.
- New, cleaner **settings (gear) icon**.
- The page now fills the screen exactly, so the **home page no longer scrolls**. The extra space below the content is gone on every page.
- Home "Pick a style" bar now shows 5 styles (Photo, 4-cut, Polaroid, Film, Collage). The full list is still on the camera page.

### v0.8.1 – 2026-11-20
- The original pink and purple glass look is back and is the default theme, now called **Classic Glass**. Candy Bento is removed.
- The home page now fits on **one screen with no scrolling**: headline, buttons and strip previews on top, and a slim bar at the bottom with **Pick a style** (small thumbnails) and **Recently created** (up to 3). The camera screen is a little shorter too.
- **Thin scrollbars** in every theme (square pixel-style ones in Pixel Pastel Town).
- **Pixel Pastel Town** rebuilt to match the concept board: a pixel panel with the "irie.exe" tagline, tilted pixel strip and polaroid frames, twinkling hearts, a pixel-style "Pick a style" bar, the taskbar menu along the bottom, and the pixel-city passcode page.
- Removed `themes/candy.css`.

### v0.8.0 – 2026-11-20
- Phase 7: **Candy Bento** home page is now a bento layout (hero card, steps card, recently created card, pick a style card), with puffy Fredoka and Nunito styling. The small keypad card is gone, since the passcode is its own page.
- New **Pixel Pastel Town** theme: your pixel city as the background, Press Start 2P and VT323 fonts, chunky pixel buttons, solid pixel panels, a taskbar-style menu along the bottom, twinkling pixel hearts, and a pixel-city passcode page.
- Pick either theme in Settings. The choice is saved and used from the very first screen.
- "Recently created" is always shown on the home page, with a short note when nothing is saved yet.
- New files: `themes/candy.css`, `themes/pixel.css`, `themes/images/pixel-city.jpg`.

### v0.7.0 – 2026-11-20
- Phase 6: the passcode is now its own full-screen page with a number keypad ("Enter the password"), pixel hearts and clouds, dots for typed digits, a delete key, and keyboard typing.
- New **Settings** panel (gear button): theme picker with a card for each of the six themes, and a Light / Dark switch. The choice is saved per device and the passcode page follows it.
- Candy Bento is the current look. The other five themes show "Coming soon".
- New files: `theme.js`, `themes/README.md`. The lock button and settings button now use drawn icons.

### v0.6.2 – 2026-11-20
- Roadmap updated with phases 6 to 10: separate passcode page, theme setting with six themes, and applying the themes to every page. No code changes.

### v0.6.1 – 2026-11-19
- Shared gallery setup guide in the README is now step by step, with troubleshooting.
- Shared gallery now also works with Supabase's newer `sb_publishable_` keys, and ignores spaces or a trailing slash in the URL.

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
