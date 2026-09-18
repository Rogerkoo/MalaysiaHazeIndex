// Cloudflare Worker for Malaysia Haze Dashboard
//
// Deploy this file as a Cloudflare Worker.
// Then set the Worker URL in app.js:
//   API_BASE_URL: "https://YOUR-WORKER.workers.dev/api/apims"

const UPSTREAM =
  "https://eqms.doe.gov.my/api3/publicmapproxy/PUBLIC_DISPLAY/" +
  "CAQM_MCAQM_Current_Reading/MapServer/0/query";

const ALLOW_ORIGIN = "*";
const CACHE_TTL_SECONDS = 300;

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Cache-Control": "public, max-age=300"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname !== "/api/apims") {
      return json({ error: "Not found" }, 404);
    }

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), request);
    const cached = await cache.match(cacheKey);

    if (cached) {
      return cached;
    }

    const upstreamUrl = new URL(UPSTREAM);
    upstreamUrl.searchParams.set("f", "json");
    upstreamUrl.searchParams.set("outFields", "*");
    upstreamUrl.searchParams.set("returnGeometry", "false");
    upstreamUrl.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    upstreamUrl.searchParams.set("where", "1=1");

    try {
      const upstream = await fetch(upstreamUrl.toString(), {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Malaysia-Haze-Dashboard/1.0"
        }
      });

      if (!upstream.ok) {
        return json({ error: `DOE APIMS returned HTTP ${upstream.status}` }, 502);
      }

      const body = await upstream.text();

      const response = new Response(body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8"
        }
      });

      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      return json({ error: "Unable to contact DOE APIMS." }, 502);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`
    }
  });
}
