# stickers

irie already has built-in emoji stickers. To add your own, put transparent PNGs in this folder and list them in `stickers.json`:

```json
{
  "stickers": [
    { "name": "Pink bow", "file": "pink-bow.png", "category": "Bows" },
    { "name": "Silver star", "file": "silver-star.png", "category": "Stars" },
    { "name": "Cat", "file": "cat.png" }
  ]
}
```

- `category` is optional. Use a built-in name (Hearts, Stars, Flowers, Bows, Sparkles, Butterflies, Cute, Retro, Y2K, Seasonal) to add to that tab, or any new name to make a new tab. Without a category, the sticker goes in a tab called "Mine".
- Keep each PNG under about 500 px wide so it loads fast.
