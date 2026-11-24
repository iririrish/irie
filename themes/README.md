# themes

Each theme is a complete look for irie. The Settings panel (gear button) lists them, and the choice is saved on each device.

Ready now: **Classic Glass** (the default, built into `style.css`) and **Pixel Pastel Town** (`pixel.css`, with `images/pixel-city.jpg`).
**Night Garden** (`night.css`, always dark) and **Y2K Desktop** (`y2k.css`) are ready too.
Still "Coming soon": Sticker Book, Halftone Pop Zine.

When a theme is built (Phases 7 to 9), it adds:
- `themes/<id>.css` with its colors, fonts, buttons, menu style and animations (ids: `pixel`, `night`, `y2k`, `sticker`, `zine`)
- its background images in `themes/images/` (resize them to about 1600 px wide before uploading so the site loads fast)
- its id added to the `READY` list in `lock.js`
