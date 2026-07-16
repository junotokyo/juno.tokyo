// Vercel Edge Middleware: juno.tokyo の管理系（admin 画面 + 管理 API）に Basic 認証をかける。
// PopScan・Filmator の admin を同一 realm "juno.tokyo Admin" で保護する＝
// ブラウザは admin 画面ログイン後、同一 realm の管理 API へ Authorization ヘッダを自動 replay する
// （/popscan/admin/ ↔ /filmator/admin/ も同一 user/pass で横断ログイン可）。
//
// 🔴 matcher には rewrite 後の公開パス（/popscan/* /filmator/*）に加えて
// rewrite 前の Function 直アクセスパス（/api/*）も列挙する。
// Vercel middleware は incoming request path で評価するため、
// /api/popscan-manage-promos 等を直接叩かれると matcher 不一致で middleware を迂回し
// handler に到達してしまう（handler は「認証は middleware で完結」設計）。

export const config = {
  matcher: [
    // PopScan: 公開（rewrite 後）パス
    '/popscan/admin',
    '/popscan/admin/(.*)',
    '/popscan/admin-stats',
    '/popscan/admin-error-log',
    '/popscan/set-promo',
    '/popscan/manage-promos',
    // PopScan: Function 直アクセス（rewrite 前）パス
    '/api/popscan-set-promo',
    '/api/popscan-manage-promos',
    '/api/popscan-admin-stats',
    '/api/popscan-admin-error-log',
    // Filmator: 公開パス（/filmator/set-promo は実装しない＝matcher にも入れない）
    '/filmator/admin',
    '/filmator/admin/(.*)',
    '/filmator/admin-stats',
    '/filmator/admin-error-log',
    // Filmator: Function 直アクセスパス
    '/api/filmator-admin-stats',
    '/api/filmator-admin-error-log',
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
