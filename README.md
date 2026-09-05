# Nobathon Schedule

Static event schedule for [schedule.nobbers.tv](https://schedule.nobbers.tv/). It is driven by `src/data/schedule.json` and built with Astro, Swiper, and Luxon.

The live site includes a coverflow carousel, a compact full-schedule view, times converted to the visitor’s timezone, light and dark themes, a merch shop link, social links, and a jump-to-current control.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/data/schedule.json` | Site copy, timezone, events, merch, social links, and footer decorations |
| `src/pages/index.astro` | Single-page layout |
| `src/components/ScheduleCarousel.astro` | Carousel, full schedule, clock, and jump-to-current |
| `src/components/MerchModal.astro` | Floating merch, social, and theme toolbar |
| `src/components/SkyScene.astro` | Stars, moon, and scroll-depth layers |
| `src/styles/palette.css` | Light and dark color tokens |
| `src/styles/global.css` | Layout and component styles |
| `public/icon.png` | Favicon |
| `public/events/` | Event-card images |
| `public/decorations/` | Footer artwork |
| `.github/workflows/deploy.yaml` | Build on `main` and publish to `gh-pages` |

The hero title uses the 700 weight of [DynaPuff](https://fonts.google.com/specimen/DynaPuff). The fallback stack is on `.hero h1` in `src/styles/global.css`.

## Configure `schedule.json`

Event times are wall-clock times in the configured IANA timezone. Luxon reads them in that zone, then the browser shows them in the visitor’s local timezone. Live, upcoming, and past states use the same converted times.

```json
{
  "site": {
    "eyebrow": "Fall 2026",
    "title": "Nobathon",
    "subtitle": "- year of rest -"
  },
  "time-zone": "America/New_York",
  "merch": {
    "label": "Merch",
    "title": "The Merch Drop",
    "image": "decorations/merch-bag.svg",
    "button-label": "Visit merch shop",
    "url": "https://ko-fi.com/ohhnoss/shop"
  },
  "social-links": [
    {
      "label": "Twitch",
      "url": "https://www.twitch.tv/ohhnoss",
      "icon": "twitch"
    }
  ],
  "events": [
    {
      "title": "D&D",
      "description": "Dice hit the table.",
      "start-time": "2026-09-10T18:00:00",
      "end-time": "2026-09-10T21:00:00",
      "image": "events/gameshow.svg",
      "players": ["Noss"]
    }
  ],
  "footer": {
    "message": "Nobberin Time",
    "floating-images": [
      {
        "image": "decorations/star.svg",
        "alt": "",
        "side": "left",
        "offset": "3%",
        "size": "clamp(58px, 8vw, 108px)",
        "duration": "5.5s",
        "delay": "-1s"
      }
    ]
  }
}
```

### Site and timezone

- `site.eyebrow`, `site.title`, and `site.subtitle` set the hero copy.
- `time-zone` must be an IANA zone such as `America/New_York`.
- Event timestamps use `YYYY-MM-DDTHH:mm:ss` with no `Z` or offset. They are read in `time-zone`.

### Events

| Field | Required | Description |
| --- | --- | --- |
| `title` | Yes | Card and full-schedule title |
| `description` | Yes | Supporting copy |
| `start-time` | Yes | Start in the source timezone |
| `end-time` | Yes | End in the source timezone; must be after the start |
| `image` | Yes | Path relative to `public/` |
| `players` | No | Names; adds the player count and tooltip |

Keep the array in nondecreasing start-time order. Overlaps are allowed: every in-progress event is marked live. The carousel focuses the live event with the earliest start, or the next upcoming event during a gap.

An open page rechecks event state once per minute. Live cards show a progress bar from start to end. **Jump to current** under the carousel hint snaps back to that focused event. Returning to a hidden tab refreshes immediately. The local clock updates every second.

### Merch and social links

The merch toolbar button opens `merch.url` in a new tab. The shop icon comes from Font Awesome (`fa6-solid:shop`) via `astro-icon`. `merch.label` is the accessible name and hover label.

`merch.title`, `merch.image`, and `merch.button-label` are still required by `npm run validate` even though they are not shown in the toolbar.

Each `social-links` entry needs a `label`, an `https://` URL, and an `icon`. Built-in icons are `twitch`, `youtube`, and `bluesky`. Extra icons need SVG markup in `src/components/MerchModal.astro`.

While an event is live, its **Live now** badge links to the first social entry whose `icon` is `twitch`.

The footer archive link is built in `src/pages/index.astro` and points at `/2025/` on the deployed site.

## Images

Put files in `public/` and reference them without that prefix:

```text
public/events/my-event.webp       -> "image": "events/my-event.webp"
public/decorations/my-star.svg    -> "image": "decorations/my-star.svg"
```

SVG, PNG, WebP, JPEG, and GIF work. Event images are cropped with `object-fit: cover`; a landscape `4:3` ratio fits best.

### Footer decorations

Each object in `footer.floating-images` adds one image in the cloud footer:

- `image`: path relative to `public/`
- `alt`: empty string for decorative art
- `side`: `left` or `right`
- `offset`: distance from that side
- `size`: CSS size, including `clamp(...)`
- `duration` / `delay`: float animation timing

### Sky and clouds

Stars and the moon are CSS, not image files.

- Edit stars in `src/components/SkyScene.astro` (`--star-x`, `--star-y`, `--star-size`, `--star-delay`).
- `sky-star--dot` is a circle; `sky-star--cross` is a sparkle.
- `data-sky-depth` sets how much a layer moves on scroll.
- Moon and cloud shapes live in `src/styles/global.css`. Colors are in `src/styles/palette.css`.

Motion respects `prefers-reduced-motion`. Below `720px`, the moon, stars, and floating footer images are hidden.

## Color palette

Tokens live in `src/styles/palette.css`. Dark mode is the default. The toolbar choice is stored in `localStorage`.

Useful groups:

- Page: `--color-page`, `--color-page-top`, `--color-page-mid`, `--color-page-bottom`
- Text: `--color-text`, `--color-muted`, `--color-subtle`
- Accents: `--color-accent`, `--color-accent-warm`, `--color-accent-cool`, `--color-live`
- Cards: `--color-card-*`, `--color-row-*`, `--color-control*`, `--color-line`
- Hero title: `--color-hero-1` through `--color-hero-4`
- Sky and clouds: `--color-moon*`, `--color-star`, `--color-cloud*`

Check both themes after palette changes.

## Local development

The deploy workflow uses Node.js 22.

```sh
npm install
npm run dev
```

Astro prints the local URL. To reach it from another machine:

```sh
npm run dev -- --host 0.0.0.0
```

## Check and build

```sh
npm run validate   # schedule.json plus referenced assets
npm run check      # validation plus Astro/TypeScript checks
npm run build      # validate, then write dist/
npm run preview    # serve the production build
```

Do not edit `dist/` by hand; it is replaced on every build.

## GitHub Pages

`astro.config.mjs` is set to:

```text
site: https://schedule.nobbers.tv/
base: /
```

A push to `main` (or a manual **Actions** run) executes `.github/workflows/deploy.yaml`:

1. Installs dependencies with `npm ci`.
2. Runs `npm run build`.
3. Publishes `dist/` to the `gh-pages` branch with `keep_files: true`, so existing paths such as `2025/` are left in place.

GitHub Pages should be **Deploy from a branch** → `gh-pages` → `/ (root)`. `public/.nojekyll` is included so GitHub does not hide underscore-prefixed folders.

## Libraries

- **Astro** builds the static site.
- **astro-icon** plus `@iconify-json/fa6-solid` supply the merch shop icon.
- **Swiper** handles swipe, keyboard, pagination, and coverflow.
- **Luxon** converts schedule times into the visitor’s timezone.
