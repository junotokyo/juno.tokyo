const { getStore } = require("@netlify/blobs");

const STORE_CONFIG = {
  name: "popscan-config",
  siteID: "45361e2a-4fc3-4f9a-a862-3c34f7d0c791",
  token: process.env.NETLIFY_PAT,
  consistency: "strong",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

function authCheck(event) {
  const token = event.headers["x-admin-token"];
  return token && token === process.env.POPSCAN_ADMIN_TOKEN;
}

exports.handler = async (event) => {
  if (!authCheck(event)) {
    return { statusCode: 401, headers: JSON_HEADERS, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const store = getStore(STORE_CONFIG);

  // GET: プロモコード一覧
  if (event.httpMethod === "GET") {
    try {
      const { blobs } = await store.list({ prefix: "promo-code:" });
      const codes = await Promise.all(
        blobs.map(async ({ key }) => {
          const raw = await store.get(key);
          let data = {};
          try { data = JSON.parse(raw); } catch {}
          return { code: key.replace("promo-code:", ""), ...data };
        })
      );
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify(codes) };
    } catch (err) {
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: String(err) }) };
    }
  }

  // POST: プロモコード追加・更新
  if (event.httpMethod === "POST") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const code = (body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(code)) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "code must be 1-8 alphanumeric characters" }) };
    }

    const expires = (body.expires || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "expires must be yyyy-mm-dd" }) };
    }

    const count = parseInt(body.count, 10);
    if (isNaN(count) || count < 0) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "count must be a non-negative integer" }) };
    }

    try {
      await store.set(`promo-code:${code}`, JSON.stringify({ expires, count }));
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ code, expires, count }) };
    } catch (err) {
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: String(err) }) };
    }
  }

  // DELETE: プロモコード削除
  if (event.httpMethod === "DELETE") {
    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const code = (body.code || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(code)) {
      return { statusCode: 400, headers: JSON_HEADERS, body: JSON.stringify({ error: "code must be 1-8 alphanumeric characters" }) };
    }

    try {
      await store.delete(`promo-code:${code}`);
      return { statusCode: 200, headers: JSON_HEADERS, body: JSON.stringify({ deleted: code }) };
    } catch (err) {
      return { statusCode: 500, headers: JSON_HEADERS, body: JSON.stringify({ error: String(err) }) };
    }
  }

  return { statusCode: 405, headers: JSON_HEADERS, body: JSON.stringify({ error: "Method Not Allowed" }) };
};
