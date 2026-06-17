// Filmator LP i18n（PopScan 流儀＝textContent 差替・localStorage 保持）。
// リッチ表現（アクセント色・改行・プルクオート）は HTML 側の span/要素に固定し、文言だけを差し替える。
// 英語版（en）は日本語の構成・文言が確定してから追加する（現在は日本語のみ・言語スイッチは HTML 側で非表示）。
const copy = {
  ja: {
    navConcept: "コンセプト",
    navWorkflow: "使い方",
    navFeatures: "機能",
    navPricing: "料金",
    navSupport: "サポート",
    navPrivacy: "プライバシー",

    // Hero（明朝）
    heroTitle1: "撮った色を、",
    heroTitle2: "そのまま作品に。",
    heroLead1:
      "カメラが生成したJPEGには、撮った時の色と光、撮影者の意図がそのまま記録されています。Filmatorは、RAWからの現像ではなく、その一枚を使って作品として仕上げる、Mac用アプリです。",
    heroLead2:
      "RAW+JPEGの写真はLightroom Classicで整理して、そのカタログを利用してJPEGの基本補正・書き出しを行えます。",
    trust1: "Lightroom Classic対応",
    trust2: "カタログは読み取り専用",
    trust3: "オフライン動作",

    // Concept（明朝・アイブローなし）
    conceptTitle1: "その場の光が、",
    conceptTitle2: "一枚に残っている。",
    conceptBody1:
      "RAWは、あとから仕上げ直すための素材。JPEGは、カメラと撮影者がその場で決めた色を残す一枚です。露出、ホワイトバランス、カメラの絵作りまで含めて、撮影した時の手触りがそこにあります。",
    conceptPull: "その時にしか撮れなかった色だからこそ、その一枚には価値がある。",
    conceptBody2:
      "Filmatorという名前の“Film”は、フィルム風の加工を意味しません。カメラ生成の一枚に、デジタル時代のフィルムのような価値を見出す。その考えから生まれた名前です。",
    conceptBody3:
      "Filmatorは、その価値を保ったまま、作品として仕上げるためのツールです。",

    // Workflow（ゴシック）
    workflowEyebrow: "Workflow",
    workflowTitle1: "Lightroom Classicで選び、",
    workflowTitle2: "Filmatorで書き出す。",
    workflowLead:
      "いつものようにLightroom Classicで写真を読み込み、整理し、必要なら構図と向きを整える。カタログを閉じて保存したら、Filmatorでそのカタログを開き、カメラが生成したJPEGを書き出せます。",
    step1Title: "Lightroom Classicで管理",
    step1Body:
      "写真を読み込み、いつものカタログで管理します。RAW+JPEGのペアも、単体JPEGやHEIFも、Lightroom Classic側の流れはそのままです。",
    step2Title: "写真を整理",
    step2Body: "フラグ、レーティング、カラーラベルで、写真を整理します。",
    step3Title: "構図と向きを決める",
    step3Body:
      "必要に応じて、トリミング、傾き、向き、UprightをLightroom Classic側で設定します。",
    step4Title: "カタログを閉じて保存",
    step4Body:
      "変更内容をFilmatorで読み込めるように、Lightroom Classicでカタログを閉じて保存します。",
    step5Title: "Filmatorで開く",
    step5Body:
      "Filmatorでカタログを開くと、整理した内容が反映されます。そこから写真を選び、必要な補正を加えて書き出します。",
    safetyTitle: "Lightroom Classic側には影響しません。",
    safetyBody:
      "Filmatorは、Lightroom Classicのカタログを読み取り専用で開きます。RAWファイルは使用せず、対応するJPEG／HEIFだけを参照します。元の写真ファイルにもカタログにも変更を加えないため、いつものLightroom Classicの管理をそのまま保てます。",
    shotApp: "アプリ画面のスクリーンショット（準備中 / 2560×1600）",

    // Features（ゴシック・8 カード・番号なし）
    featuresEyebrow: "Features",
    featuresTitle: "Filmatorでできること",
    shotFeature: "編集・書き出し画面のスクリーンショット（準備中 / 2560×1600）",
    feat1Title: "カタログを読み取り専用で参照",
    feat1Body:
      "Lightroom Classicのカタログ（.lrcat）を読み取り専用で開きます。あなたのカタログには一切書き込まず、Lightroom Classic側から見ても何も変わりません。",
    feat2Title: "整理した写真をそのまま探せる",
    feat2Body:
      "Lightroom Classicで付けたフラグ、レーティング、カラーラベルを読み込み、Filmator上でもフィルタリングできます。いつもの選別から、そのまま書き出しへ進めます。",
    feat3Title: "構図と向きを反映",
    feat3Body:
      "Lightroom Classicで決めたトリミング、傾き補正、向き、Uprightを、JPEGの書き出しに反映します。カタログ上で整えた構図を活かせます。",
    feat4Title: "カメラの色をそのまま",
    feat4Body:
      "カメラが生成したJPEGそのものを参照。FUJIFILMのフィルムシミュレーションなど、カメラの色をそのまま活かせます。Lightroom Classicでの現像パラメータは転用しません。",
    feat5Title: "必要なぶんだけ、基本補正",
    feat5Body:
      "明るさ、コントラスト、ハイライト、シャドウ、ホワイトバランス、彩度などを調整できます。Appleの写真編集エンジンを使って高画質に処理し、Lightroom Classicに慣れた人にも使いやすい操作感に整えています。",
    feat6Title: "JPEG／HEIFに対応",
    feat6Body:
      "RAW+JPEGペアのJPEG、単体のJPEG／HEIFに対応し、表示・編集・書き出しができます。RAW現像やPNG／TIFFには対応していません。",
    feat7Title: "軽快なプレビューと書き出し",
    feat7Body:
      "選んで、確認して、書き出す。ライブプレビューは調整に合わせて軽快に追随し、複数の写真もまとめて書き出せます。",
    feat8Title: "オフラインで完結",
    feat8Body:
      "写真やカタログの内容を外部へ送信せず、すべての機能がオフラインで動作します。匿名の利用統計も、設定でオフにできます。",

    // Pricing（ゴシック）
    pricingEyebrow: "Plans",
    pricingTitle: "料金",
    freeLabel: "無料",
    freeBody:
      "リリース時に、無料で試せる書き出し枚数を設定する予定です。日数制限はありません。",
    proLabel: "Pro（買い切り）",
    proBody:
      "一度の購入で、書き出し枚数の制限が外れます。サブスクリプションではありません。価格はリリース前にご案内します。",

    // Support（ゴシック・旧 FAQ・9 問）
    supportEyebrow: "Support",
    supportTitle: "サポート",
    supportLead: "Filmator の使い方、対応形式、料金などについて、よくある質問をまとめました。",
    faqQ1: "Lightroom Classicのカタログに書き込みますか？",
    faqA1:
      "いいえ。Filmatorはカタログを読み取り専用で開き、一切書き込みません。Lightroom Classic側から見ても、カタログの内容は変わりません。",
    faqQ2: "RAWファイルは使いますか？",
    faqA2:
      "いいえ。FilmatorはRAWファイルを使用せず、対応するJPEG／HEIFを参照します。RAW現像を行うアプリではありません。",
    faqQ3: "元のJPEGやHEIFは変更されますか？",
    faqA3:
      "いいえ。Filmatorは元の写真ファイルを直接変更しません。編集内容はFilmator上の設定として扱い、書き出し時に新しいファイルとして出力します。",
    faqQ4: "Lightroom Classicの現像設定は反映されますか？",
    faqA4:
      "反映するのは、トリミング、傾き、向き、Uprightなどの構図・向きに関わる情報です。明るさや色などの現像パラメータは転用しません。",
    faqQ5: "Filmatorで構図や傾きを編集できますか？",
    faqA5:
      "いいえ。構図や向きはLightroom Classic側で設定します。Filmatorは、カタログに保存されたそれらの情報を読み込み、書き出しに反映します。",
    faqQ6: "どんな写真を書き出せますか？",
    faqA6:
      "RAW+JPEGペアのJPEG、単体のJPEG、HEIFに対応しています。RAW現像やPNG／TIFFの書き出しには対応していません。",
    faqQ7: "オフラインで使えますか？",
    faqA7:
      "はい。すべての機能がオフラインで動作します。写真やカタログの内容を外部へ送信することはありません。",
    faqQ8: "料金はどうなっていますか？",
    faqA8:
      "無料で試せる書き出し枚数を設定する予定です。Proは買い切りで、サブスクリプションではありません。価格はリリース前にご案内します。",
    faqQ9: "問い合わせ先はありますか？",
    faqA9:
      "ご質問、不具合のご報告、プライバシーに関するお問い合わせは、メールでご連絡ください。",

    // Privacy（ゴシック・要約＋器）
    privacyEyebrow: "Privacy",
    privacyTitle: "プライバシー",
    privacyLead: "Filmatorは、写真とカタログの内容を外部へ送信しません。",
    privacyP1Title: "写真・カタログ内容を送信しない",
    privacyP1Body:
      "画像、ファイル名、パス、フォルダ名、レーティングなど、写真やカタログに含まれる内容を外部へ送信しません。",
    privacyP2Title: "個人を識別しない",
    privacyP2Body:
      "個人を特定する識別子や端末識別子を持たず、第三者トラッキングSDKも使用しません。",
    privacyP3Title: "オフラインで動作",
    privacyP3Body:
      "すべての機能がオフラインで動作します。匿名の利用統計は、設定でオフにできます。",
    privacyNote: "プライバシーポリシーの全文は、公開時にこのページに掲載します。",

    footerCopyright: "© 2026 JUNO Tokyo",
  },
};

const buttons = document.querySelectorAll("[data-lang]");
const translatable = document.querySelectorAll("[data-i18n]");

function setLanguage(lang) {
  const dictionary = copy[lang] || copy.ja;
  document.documentElement.lang = lang in copy ? lang : "ja";

  translatable.forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key] !== undefined) {
      element.textContent = dictionary[key];
    }
  });

  buttons.forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  localStorage.setItem("filmator-language", lang);
}

buttons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

// 現在は日本語のみ（en 未作成）。保存値が en でも copy.ja にフォールバックする。
setLanguage("ja");
