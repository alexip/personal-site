# A quiet moment

A minimal, static page that shows one affirmation and one journal prompt each day. Content rotates deterministically by the visitor's local date, so everyone sees the same pair on the same calendar day. No backend, no database, no analytics.

## Structure

```
/
├── index.html        # Today's affirmation + prompt
├── archive.html      # Last 30 days
├── styles.css        # Light + dark theme
├── app.js            # Rotation, theme, copy button (runs on both pages)
├── data/
│   ├── affirmations.json
│   └── prompts.json
└── README.md
```

## Run locally

Because the page loads JSON via `fetch`, opening `index.html` directly with `file://` will fail in most browsers. Serve the folder:

```sh
# Python 3
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000/>.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo (e.g., `your-name/quiet-moment`).
2. In the repo settings → **Pages**, set **Source** to "Deploy from a branch" and select `main` / root.
3. The site will be live at `https://<your-name>.github.io/<repo>/`.

No build step. No configuration file required.

## Adding content

Open `data/affirmations.json` or `data/prompts.json` and append a string. Keep it valid JSON (comma between entries, no trailing comma). Commit and push — the new entry enters the rotation immediately.

Recommended cadence: aim for a pool of at least 90 entries in each file so visitors don't see repeats inside a 3-month window. Past that, repeats are fine and expected.

## How rotation works

For a given visitor:

1. Compute `daysSinceEpoch` from their **local** calendar date.
2. Affirmation index = `daysSinceEpoch % affirmations.length`.
3. Prompt index = `(daysSinceEpoch * 7) % prompts.length`.

The prompt uses a stride of 7 so that when the arrays are the same length, the pairing isn't locked — adding entries gradually re-shuffles the combinations.

All visitors in the same local date see the same pair. Changing timezones across midnight changes the pair, by design.

## Accessibility & performance

- Semantic landmarks (`<main>`, `<header>`, `<footer>`).
- `prefers-color-scheme` respected on first load; toggle persists in `localStorage`.
- `prefers-reduced-motion` disables transitions.
- No external fonts, no trackers, no CDN — first paint is one HTML + one CSS + two small JSON files.

## License

Content and code are yours to use however you like. No attribution required.
