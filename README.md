# irie – saving memories

A simple online photobooth for **crismiel and irish**. Take photos with your camera (or upload them), pick a layout, and download your strip. Everything runs in the browser – photos are never uploaded anywhere.

**Flow:** Capture → Customize → Download

## What works now (Phase 1)

- Camera in the browser (asks for permission only when you open the Photobooth)
- Front / rear camera flip, camera picker, mirror toggle, fullscreen
- Countdown (none, 3, 5, 10 seconds) with a big animated number
- Multi-shot sessions with a delay between photos, flash effect and shutter sound (mute option)
- Review screen: retake one photo, retake all, or upload a photo in place
- Layouts: Classic 4-cut, 3-cut, 2-cut, Polaroid, plus **your own frames** from the `frames/` folder
- Customize: background color or gradient, photo spacing, rounded corners, caption, date
- Download as PNG (Standard 1200 px or High 1800 px wide)
- Light and dark theme, pink + purple glass look

## Run it

Camera access needs **https** or **localhost**.

- **GitHub Pages:** push this folder to a repo → Settings → Pages → deploy from the `main` branch. GitHub Pages uses https, so the camera works.
- **Locally:** run `python -m http.server 8000` in this folder and open `http://localhost:8000`.

Opening `index.html` by double-click will show the page, but the camera and `frames/` will not load.

## Folder structure

```
index.html        the page
style.css         look and feel
app.js            all the logic
frames/           your photobooth frame designs (PNG) + frames.json
stickers/         reserved for Phase 2
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

## Roadmap

- **Phase 2:** filters, adjustment sliders, stickers and text, before/after
- **Phase 3:** more layouts, mirror effects, themes, per-photo editing
- **Phase 4:** personal gallery saved on the device (IndexedDB)

## Changelog

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
