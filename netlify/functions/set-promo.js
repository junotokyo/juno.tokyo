const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const token = event.headers["x-admin-token"];
  if (!token || token !== process.env.POPSCAN_ADMIN_TOKEN) {
    return { statusCode: 401, body: "Unauthorized" };
  }

  const value = (event.body || "").trim();
  if (value !== "true" && value !== "false") {
    return { statusCode: 400, body: 'Body must be "true" or "false"' };
  }

  const store = getStore({ name: "popscan-config", siteID: "45361e2a-4fc3-4f9a-a862-3c34f7d0c791", token: process.env.NETLIFY_PAT });
  await store.set("promo", value);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promo: value === "true" }),
  };
};
