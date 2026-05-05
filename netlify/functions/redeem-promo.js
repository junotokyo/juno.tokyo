const { getStore } = require("@netlify/blobs");

const STORE_CONFIG = {
  name: "popscan-config",
  siteID: "45361e2a-4fc3-4f9a-a862-3c34f7d0c791",
  token: process.env.NETLIFY_PAT,
  consistency: "strong",
};

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
  }

  let code;
  try {
    const body = JSON.parse(event.body || "{}");
    code = (body.code || "").trim().toUpperCase();
  } catch {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
  }

  // 英数字 1〜8 文字のみ許可
  if (!/^[A-Z0-9]{1,8}$/.test(code)) {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
  }

  try {
    const store = getStore(STORE_CONFIG);
    const key = `promo-code:${code}`;
    const raw = await store.get(key);

    if (!raw) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
    }

    // 有効期限チェック（UTC日付ベース、当日いっぱい有効）
    const today = new Date().toISOString().slice(0, 10); // "yyyy-mm-dd"
    if (data.expires < today) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
    }

    // 残数チェック
    if (data.count <= 0) {
      return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
    }

    // 残数をデクリメントして保存
    data.count -= 1;
    await store.set(key, JSON.stringify(data));

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  } catch {
    // Blobs アクセスエラーはネットワークエラーとして返す
    return { statusCode: 503, headers: CORS_HEADERS, body: JSON.stringify({ success: false }) };
  }
};
