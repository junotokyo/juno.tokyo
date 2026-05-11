// Vercel Edge Middleware: PopScan 管理系（admin 画面 + 管理 API）に Basic 認証をかける
// 認証成功 → そのまま該当ルートを配信
// 認証失敗 → 401 + WWW-Authenticate (ブラウザ標準のログインダイアログを表示)
//
// admin 画面と管理 API は同一 origin・同一 realm のため、ブラウザは admin 画面ログイン後に
// /popscan/set-promo, /popscan/manage-promos へも Authorization ヘッダを自動 replay する。

export const config = {
  matcher: [
    '/popscan/admin',
    '/popscan/admin/(.*)',
    '/popscan/set-promo',
    '/popscan/manage-promos',
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
      'WWW-Authenticate': 'Basic realm="PopScan Admin"',
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
