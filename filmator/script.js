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
    heroTitle2: "そのまま作品に",
    heroLead1:
      "Filmator は、撮影者の意図とカメラの絵作りが込められた JPEG を活かして、作品として仕上げる Mac 用アプリです。",
    heroLead2:
      "Lightroom Classic のカタログを使って写真を選び、必要な基本補正を加えて書き出せます。",
    trust1: "Lightroom Classic 対応",
    trust2: "元データ保持",
    trust3: "Core Image 処理",

    // Concept（明朝・アイブローなし）
    conceptTitle1: "撮影時の表現を、",
    conceptTitle2: "作品として扱う",
    conceptBody1:
      "シャッターを切った瞬間の光、意図、カメラの絵作り。それらが一つになって、JPEG として記録されています。Filmator が向き合うのは、その一枚に込められた撮影時の表現。名前に込めた“Film”は、その一枚をデジタル時代のフィルムのように扱い、作品として仕上げるという考え方を表しています。",

    // Workflow（ゴシック）
    workflowEyebrow: "Workflow",
    workflowTitle1: "Lightroom Classic で選び、",
    workflowTitle2: "Filmator で書き出す",
    workflowLead:
      "Lightroom Classic で写真を読み込み、整理し、構図と向きを整えます。Filmator でそのカタログを開くと、フォルダやコレクションがそのまま表示されます。カメラが生成した JPEG を元に書き出せます。",
    step1Title: "Lightroom Classic で管理",
    step1Body:
      "写真を読み込み、いつものカタログで管理します。RAW + JPEG のペアも、単体 JPEG や HEIF も、Lightroom Classic 側の流れはそのままです。",
    step2Title: "写真を整理",
    step2Body: "フラグ、レーティング、カラーラベルで、写真を整理します。",
    step3Title: "構図と向きを決める",
    step3Body:
      "必要に応じて、トリミング、傾き、向き、Upright を Lightroom Classic 側で設定します。",
    step4Title: "カタログを閉じて保存",
    step4Body:
      "変更内容を Filmator で読み込めるように、Lightroom Classic でカタログを閉じて保存します。",
    step5Title: "Filmator で開く",
    step5Body:
      "Filmator でカタログを開くと、整理したフォルダやコレクションが反映されます。そこから写真を選び、必要な補正を加えて書き出します。",
    // Workflow flow diagram（試作）
    flowLrCLabel: "Lightroom Classic",
    flowStep1Label: "管理・整理",
    flowStep2Label: "写真を整理",
    flowStep3Label: "構図と向き",
    flowStep4Label: "保存",
    flowStep5Label: "で開く",

    safetyTitle: "Lightroom Classic 側には影響しません",
    safetyBody:
      "Filmator は、Lightroom Classic のカタログを読み取り専用で開きます。RAW ファイルは使用せず、対応する JPEG / HEIF / iPhone DNG 埋め込みの JPEG を参照します。元の写真ファイルにもカタログにも変更を加えないため、いつもの Lightroom Classic の管理をそのまま保てます。",

    // Features（ゴシック・3 画面 × 3 ボックス／グループ）
    featuresEyebrow: "Features",
    featuresTitle: "Filmator の機能",

    // Browse group
    featBrowse1Title: "カタログを読み取り専用で参照",
    featBrowse1Body:
      "Lightroom Classic のカタログ（.lrcat）を読み取り専用で開きます。あなたのカタログには一切書き込まず、Lightroom Classic 側から見ても何も変わりません。",
    featBrowse2Title: "整理した写真をそのまま探せる",
    featBrowse2Body:
      "Lightroom Classic で付けたフラグ、レーティング、カラーラベルを読み込み、Filmator 上でもフィルタリングできます。いつもの選別から、そのまま書き出しへ進めます。",
    featBrowse3Title: "JPEG / HEIF / iPhone DNG に対応",
    featBrowse3Body:
      "RAW + JPEG ペアの JPEG、単体の JPEG / HEIF、iPhone DNG 埋め込みの JPEG に対応し、表示・編集・書き出しができます。RAW 現像や PNG / TIFF には対応していません。",

    // Edit group
    featEdit1Title: "構図と向きを反映",
    featEdit1Body:
      "Lightroom Classic で決めたトリミング、傾き補正、向き、Upright を、JPEG の書き出しに反映します。カタログ上で整えた構図を活かせます。",
    featEdit2Title: "カメラの色をそのまま",
    featEdit2Body:
      "カメラが生成した JPEG そのものを参照。FUJIFILM のフィルムシミュレーションなど、カメラの色をそのまま活かせます。Lightroom Classic での現像パラメータは反映しません。",
    featEdit3Title: "必要なぶんだけ、基本補正",
    featEdit3Body:
      "明るさ、コントラスト、ハイライト、シャドウ、ホワイトバランス、彩度などを調整できます。ライブプレビューが軽快に追随し、Apple の写真編集エンジンで高画質に処理します。",

    // Export group
    featExport1Title: "選んだ写真をすばやく書き出す",
    featExport1Body:
      "ブラウズ画面・エディット画面から選んで書き出し。1 枚でも複数枚でも同じ流れで書き出せます。",
    featExport2Title: "作品作りを支える書き出しオプション",
    featExport2Body:
      "出力先、ファイル名、品質、透かし、メタデータなど設定でき、作品作りをサポートします。",
    featExport3Title: "オフラインで完結",
    featExport3Body:
      "写真やカタログの内容を外部へ送信せず、すべての機能がオフラインで動作します。匿名の利用統計も、設定でオフにできます。",

    // Pricing（ゴシック）
    pricingEyebrow: "Plans",
    pricingTitle: "料金",
    freeLabel: "無料プラン",
    freeBody:
      "書き出し無料枠の範囲で、機能的な制限なく写真を書き出すことができます。Lightroom Classic のカタログを開き、Filmator の機能をお楽しみください。",
    proLabel: "Pro プラン\n¥⚪︎⚪︎（買い切り）",
    proBody:
      "一度の購入で、書き出し枚数の制限が無くなります。多くの写真を取り扱う場合は、Pro プランをご利用ください。",

    // Support（ゴシック・旧 FAQ・9 問）
    supportEyebrow: "Support",
    supportTitle: "サポート",
    supportLead: "Filmator の使い方、対応形式、料金などについて、よくある質問をまとめました。",
    faqQ0: "Filmator とはどういう意味ですか？",
    faqA0:
      "Filmator（フィルメーター）は、Film + -ator から作った名前です。フィルム風の加工ではなく、撮影した時の光やカメラの絵作りが記録された JPEG に、デジタル時代のフィルムのような価値を見出す考え方を表しています。",
    faqQ1: "Lightroom Classic のカタログに書き込みますか？",
    faqA1:
      "いいえ。Filmator はカタログを読み取り専用で開き、一切書き込みません。Lightroom Classic 側から見ても、カタログの内容は変わりません。",
    faqQ2: "RAW ファイルは使いますか？",
    faqA2:
      "いいえ。Filmator は RAW ファイルを使用せず、対応する JPEG / HEIF / iPhone DNG 埋め込みの JPEG を参照します。RAW 現像を行うアプリではありません。",
    faqQ3: "元の写真ファイルは変更されますか？",
    faqA3:
      "いいえ。Filmator は元の写真ファイルを直接変更しません。編集内容は Filmator 上の設定として扱い、書き出し時に新しいファイルとして出力します。",
    faqQ4: "Lightroom Classic の現像設定は反映されますか？",
    faqA4:
      "反映するのは、トリミング、傾き、向き、Upright などの構図・向きに関わる情報です。明るさや色などの現像パラメータは反映しません。",
    faqQ5: "Filmator で構図や傾きを編集できますか？",
    faqA5:
      "いいえ。構図や向きは Lightroom Classic 側で設定します。Filmator は、カタログに保存されたそれらの情報を読み込み、書き出しに反映します。",
    faqQ6: "どんな写真を書き出せますか？",
    faqA6:
      "RAW + JPEG ペアの JPEG、単体の JPEG、HEIF、iPhone DNG 埋め込みの JPEG に対応しています。RAW 現像や PNG / TIFF の書き出しには対応していません。",
    faqQ7: "オフラインで使えますか？",
    faqA7:
      "はい。すべての機能がオフラインで動作します。写真やカタログの内容を外部へ送信することはありません。",
    faqQ8: "問い合わせ先はありますか？",
    faqA8:
      "ご質問、不具合のご報告、プライバシーに関するお問い合わせは、メールでご連絡ください。",

    // Privacy（ゴシック・本文。真実の源 = Filmator/docs/09 §6・JT-250）
    privacyEyebrow: "Privacy",
    privacyTitle: "プライバシーポリシー",
    privacyLead: "Filmator は、写真とカタログの内容を外部へ送信しません。",
    policySummaryTitle: "写真とカタログのデータについて",
    policySummaryBody:
      "Filmator は、写真ファイル（RAW・JPEG・HEIF）と Lightroom Classic のカタログを、お使いのデバイス内で処理します。カタログは読み取り専用で参照し、書き込みは一切行いません。写真や画像の内容、編集結果、ファイル名、カタログの内容（フォルダ・コレクション・レーティング・撮影日時・カメラ機種など）をサーバーへ送信することはありません。",
    policyTelemetryTitle: "利用状況・診断情報",
    policyTelemetryBody:
      "アプリの品質改善と機能ニーズ把握のため、アプリ起動、カタログを開く、編集の利用、書き出しの回数・枚数、エラー発生状況などの匿名の利用統計・診断情報を収集する場合があります。これらには、写真、画像・カタログの内容、ファイル名、ユーザー登録情報、広告識別子は含まれません。利用状況データの送信は、アプリの設定でオフにできます。オフラインでも Filmator は利用できます。",
    policyPromoTitle: "プロモーションコード",
    policyPromoBody:
      "プロモーションコードを利用する場合のみ、入力されたコードを検証用エンドポイントへ送信します。コードは個人を特定するものではありません。",
    policyTrackingTitle: "トラッキングについて",
    policyTrackingBody:
      "Filmator は、第三者のトラッキング SDK を使用せず、ユーザーを他社のアプリや Web サイトをまたいで追跡することはありません。",
    policyContactTitle: "お問い合わせ",
    policyContactBody:
      "プライバシーに関するお問い合わせは、サポートセクションに記載のメールアドレスまでご連絡ください。",
    lastUpdated: "最終更新日: 2026年6月28日",

    footerCopyright: "© 2026 JUNO Tokyo",
  },
};

const buttons = document.querySelectorAll("[data-lang]");
const translatable = document.querySelectorAll("[data-i18n]");
const typographyTokenPattern = /[A-Za-z0-9][A-Za-z0-9.+/-]*|[ぁ-んァ-ヶー]+/g;
const latinTokenPattern = /^[A-Za-z0-9]/;

function renderTextWithTypographySpans(element, text) {
  element.replaceChildren();

  let cursor = 0;
  for (const match of text.matchAll(typographyTokenPattern)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      element.append(document.createTextNode(text.slice(cursor, start)));
    }

    const span = document.createElement("span");
    span.className = latinTokenPattern.test(match[0]) ? "latin-token" : "kana-token";
    span.textContent = match[0];
    element.append(span);
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    element.append(document.createTextNode(text.slice(cursor)));
  }
}

function setLanguage(lang) {
  const dictionary = copy[lang] || copy.ja;
  document.documentElement.lang = lang in copy ? lang : "ja";

  translatable.forEach((element) => {
    const key = element.dataset.i18n;
    if (dictionary[key] !== undefined) {
      renderTextWithTypographySpans(element, dictionary[key]);
    }
  });

  document.querySelectorAll("[data-i18n-src-ja]").forEach((el) => {
    const src = lang === "en" ? el.dataset.i18nSrcEn : el.dataset.i18nSrcJa;
    if (src) el.src = src;
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

// 起動時に localStorage の保存値を復元（en 辞書未追加でも画像 src だけは切り替わる）。
setLanguage(localStorage.getItem("filmator-language") || "ja");
