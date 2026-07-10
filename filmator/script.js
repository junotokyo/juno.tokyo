// Filmator LP i18n（PopScan 流儀＝textContent 差替・localStorage 保持）。
// リッチ表現（アクセント色・改行・プルクオート）は HTML 側の span/要素に固定し、文言だけを差し替える。
// 2026-07-10 英語版（en）辞書ドラフト追加。JT-260 日本語版完成後の Jun レビュー前提。
const copy = {
  ja: {
    // meta（<title> は言語不変で共通のため辞書化しない・html.lang / og:locale は setLanguage で個別更新）
    metaDescription:
      "Filmator は、カメラが生成した JPEG の色をそのままに、Lightroom Classic で決めた構図と向きのまま書き出す Mac アプリです。",
    ogDescription:
      "撮った時の色を、そのまま作品に。カメラが生成した JPEG を、Lightroom Classic のワークフローのまま書き出す Mac アプリ。",
    ogImageAlt:
      "Filmator — カメラが生成した JPEG を作品として書き出す Mac アプリ",

    // alt / aria-label 系（画像の代替テキスト・ランドマーク）
    ariaBrand: "Filmator home",
    ariaLangSwitch: "Language",
    ariaNavPrimary: "Primary",
    altBrandWordmark: "Filmator",
    ariaHeroVisual: "Filmator のアプリ画面",
    altHeroAppShot: "Filmator の画面",
    altWorkflowFilmatorIcon: "Filmator アプリアイコン",
    altFeaturesBrowse: "Filmator のブラウズ画面",
    altFeaturesEdit: "Filmator のエディット画面",
    altFeaturesExport: "Filmator の書き出し画面",
    ariaAppStore: "Mac App Store からダウンロード",
    altAppStoreBadge: "Mac App Store からダウンロード",

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
    safetyTitle: "Lightroom Classic 側には影響しません",
    safetyBody:
      "Filmator は、Lightroom Classic のカタログを読み取り専用で開きます。RAW ファイルは使用せず、対応する JPEG / HEIF / iPhone DNG 埋め込みの JPEG を参照します。元の写真ファイルにもカタログにも変更を加えないため、いつもの Lightroom Classic の管理をそのまま保てます。",

    // Features（ゴシック・3 画面 × 3 ボックス／グループ）
    featuresEyebrow: "Features",
    featuresTitle: "Filmator の機能",

    // Feature group ラベル（各スクショの左上に表示）
    groupBrowseLabel: "ブラウズ",
    groupEditLabel: "エディット",
    groupExportLabel: "書き出し",

    // Browse group
    featBrowse1Title: "カタログを読み取り専用で参照",
    featBrowse1Body:
      "Lightroom Classic のカタログ（.lrcat）を読み取り専用で開きます。カタログには一切書き込まず、Lightroom Classic 側には影響を及ぼしません。",
    featBrowse2Title: "整理した写真をそのまま探せる",
    featBrowse2Body:
      "Lightroom Classic で付けたフラグ、レーティング、カラーラベルを読み込み、Filmator 上でもフィルタリングできます。いつもの選別から、そのまま書き出しへ進めます。",
    featBrowse3Title: "JPEG / HEIF / iPhone DNG に対応",
    featBrowse3Body:
      "RAW + JPEG ペアの JPEG、単体の JPEG / HEIF、iPhone DNG 埋め込みの JPEG に対応し、表示・編集・書き出しができます。RAW 現像や PNG / TIFF には対応していません。",

    // Edit group（JPEG ベースが特徴のためカードは「カメラの色 → 構図と向き → 基本補正」の順）
    featEdit1Title: "カメラの色をそのまま",
    featEdit1Body:
      "カメラが生成した JPEG そのものを参照。FUJIFILM のフィルムシミュレーションなど、カメラの色をそのまま活かせます。",
    featEdit2Title: "構図と向きを反映",
    featEdit2Body:
      "Lightroom Classic で決めたトリミング、傾き補正、向き、Upright を、JPEG に対して自動的に反映します。",
    featEdit3Title: "必要なぶんだけ、基本補正",
    featEdit3Body:
      "ホワイトバランス、トーン、彩度などを調整できます。Core Image を使用し、軽快なライブビューや高画質な編集を行えます。",

    // Export group
    featExport1Title: "選んだ写真をすばやく書き出す",
    featExport1Body:
      "ブラウズ画面・エディット画面から写真を選んで書き出し。1 枚でも複数枚でも同じ流れで書き出せます。",
    featExport2Title: "作品作りを支える書き出しオプション",
    featExport2Body:
      "出力先、ファイル名、画質・サイズ、透かし、メタデータなど設定でき、作品作りをサポートします。",
    featExport3Title: "オフラインで完結",
    featExport3Body:
      "写真やカタログの内容を外部へ送信せず、すべての機能がオフラインで動作します。匿名の利用統計も、設定でオフにできます。",

    // Pricing（ゴシック）
    pricingEyebrow: "Plans",
    pricingTitle: "料金",
    freeLabel: "Free",
    freePrice: "¥0",
    freeBody:
      "累計 100 枚まで、機能的な制限なく写真を書き出すことができます。Lightroom Classic のカタログを開き、Filmator の機能をご利用ください。",
    proLabel: "Pro",
    proPrice: "¥3,000",
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
  en: {
    metaDescription:
      "Filmator is a Mac app that keeps the color of JPEGs your camera crafted, exporting them with the framing and orientation you set in Lightroom Classic.",
    ogDescription:
      "Turn the colors you captured into finished work. A Mac app that exports JPEGs from your Lightroom Classic workflow.",
    ogImageAlt:
      "Filmator — a Mac app for exporting the JPEGs your camera crafted as finished work",

    ariaBrand: "Filmator home",
    ariaLangSwitch: "Language",
    ariaNavPrimary: "Primary",
    altBrandWordmark: "Filmator",
    ariaHeroVisual: "The Filmator app",
    altHeroAppShot: "The Filmator app",
    altWorkflowFilmatorIcon: "Filmator app icon",
    altFeaturesBrowse: "The Filmator Browse screen",
    altFeaturesEdit: "The Filmator Edit screen",
    altFeaturesExport: "The Filmator Export screen",
    ariaAppStore: "Download on the Mac App Store",
    altAppStoreBadge: "Download on the Mac App Store",

    navConcept: "Concept",
    navWorkflow: "Workflow",
    navFeatures: "Features",
    navPricing: "Plans",
    navSupport: "Support",
    navPrivacy: "Privacy",

    // Hero（serif）
    heroTitle1: "Turn the colors you captured",
    heroTitle2: "into finished work.",
    heroLead1:
      "Filmator is a Mac app that helps you turn the JPEGs shaped by your intent and your camera's rendering into finished photographs.",
    heroLead2:
      "Use your Lightroom Classic catalog to choose your photos, apply the basic adjustments you need, and export.",
    trust1: "Lightroom Classic support",
    trust2: "Original data preserved",
    trust3: "Powered by Core Image",

    // Concept（serif・no eyebrow）
    conceptTitle1: "The expression at the moment of capture,",
    conceptTitle2: "treated as a finished work.",
    conceptBody1:
      "At the moment you press the shutter, the light before you, your intent, and your camera's rendering come together in a single JPEG. Filmator is built around the expression held in that frame. The “Film” in the name reflects the idea of treating each image like a frame of film in the digital era—and finishing it as a piece of work.",

    // Workflow
    workflowEyebrow: "Workflow",
    workflowTitle1: "Choose in Lightroom Classic,",
    workflowTitle2: "export with Filmator.",
    workflowLead:
      "Import, organize, and set your framing and orientation in Lightroom Classic. Open the same catalog in Filmator to see your folders and collections just as they are. Export the camera-rendered JPEGs with Filmator.",
    step1Title: "Manage in Lightroom Classic",
    step1Body:
      "Import your photos and manage them in your usual catalog. RAW + JPEG pairs, standalone JPEGs, and HEIF — your Lightroom Classic workflow stays the same.",
    step2Title: "Organize photos",
    step2Body: "Organize with flags, ratings, and color labels.",
    step3Title: "Set framing and orientation",
    step3Body:
      "As needed, apply cropping, straightening, orientation adjustments, and Upright corrections in Lightroom Classic.",
    step4Title: "Close and save the catalog",
    step4Body:
      "Close and save the catalog in Lightroom Classic so Filmator can pick up your changes.",
    step5Title: "Open in Filmator",
    step5Body:
      "Open the catalog in Filmator to see your organized folders and collections. Choose your photos, apply the adjustments you need, and export.",
    safetyTitle: "Your Lightroom Classic catalog stays untouched",
    safetyBody:
      "Filmator opens your Lightroom Classic catalog as read-only. It doesn't use RAW files — only supported JPEG and HEIF files, including JPEGs embedded in iPhone DNG files. Neither your original photo files nor the catalog are modified, so your usual Lightroom Classic setup stays intact.",

    // Features
    featuresEyebrow: "Features",
    featuresTitle: "What Filmator does",

    groupBrowseLabel: "Browse",
    groupEditLabel: "Edit",
    groupExportLabel: "Export",

    // Browse group
    featBrowse1Title: "Read-only catalog access",
    featBrowse1Body:
      "Filmator opens your Lightroom Classic catalog (.lrcat) as read-only. Nothing is ever written back, so Lightroom Classic remains unaffected.",
    featBrowse2Title: "Find photos as you organized them",
    featBrowse2Body:
      "Filmator reads the flags, ratings, and color labels from Lightroom Classic, so you can filter by them here, too. Move directly from your selection workflow to export.",
    featBrowse3Title: "Supports JPEG / HEIF / iPhone DNG",
    featBrowse3Body:
      "Filmator displays, edits, and exports JPEGs from RAW + JPEG pairs, standalone JPEGs and HEIF files, and JPEGs embedded in iPhone DNG files. RAW development, PNG, and TIFF are not supported.",

    // Edit group
    featEdit1Title: "Your camera's color, kept as-is",
    featEdit1Body:
      "Filmator works with the JPEG your camera generated. FUJIFILM Film Simulation and other in-camera color renderings come through unchanged.",
    featEdit2Title: "Framing and orientation carry over",
    featEdit2Body:
      "Cropping, straightening, orientation, and Upright set in Lightroom Classic are applied automatically to the JPEG.",
    featEdit3Title: "Basic adjustments, only what you need",
    featEdit3Body:
      "Adjust white balance, tone, saturation, and more. Powered by Core Image for a responsive live view and high-quality editing.",

    // Export group
    featExport1Title: "Export your chosen photos, fast",
    featExport1Body:
      "Pick photos from the Browse or Edit screen and export. Whether you're exporting one photo or many, the process is the same.",
    featExport2Title: "Export options that support your craft",
    featExport2Body:
      "Set the destination, file name, quality and size, watermark, metadata, and more to suit your final output.",
    featExport3Title: "Fully offline",
    featExport3Body:
      "Filmator works offline. No photo or catalog data is sent anywhere, and anonymous usage statistics can be turned off in Settings.",

    // Plans
    pricingEyebrow: "Plans",
    pricingTitle: "Plans",
    freeLabel: "Free",
    freePrice: "$0",
    freeBody:
      "Export up to 100 photos in total, with no feature restrictions. Open your Lightroom Classic catalog and try Filmator.",
    proLabel: "Pro",
    proPrice: "$19.99",
    proBody:
      "A one-time purchase removes the export limit. Choose the Pro plan if you work with a large volume of photos.",

    // Support（FAQ）
    supportEyebrow: "Support",
    supportTitle: "Support",
    supportLead:
      "Frequently asked questions about how Filmator works, supported formats, and pricing.",
    faqQ0: "What does 'Filmator' mean?",
    faqA0:
      "Filmator is a coined name — Film + -ator. It is not about applying a film look. It reflects a different idea: treating the JPEG that holds the light, intent, and camera rendering from the moment of capture as the digital-era equivalent of a frame of film.",
    faqQ1: "Does Filmator write to the Lightroom Classic catalog?",
    faqA1:
      "No. Filmator opens the catalog as read-only and never writes to it. Your Lightroom Classic catalog remains unchanged.",
    faqQ2: "Does Filmator use RAW files?",
    faqA2:
      "No. Filmator doesn't use RAW files — it works with supported JPEG, HEIF, and JPEG embedded in iPhone DNG. It's not a RAW development app.",
    faqQ3: "Are my original photo files changed?",
    faqA3:
      "No. Filmator doesn't modify your original files directly. Filmator stores edits separately and writes them only to newly exported files.",
    faqQ4: "Are Lightroom Classic's develop settings applied?",
    faqA4:
      "Only the composition and orientation-related settings — cropping, straightening, orientation, and Upright — are applied. Brightness, color, and other develop parameters are not applied.",
    faqQ5: "Can I edit composition or straightening inside Filmator?",
    faqA5:
      "No. Composition and orientation are set in Lightroom Classic. Filmator reads that information from the catalog and applies it at export.",
    faqQ6: "What kinds of photos can I export?",
    faqA6:
      "Filmator supports JPEGs from RAW + JPEG pairs, standalone JPEGs, HEIF files, and JPEGs embedded in iPhone DNG files. RAW development, PNG, and TIFF are not supported.",
    faqQ7: "Can I use Filmator offline?",
    faqA7:
      "Yes. Every feature works offline. Nothing from your photos or catalog is sent anywhere.",
    faqQ8: "How can I get in touch?",
    faqA8:
      "For questions, bug reports, or privacy inquiries, please contact us by email.",

    // Privacy
    privacyEyebrow: "Privacy",
    privacyTitle: "Privacy Policy",
    privacyLead:
      "Filmator does not send the contents of your photos or catalog anywhere.",
    policySummaryTitle: "About photo and catalog data",
    policySummaryBody:
      "Filmator processes photo files (RAW, JPEG, HEIF) and your Lightroom Classic catalog on your device. The catalog is opened as read-only; nothing is ever written back. The contents of your photos or images, your edits, file names, and catalog data (folders, collections, ratings, capture dates, camera models, and so on) are never sent to a server.",
    policyTelemetryTitle: "Usage and diagnostics",
    policyTelemetryBody:
      "To improve quality and understand feature needs, Filmator may collect anonymous usage statistics and diagnostics — such as launches, catalog opens, edits, export counts, and errors. These never include the contents of your photos, images, or catalog, nor file names, user account information, or advertising identifiers. You can turn off usage-data transmission in the app's Settings. Filmator works offline as well.",
    policyPromoTitle: "Promotion codes",
    policyPromoBody:
      "When you use a promotion code, the code you enter is sent to a verification endpoint. Promotion codes do not identify individuals.",
    policyTrackingTitle: "About tracking",
    policyTrackingBody:
      "Filmator does not use third-party tracking SDKs and does not track users across other apps or websites.",
    policyContactTitle: "Contact",
    policyContactBody:
      "For privacy inquiries, please use the email address listed in the Support section.",
    lastUpdated: "Last updated: June 28, 2026",

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
  const activeLang = lang in copy ? lang : "ja";
  document.documentElement.lang = activeLang;

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

  // alt / aria-label の i18n（data-i18n-alt / data-i18n-aria 属性の値を辞書キーとして解決）
  document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
    const key = el.dataset.i18nAlt;
    if (dictionary[key] !== undefined) el.setAttribute("alt", dictionary[key]);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const key = el.dataset.i18nAria;
    if (dictionary[key] !== undefined) el.setAttribute("aria-label", dictionary[key]);
  });

  // meta タグ（description / og:description / og:image:alt / twitter:description / og:locale）
  const metaMap = [
    { selector: 'meta[name="description"]', key: "metaDescription" },
    { selector: 'meta[property="og:description"]', key: "ogDescription" },
    { selector: 'meta[property="og:image:alt"]', key: "ogImageAlt" },
    { selector: 'meta[name="twitter:description"]', key: "ogDescription" },
  ];
  metaMap.forEach(({ selector, key }) => {
    const el = document.querySelector(selector);
    if (el && dictionary[key] !== undefined) el.setAttribute("content", dictionary[key]);
  });
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  if (ogLocale) ogLocale.setAttribute("content", activeLang === "en" ? "en_US" : "ja_JP");

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
