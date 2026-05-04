exports.handler = async () => {
  const now = new Date();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({
      iso8601: now.toISOString(),
      unix: Math.floor(now.getTime() / 1000),
    }),
  };
};
