exports.handler = async (event) => {
  const now = new Date();

  const body = {
    iso8601: now.toISOString(),
    unix: Math.floor(now.getTime() / 1000),
  };

  // promo フラグはアプリからのリクエスト（固有ヘッダーあり）のときのみ返す
  if (event.headers["x-popscan-purpose"] === "quota_check") {
    body.p = process.env.POPSCAN_PROMO === "true";
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
