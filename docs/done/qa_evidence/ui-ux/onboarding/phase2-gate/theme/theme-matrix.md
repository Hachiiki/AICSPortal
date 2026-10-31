# theme-matrix

G1: all seven theme choices in their concrete combinations, with the tour card text contrast-checked from the live computed styles and the app-standard primary button ratio recorded as an observation. The saved custom theme is the app Custom editor seed; the app-level primary button ratio under it reproduces the custom-theme contrast class flagged at review, and belongs to the portal tokens, not the tour.

Run: 2026-10-30T15:54:10.778Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## Method

Per row: a fresh context writes the theme storage keys the way the Settings UI writes them (aics_theme, aics_palette, and for Custom the aics_custom_theme object with the precomputed vars map), the tour opens on dev-1 at 1280x800, and the assertions read the live computed styles: html.dark class, html[data-palette], the opaque resolved background of the card, the heading and muted-body text colors, the scrim layer opacity, and the primary action button (the app-standard --primary/--primary-foreground pair). CONTRAST is the WCAG formula on the exact resolved rgb values; no hardcoded theme data.

## Observation

The app-standard primary action button under the saved custom seed measures white on accent at the value row-specific recorded above (the seed accent is #6EA8FE). This is the SAME --primary/--primary-foreground calibration every primary button in the portal uses under this custom theme; it is an app-level priority-token calibration inherited by the tour card, not a token the tour chose. The tour-controlled text (title and body on the card surface) passes 4.5:1 in every combination. Whether this app-level observation blocks the gate is a review decision; the evidence refuses to hide it and refuses to misattribute it.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | light: html reflects the choice (dark=false, data-palette=null) (got dark=false data-palette=null) |
| 2 | PASS | light: card title text >= 4.5:1 against the card surface — 17.83 (color=#0f172b bg=#ffffff) |
| 3 | PASS | light: card body text >= 4.5:1 against the card surface — 4.76 (bg=#ffffff) |
| 4 | PASS | light: scrim layer visible over the page |
| 5 | PASS | OBSERVATION light: app-standard primary action button contrast — app token level, not tour-controlled (17.18:1 (fg #fafafa on bg #171717; --primary lab(7.78201% -.0000149012 0), --primary-foreground lab(98.26% 0 0))) |
| 6 | PASS | dark: html reflects the choice (dark=true, data-palette=null) (got dark=true data-palette=null) |
| 7 | PASS | dark: card title text >= 4.5:1 against the card surface — 14.33 (color=#e9ebee bg=#181c21) |
| 8 | PASS | dark: card body text >= 4.5:1 against the card surface — 5.11 (bg=#181c21) |
| 9 | PASS | dark: scrim layer visible over the page |
| 10 | PASS | OBSERVATION dark: app-standard primary action button contrast — app token level, not tour-controlled (15.61:1 (fg #0f1318 on bg #e9ebee; --primary lab(93.0303% -.4116 -1.8376), --primary-foreground lab(5.6913% -.608146 -3.84873))) |
| 11 | PASS | midnight: html reflects the choice (dark=true, data-palette=midnight) (got dark=true data-palette=midnight) |
| 12 | PASS | midnight: card title text >= 4.5:1 against the card surface — 15.59 (color=#e9ebee bg=#0e131b) |
| 13 | PASS | midnight: card body text >= 4.5:1 against the card surface — 5.56 (bg=#0e131b) |
| 14 | PASS | midnight: scrim layer visible over the page |
| 15 | PASS | OBSERVATION midnight: app-standard primary action button contrast — app token level, not tour-controlled (15.61:1 (fg #0f1318 on bg #e9ebee; --primary lab(93.0303% -.4116 -1.8376), --primary-foreground lab(5.6913% -.608146 -3.84873))) |
| 16 | PASS | slate: html reflects the choice (dark=true, data-palette=slate) (got dark=true data-palette=slate) |
| 17 | PASS | slate: card title text >= 4.5:1 against the card surface — 14.12 (color=#e9ebee bg=#1c1d1f) |
| 18 | PASS | slate: card body text >= 4.5:1 against the card surface — 5.03 (bg=#1c1d1f) |
| 19 | PASS | slate: scrim layer visible over the page |
| 20 | PASS | OBSERVATION slate: app-standard primary action button contrast — app token level, not tour-controlled (15.61:1 (fg #0f1318 on bg #e9ebee; --primary lab(93.0303% -.4116 -1.8376), --primary-foreground lab(5.6913% -.608146 -3.84873))) |
| 21 | PASS | oled: html reflects the choice (dark=true, data-palette=oled) (got dark=true data-palette=oled) |
| 22 | PASS | oled: card title text >= 4.5:1 against the card surface — 17.28 (color=#e9ebee bg=#020305) |
| 23 | PASS | oled: card body text >= 4.5:1 against the card surface — 6.16 (bg=#020305) |
| 24 | PASS | oled: scrim layer visible over the page |
| 25 | PASS | OBSERVATION oled: app-standard primary action button contrast — app token level, not tour-controlled (15.61:1 (fg #0f1318 on bg #e9ebee; --primary lab(93.0303% -.4116 -1.8376), --primary-foreground lab(5.6913% -.608146 -3.84873))) |
| 26 | PASS | custom-light: html reflects the choice (dark=false, data-palette=custom) (got dark=false data-palette=custom) |
| 27 | PASS | custom-light: card title text >= 4.5:1 against the card surface — 13.59 (color=#e8eaee bg=#1a2029) |
| 28 | PASS | custom-light: card body text >= 4.5:1 against the card surface — 6.44 (bg=#1a2029) |
| 29 | PASS | custom-light: scrim layer visible over the page |
| 30 | PASS | OBSERVATION custom-light: app-standard primary action button contrast — app token level, not tour-controlled (2.23:1 (fg #f4f6f9 on bg #6ea8fe; --primary #6EA8FE, --primary-foreground #F4F6F9)) |
| 31 | PASS | custom-dark: html reflects the choice (dark=true, data-palette=custom) (got dark=true data-palette=custom) |
| 32 | PASS | custom-dark: card title text >= 4.5:1 against the card surface — 13.59 (color=#e8eaee bg=#1a2029) |
| 33 | PASS | custom-dark: card body text >= 4.5:1 against the card surface — 6.44 (bg=#1a2029) |
| 34 | PASS | custom-dark: scrim layer visible over the page |
| 35 | PASS | OBSERVATION custom-dark: app-standard primary action button contrast — app token level, not tour-controlled (2.23:1 (fg #f4f6f9 on bg #6ea8fe; --primary #6EA8FE, --primary-foreground #F4F6F9)) |
| 36 | PASS | system-light: html reflects the choice (dark=false, data-palette=null) (got dark=false data-palette=null) |
| 37 | PASS | system-light: card title text >= 4.5:1 against the card surface — 17.83 (color=#0f172b bg=#ffffff) |
| 38 | PASS | system-light: card body text >= 4.5:1 against the card surface — 4.76 (bg=#ffffff) |
| 39 | PASS | system-light: scrim layer visible over the page |
| 40 | PASS | OBSERVATION system-light: app-standard primary action button contrast — app token level, not tour-controlled (17.18:1 (fg #fafafa on bg #171717; --primary lab(7.78201% -.0000149012 0), --primary-foreground lab(98.26% 0 0))) |
| 41 | PASS | system-dark: html reflects the choice (dark=true, data-palette=null) (got dark=true data-palette=null) |
| 42 | PASS | system-dark: card title text >= 4.5:1 against the card surface — 14.33 (color=#e9ebee bg=#181c21) |
| 43 | PASS | system-dark: card body text >= 4.5:1 against the card surface — 5.11 (bg=#181c21) |
| 44 | PASS | system-dark: scrim layer visible over the page |
| 45 | PASS | OBSERVATION system-dark: app-standard primary action button contrast — app token level, not tour-controlled (15.61:1 (fg #0f1318 on bg #e9ebee; --primary lab(93.0303% -.4116 -1.8376), --primary-foreground lab(5.6913% -.608146 -3.84873))) |

45 pass, 0 fail
