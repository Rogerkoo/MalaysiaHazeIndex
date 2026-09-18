# Cloudflare Worker

This worker proxies the DOE APIMS REST endpoint for the GitHub Pages frontend.

## Why use a Worker?

GitHub Pages is static hosting. It cannot run server-side code. A tiny Worker gives the frontend a stable endpoint and also provides a 5-minute cache.

## Deploy

1. Create a Cloudflare Worker.
2. Paste `worker.js`.
3. Deploy it.
4. Copy the Worker URL.
5. Edit `app.js`:

```js
const CONFIG = {
  API_BASE_URL: "https://YOUR-WORKER.workers.dev/api/apims",
  ...
};
```

The worker requests this DOE endpoint:

```text
https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/CAQM_MCAQM_Current_Reading/MapServer/0/query
```

The upstream endpoint and its station fields are documented by the `dausdashsan/apims-api` project, which wraps the Malaysian DOE real-time APIMS service.

## Security

No API key is stored in the GitHub Pages site.

The worker only exposes one read-only route:

`GET /api/apims`

It is intentionally not a general-purpose proxy.
