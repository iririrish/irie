# frames

Put your photobooth frame designs (PNG) in this folder, then list them in `frames.json`.

A frame PNG must have **transparent windows** where the photos go. irie finds the windows automatically.

```json
{
  "frames": [
    { "name": "Wish Willow", "file": "wish-willow.png" },
    { "name": "Halloween", "file": "halloween.png" }
  ]
}
```

Optional: `"photos": 3` to use only the first 3 windows, or `"slots": [{ "x": 40, "y": 40, "w": 520, "h": 390 }]` (pixels of the PNG) to set windows by hand.

See the main README for full details.
