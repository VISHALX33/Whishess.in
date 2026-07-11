import { getStore } from "@netlify/blobs";

const STORE = "whishess-visits";

function cors(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function increment(store, key) {
  const raw = await store.get(key);
  const next = (parseInt(raw || "0", 10) || 0) + 1;
  await store.set(key, String(next));
  return next;
}

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return cors(null, 204);
  }

  const store = getStore(STORE);
  const url = new URL(req.url);

  if (req.method === "GET" && url.searchParams.get("mode") === "stats") {
    const total = parseInt((await store.get("total")) || "0", 10);
    const today = todayKey();
    const todayCount = parseInt((await store.get("day:" + today)) || "0", 10);
    const homepage = parseInt((await store.get("page:home")) || "0", 10);

    const pages = {};
    const list = await store.list({ prefix: "page:" });
    for (const item of list.blobs) {
      const name = item.key.replace("page:", "");
      pages[name] = parseInt((await store.get(item.key)) || "0", 10);
    }

    const daily = {};
    const dayList = await store.list({ prefix: "day:" });
    for (const item of dayList.blobs) {
      const day = item.key.replace("day:", "");
      daily[day] = parseInt((await store.get(item.key)) || "0", 10);
    }

  return cors(JSON.stringify({
      total,
      today: todayCount,
      todayDate: today,
      homepage,
      pages,
      daily: Object.fromEntries(
        Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14)
      )
    }));
  }

  if (req.method === "POST" || (req.method === "GET" && url.searchParams.get("page"))) {
    const page = (url.searchParams.get("page") || "home").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "home";
    const today = todayKey();

    const total = await increment(store, "total");
    const pageCount = await increment(store, "page:" + page);
    const dayCount = await increment(store, "day:" + today);

    return cors(JSON.stringify({
      ok: true,
      total,
      page,
      pageCount,
      dayCount
    }));
  }

  return cors(JSON.stringify({ error: "Invalid request" }), 400);
};
