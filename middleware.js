// Vercel Edge Middleware: juno.tokyo の管理系（admin 画面 + 管理 API）に Basic 認証をかける。
// PopScan・Filmator の admin を同一 realm "juno.tokyo Admin" で保護する＝
// ブラウザは admin 画面ログイン後、同一 realm の管理 API へ Authorization ヘッダを自動 replay する
// （/popscan/admin/ ↔ /filmator/admin/ も同一 user/pass で横断ログイン可）。

export const config = {
  matcher: [
    // PopScan
    '/popscan/admin',
    '/popscan/admin/(.*)',
    '/popscan/admin-stats',
    '/popscan/admin-error-log',
    '/popscan/set-promo',
    '/popscan/manage-promos',
    // Filmator（/filmator/set-promo は実装しない＝matcher にも入れない）
    '/filmator/admin',
    '/filmator/admin/(.*)',
    '/filmator/admin-stats',
    '/filmator/admin-error-log',
    '/filmator/manage-promos',
  ],
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
      'WWW-Authenticate': 'Basic realm="juno.tokyo Admin"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
