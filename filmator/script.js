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
      "Filmatorは、撮影者の意図とカメラの絵作りが込められたJPEGを活かして、作品として仕上げるMac用アプリです。",
    heroLead2:
      "Lightroom Classicのカタログを使って写真を選び、必要な基本補正を加えて書き出せます。",
    trust1: "Lightroom Classic対応",
    trust2: "元データ保持",
    trust3: "Core Image処理",

    // Concept（明朝・アイブローなし）
    conceptTitle1: "撮影時の表現を、",
    conceptTitle2: "作品として扱う。",
    conceptBody1:
      "シャッターを切った瞬間の光、意図、カメラの絵作り。それらが一つになって、JPEGとして記録されています。Filmatorが向き合うのは、その一枚に込められた撮影時の表現。名前に込めた“Film”は、その一枚をデジタル時代のフィルムのように扱い、作品として仕上げるという考え方を表しています。",

    // Workflow（ゴシック）
    workflowEyebrow: "Workflow",
    workflowTitle1: "Lightroom Classicで選び、",
    workflowTitle2: "Filmatorで書き出す。",
    workflowLead:
      "Lightroom Classicで写真を読み込み、整理し、構図と向きを整えます。Filmatorでそのカタログを開くと、フォルダやコレクションがそのまま表示されます。カメラが生成したJPEGを元に書き出せます。",
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
      "Filmatorでカタログを開くと、整理したフォルダやコレクションが反映されます。そこから写真を選び、必要な補正を加えて書き出します。",
    safetyTitle: "Lightroom Classic側には影響しません。",
    safetyBody:
      "Filmatorは、Lightroom Classicのカタログを読み取り専用で開きます。RAWファイルは使用せず、対応するJPEG／HEIF／iPhone DNG埋め込みのJPEGを参照します。元の写真ファイルにもカタログにも変更を加えないため、いつものLightroom Classicの管理をそのまま保てます。",
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
    feat6Title: "JPEG／HEIF／iPhone DNGに対応",
    feat6Body:
      "RAW+JPEGペアのJPEG、単体のJPEG／HEIF、iPhone DNG埋め込みのJPEGに対応し、表示・編集・書き出しができます。RAW現像やPNG／TIFFには対応していません。",
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
      "無料枠の範囲で機能的な制限はなく写真を書き出すことができます。Lightroom Classicのカタログを開き、Filmatorの機能をお楽しみください。",
    proLabel: "Proプラン（買い切り ¥⚪︎⚪︎）",
    proBody:
      "一度の購入で、書き出し枚数の制限が無くなります。多くの写真を取り扱う場合は、Proプランをご利用ください。",

    // Support（ゴシック・旧 FAQ・9 問）
    supportEyebrow: "Support",
    supportTitle: "サポート",
    supportLead: "Filmator の使い方、対応形式、料金などについて、よくある質問をまとめました。",
    faqQ0: "Filmatorとはどういう意味ですか？",
    faqA0:
      "Filmator（フィルメーター）は、Film + -ator から作った名前です。フィルム風の加工ではなく、撮影した時の光やカメラの絵作りが記録されたJPEGに、デジタル時代のフィルムのような価値を見出す考え方を表しています。",
    faqQ1: "Lightroom Classicのカタログに書き込みますか？",
    faqA1:
      "いいえ。Filmatorはカタログを読み取り専用で開き、一切書き込みません。Lightroom Classic側から見ても、カタログの内容は変わりません。",
    faqQ2: "RAWファイルは使いますか？",
    faqA2:
      "いいえ。FilmatorはRAWファイルを使用せず、対応するJPEG／HEIF／iPhone DNG埋め込みのJPEGを参照します。RAW現像を行うアプリではありません。",
    faqQ3: "元の写真ファイルは変更されますか？",
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
      "RAW+JPEGペアのJPEG、単体のJPEG、HEIF、iPhone DNG埋め込みのJPEGに対応しています。RAW現像やPNG／TIFFの書き出しには対応していません。",
    faqQ7: "オフラインで使えますか？",
    faqA7:
      "はい。すべての機能がオフラインで動作します。写真やカタログの内容を外部へ送信することはありません。",
    faqQ8: "問い合わせ先はありますか？",
    faqA8:
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
