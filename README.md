# Malaysia Haze Dashboard

A lightweight, dependency-free Malaysia haze / air-pollution dashboard designed for GitHub Pages.

## Architecture

```text
GitHub Pages
  |
  | index.html + app.js + style.css
  v
Browser
  |
  | GET /api/apims
  v
Cloudflare Worker
  |
  | 5-minute cache
  v
DOE APIMS
```

GitHub Pages hosts static files; it does not run server-side PHP/Python/etc. A small Worker is therefore used for the live APIMS request.

## Files

```text
.
├── index.html
├── app.js
├── style.css
├── .nojekyll
├── README.md
└── worker/
    ├── worker.js
    └── README.md
```

## 1. Deploy the Worker

See `worker/README.md`.

After deployment, copy the Worker URL.

## 2. Configure the site

Open `app.js` and change:

```js
API_BASE_URL: "https://YOUR-WORKER.workers.dev/api/apims",
```

to your real Worker URL.

## 3. Test locally

You can open `index.html` through a small local static server, for example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## 4. Publish to GitHub Pages

Create a repository and upload the files to `main`.

GitHub Pages can publish directly from a branch/folder. In the repository:

`Settings` → `Pages` → `Build and deployment` → `Source` → `Deploy from a branch`

Choose:

- Branch: `main`
- Folder: `/(root)`

Then save.

Your site will normally be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

## How locations work

The dashboard is station-based because APIMS supplies monitoring-station readings.

Use the search box to find a location/station and add it to the dashboard. Your selected station IDs are stored in the browser's `localStorage`, so each visitor can maintain their own list.

## Refresh

The browser refreshes the readings every 5 minutes and has a manual refresh button.

## Data

Primary source:

- Malaysia Department of Environment APIMS:
  https://eqms.doe.gov.my/APIMS/main
- AQICN Malaysia APIMS network:
  https://aqicn.org/network/my.apims/

The code consumes the DOE APIMS REST endpoint through the Worker rather than scraping the APIMS webpage.

## Important note

The displayed activity guidance is general informational guidance derived from the APIMS/DOE API bands. It is not medical advice. For public-health decisions, follow current official DOE and health-authority guidance.
