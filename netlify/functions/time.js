const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  const now = new Date();

  const body = {
    iso8601: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
  };

  if (event.headers["x-popscan-purpose"] === "quota_check") {
    try {
      const store = getStore({ name: "popscan-config", siteID: "45361e2a-4fc3-4f9a-a862-3c34f7d0c791", token: process.env.NETLIFY_PAT, consistency: "eventual" });
      const promoValue = await store.get("promo");
      body.p = promoValue === "true";
    } catch {
      body.p = false;
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
};
