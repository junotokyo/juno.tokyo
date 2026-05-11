// Vercel Edge Middleware: /admin/* に Basic 認証をかける
// 認証成功 → そのまま admin/index.html を配信
// 認証失敗 → 401 + WWW-Authenticate (ブラウザ標準のログインダイアログを表示)

export const config = {
  matcher: ['/admin', '/admin/(.*)'],
};

export default function middleware(request) {
  const expectedPass = process.env.ADMIN_BASIC_PASS;
  if (!expectedPass) {
    return new Response('Server misconfigured: ADMIN_BASIC_PASS is not set', { status: 503 });
  }

  const auth = request.headers.get('authorization');
  const expected = 'Basic ' + btoa(`admin:${expectedPass}`);
  if (auth === expected) return; // 認証成功 → 通過

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="PopScan Admin"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
