# Passly — brand kit

Generated from one shared icon system (24-unit glyph grid, superellipse tile, Geist type).
Every mark comes in three appearances:

| Appearance | Tile | Glyph | Use |
|---|---|---|---|
| **brand** | `#3F918B` → `#0B554F` | `#FFFFFF` | App icon, favicon (light UI), apple-touch, social |
| **dark** | `#202024` → `#0A0A0C` | `#5CA29C` | Favicon in dark UI, dark-mode app icon |
| **light** | `#FFFFFF` → `#EFEFF2` | `#0F766E` | Light-mode / tinted app icon, print |

Accent: `#0F766E`

## Files

- `icon/icon-{brand,dark,light}.svg` — full-bleed 1024 tiles (source of truth)
- `icon/icon-brand-1024.png` — raster of the brand tile
- `icon/macos/icon-{brand,dark,light}-1024.png` — Apple icon grid (824 body, 100 px margin, shadow); feed these to Icon Composer for macOS 26 dark/tinted appearances
- `icon/mark.svg` — glyph only, `currentColor`, for use inside the UI
- `icon/glyph-1024.png` — transparent glyph
- `favicon/` — adaptive `favicon.svg` (brand tile in light UI, dark tile in dark UI), `favicon.ico` (16–256), apple-touch, PWA 192/512 + maskable
- `logo/logo-{light,dark}.{svg,png}` — horizontal lockup, text outlined (no font needed); `light` = for light backgrounds
- `social/og-{dark,light}.png` — 1200×630 share cards; dark is the one wired into the site

Headline: “Your passwords, on your device.”
