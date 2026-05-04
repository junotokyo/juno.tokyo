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

  const store = getStore("popscan-config");
  await store.set("promo", value);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promo: value === "true" }),
  };
};
