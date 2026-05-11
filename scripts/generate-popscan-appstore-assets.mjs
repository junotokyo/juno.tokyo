import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'popscan/assets/app-store-documents');
const svgDir = path.join(outDir, 'svg');
const thumbDir = path.join(outDir, 'thumbs');
const aiMemoDir = path.join(outDir, 'ai-memos');
const aiAirmailDir = path.join(outDir, 'ai-airmail');
const aiBusinessDir = path.join(outDir, 'ai-business-documents');
const magick = '/opt/homebrew/bin/magick';
const defaultSvgFont = '/System/Library/Fonts/Supplemental/Arial Unicode.ttf';
const templatePhotoList =
  '/Users/jokamoto/Library/Mobile Documents/4R6749AYRE~com~pixelmatorteam~pixelmator/Documents/PopScan/IMG_1063.png';

const sans = 'Avenir Next, Hiragino Sans, Helvetica Neue, Arial, sans-serif';
const serif = 'Georgia, Hiragino Mincho ProN, Yu Mincho, serif';
const mono = 'SF Mono, Menlo, ui-monospace, monospace';
const hand = 'Klee, Hannotate SC, Marker Felt, Bradley Hand, cursive';

mkdirSync(outDir, { recursive: true });
mkdirSync(svgDir, { recursive: true });
mkdirSync(thumbDir, { recursive: true });
mkdirSync(aiMemoDir, { recursive: true });
mkdirSync(aiAirmailDir, { recursive: true });
mkdirSync(aiBusinessDir, { recursive: true });

function run(args, label) {
  const result = spawnSync(magick, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${label} failed\n${result.stderr || result.stdout}`);
  }
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function commonDefs(seed = 4) {
  return `
  <filter id="paperNoise" x="-10%" y="-10%" width="120%" height="120%">
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="${seed}" result="noise"/>
    <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.55 0 0 0 0 0.45 0 0 0 0 0.34 0 0 0 .15 0" result="tint"/>
    <feBlend in="SourceGraphic" in2="tint" mode="multiply"/>
  </filter>
  <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
    <feDropShadow dx="0" dy="20" stdDeviation="18" flood-color="#4b2a18" flood-opacity=".18"/>
  </filter>
  <radialGradient id="vignette" cx="50%" cy="44%" r="75%">
    <stop offset="0%" stop-color="#ffffff" stop-opacity=".18"/>
    <stop offset="70%" stop-color="#ffffff" stop-opacity="0"/>
    <stop offset="100%" stop-color="#402719" stop-opacity=".12"/>
  </radialGradient>
  <linearGradient id="warmFade" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#f9efe3"/>
    <stop offset="100%" stop-color="#d98d59"/>
  </linearGradient>
  <linearGradient id="greenFade" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#e9f0dd"/>
    <stop offset="100%" stop-color="#516045"/>
  </linearGradient>
  <linearGradient id="blueFade" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#eef5f4"/>
    <stop offset="100%" stop-color="#6986a2"/>
  </linearGradient>
  <pattern id="paperSpeckles" width="38" height="38" patternUnits="userSpaceOnUse">
    <circle cx="4" cy="7" r="1.25" fill="#b99c7e" opacity=".14"/>
    <circle cx="22" cy="18" r="1.1" fill="#7f6b58" opacity=".10"/>
    <circle cx="32" cy="31" r="1.4" fill="#d2b899" opacity=".16"/>
  </pattern>`;
}

function svgRoot(w, h, body, seed = 4, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>${commonDefs(seed)}${extraDefs}</defs>
${body}
</svg>`;
}

function text(x, y, value, opts = {}) {
  const {
    size = 32,
    family = sans,
    weight = 500,
    fill = '#2b211b',
    anchor = 'start',
    opacity = 1,
    letter = 0,
    rotate = 0,
    style = '',
  } = opts;
  const transform = rotate ? ` transform="rotate(${rotate} ${x} ${y})"` : '';
  return `<text x="${x}" y="${y}" font-family='${family}' font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" opacity="${opacity}" letter-spacing="${letter}"${transform} ${style}>${esc(value)}</text>`;
}

function multiline(x, y, lines, opts = {}) {
  const lineHeight = opts.lineHeight ?? Math.round((opts.size ?? 30) * 1.45);
  return lines.map((line, index) => text(x, y + index * lineHeight, line, opts)).join('\n');
}

function rect(x, y, w, h, opts = {}) {
  const {
    fill = 'none',
    stroke = 'none',
    strokeWidth = 1,
    rx = 0,
    opacity = 1,
    dash = '',
    filter = '',
  } = opts;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"${dash ? ` stroke-dasharray="${dash}"` : ''}${filter ? ` filter="${filter}"` : ''}/>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const { stroke = '#2b211b', strokeWidth = 3, opacity = 1, dash = '', cap = 'round' } = opts;
  return `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="${cap}" opacity="${opacity}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
}

function paper(w, h, fill = '#fff7ed') {
  return rect(0, 0, w, h, { fill });
}

function leafBranch(x, y, scale = 1, color = '#8b5a3c', rotate = 0) {
  const leaves = [
    [20, -34, 30, -52],
    [52, -66, 78, -77],
    [35, -12, 64, -24],
    [73, -38, 103, -43],
    [62, 3, 90, -7],
  ];
  const leafSvg = leaves.map(([cx, cy, rx, ry], index) => {
    const side = index % 2 === 0 ? 1 : -1;
    return `<path d="M ${cx} ${cy} C ${cx + 28 * side} ${cy - 8}, ${rx + 24 * side} ${ry + 10}, ${rx} ${ry} C ${rx - 24 * side} ${ry - 2}, ${cx - 16 * side} ${cy + 10}, ${cx} ${cy} Z" fill="${color}" opacity=".82"/>`;
  }).join('\n');
  return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">
    <path d="M0 0 C32 -26, 56 -62, 96 -92" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round"/>
    ${leafSvg}
  </g>`;
}

function miniIcon(x, y, kind, color = '#fffaf4') {
  if (kind === 'cup') {
    return `<g transform="translate(${x} ${y})" stroke="${color}" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 18h42v18c0 12-9 20-21 20S16 48 16 36z"/>
      <path d="M58 24h8c8 0 8 18 0 18h-8"/>
      <path d="M13 63h52"/>
    </g>`;
  }
  if (kind === 'cake') {
    return `<g transform="translate(${x} ${y})" stroke="${color}" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M13 60h58V35H13z"/>
      <path d="M20 35c8-18 36-18 44 0"/>
      <path d="M31 24l6-10 6 10"/>
      <path d="M23 46h38"/>
    </g>`;
  }
  if (kind === 'pin') {
    return `<g transform="translate(${x} ${y})" stroke="${color}" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M42 69s24-26 24-43C66 13 55 4 42 4S18 13 18 26c0 17 24 43 24 43z"/>
      <circle cx="42" cy="27" r="9"/>
    </g>`;
  }
  return `<g transform="translate(${x} ${y})" stroke="${color}" fill="none" stroke-width="4" stroke-linecap="round">
    <path d="M16 56h50M18 40h46M25 24h32"/>
  </g>`;
}

function eventFlyer(spec) {
  const { id, w, h, palette, title, subtitle, eyebrow, date, landscape = false, accent = 'leaf' } = spec;
  const [a, b, c, d] = palette;
  if (landscape) {
    const body = `
      ${paper(w, h, a)}
      ${rect(70, 70, w - 140, h - 140, { fill: '#fffdf8', opacity: 0.48, rx: 28 })}
      ${rect(0, h - 230, w, 230, { fill: b, opacity: 0.95 })}
      ${rect(90, 92, 560, h - 225, { fill: 'url(#warmFade)', rx: 220, filter: 'url(#softShadow)' })}
      <circle cx="350" cy="${h * 0.42}" r="190" fill="${c}" opacity=".32"/>
      <circle cx="235" cy="${h * 0.46}" r="92" fill="#fdf5e9" opacity=".55"/>
      ${leafBranch(210, h * 0.52, 1.6, d, -18)}
      ${text(750, 170, eyebrow, { size: 24, weight: 800, fill: d, letter: 2 })}
      ${multiline(750, 300, title, { size: 96, family: serif, weight: 500, fill: '#2c211a', lineHeight: 98 })}
      ${line(750, 545, 990, 545, { stroke: b, strokeWidth: 5 })}
      ${text(750, 630, subtitle, { size: 34, weight: 700, fill: '#3d332c' })}
      ${text(w - 150, 170, date, { size: 42, family: serif, weight: 500, fill: '#fffaf4', anchor: 'end' })}
      ${rect(730, h - 167, 315, 84, { fill: '#fff7ed', rx: 42, opacity: 0.95 })}
      ${text(888, h - 112, 'SCAN SAMPLE', { size: 25, weight: 900, fill: b, anchor: 'middle', letter: 3 })}
      ${miniIcon(1100, h - 178, 'pin', '#fff7ed')}
      ${text(120, h - 135, 'JUNO POP-UP SERIES', { size: 28, weight: 900, fill: '#fff7ed', letter: 2 })}
      ${text(120, h - 84, '落ち着いた色と紙の手ざわりを残す一枚。', { size: 26, weight: 700, fill: '#fffaf4' })}`;
    return svgRoot(w, h, body, id.length);
  }

  const lowerY = Math.round(h * 0.51);
  const body = `
    ${paper(w, h, a)}
    ${leafBranch(120, 140, 1.2, d, -16)}
    ${text(w - 120, 150, eyebrow, { size: 22, weight: 900, fill: d, anchor: 'end', letter: 2 })}
    ${multiline(120, 350, title, { size: 150, family: serif, weight: 500, fill: '#33251d', lineHeight: 155 })}
    ${line(120, lowerY - 155, 235, lowerY - 155, { stroke: d, strokeWidth: 5 })}
    ${text(120, lowerY - 80, subtitle, { size: 43, weight: 750, fill: '#3e342e' })}
    ${rect(w * 0.58, 255, w * 0.56, 760, { fill: c, rx: 330, filter: 'url(#softShadow)', opacity: 0.9 })}
    <circle cx="${w * 0.78}" cy="645" r="210" fill="#f9e7ce" opacity=".42"/>
    ${accent === 'moon' ? `<circle cx="${w * 0.76}" cy="545" r="170" fill="#f2d28f" opacity=".78"/><circle cx="${w * 0.82}" cy="505" r="150" fill="${c}" opacity=".72"/>` : leafBranch(w * 0.69, 670, 1.55, '#fff5e8', 16)}
    ${rect(0, lowerY, w * 0.58, 535, { fill: b, opacity: 0.96 })}
    ${miniIcon(86, lowerY + 78, 'cup')}
    ${miniIcon(86, lowerY + 225, 'cake')}
    ${miniIcon(86, lowerY + 375, 'pin')}
    ${text(210, lowerY + 115, 'CALM DESIGN', { size: 22, weight: 900, fill: '#fffaf4', letter: 2 })}
    ${text(210, lowerY + 164, '上品な余白と色面のあるチラシ。', { size: 25, weight: 700, fill: '#fff8ee' })}
    ${line(210, lowerY + 205, w * 0.51, lowerY + 205, { stroke: '#fff8ee', strokeWidth: 2, opacity: 0.75, dash: '6 9' })}
    ${text(210, lowerY + 265, 'RICH TEXTURE', { size: 22, weight: 900, fill: '#fffaf4', letter: 2 })}
    ${text(210, lowerY + 315, '紙質と影が残る、縮小に強い構成。', { size: 25, weight: 700, fill: '#fff8ee' })}
    ${line(210, lowerY + 355, w * 0.51, lowerY + 355, { stroke: '#fff8ee', strokeWidth: 2, opacity: 0.75, dash: '6 9' })}
    ${text(210, lowerY + 415, 'EVENT NOTE', { size: 22, weight: 900, fill: '#fffaf4', letter: 2 })}
    ${text(210, lowerY + 466, date, { size: 31, weight: 800, fill: '#fff8ee' })}
    ${rect(95, h - 270, 430, 130, { fill: '#fffaf4', rx: 18, opacity: 0.7 })}
    ${text(130, h - 220, 'INFORMATION', { size: 22, weight: 900, fill: '#4b382d', letter: 2 })}
    ${text(130, h - 176, '11:00 - 19:00 / JUNO HALL', { size: 24, weight: 700, fill: '#4b382d' })}
    ${rect(w - 330, h - 420, 390, 520, { fill: d, rx: 220, opacity: 0.96 })}
    ${leafBranch(w - 225, h - 95, 1.1, '#fffaf4', -28)}`;
  return svgRoot(w, h, body, id.length);
}

function businessCard(spec) {
  const { w, h, name, role, studio, email, palette, vertical = false, mark = 'circle' } = spec;
  const [bg, ink, accent, pale] = palette;
  const markSvg =
    mark === 'wave'
      ? `<path d="M0 60 C55 0, 105 115, 160 46 S270 24, 320 78" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round" opacity=".9"/>`
      : mark === 'grid'
        ? Array.from({ length: 5 }, (_, i) => line(0, i * 34, 260, i * 34, { stroke: accent, strokeWidth: 6, opacity: 0.75 })).join('\n') +
          Array.from({ length: 6 }, (_, i) => line(i * 52, 0, i * 52, 136, { stroke: accent, strokeWidth: 6, opacity: 0.45 })).join('\n')
        : `<circle cx="90" cy="90" r="76" fill="${accent}" opacity=".9"/><circle cx="124" cy="62" r="38" fill="${pale}" opacity=".74"/>`;

  if (vertical) {
    const body = `
      ${paper(w, h, bg)}
      ${rect(42, 42, w - 84, h - 84, { fill: 'none', stroke: ink, strokeWidth: 3, opacity: 0.18 })}
      <g transform="translate(${w / 2 - 150} 150)">${markSvg}</g>
      ${text(w / 2, 570, name, { size: 78, family: serif, weight: 500, fill: ink, anchor: 'middle' })}
      ${text(w / 2, 642, role, { size: 28, weight: 900, fill: accent, anchor: 'middle', letter: 3 })}
      ${line(w / 2 - 120, 720, w / 2 + 120, 720, { stroke: ink, strokeWidth: 3, opacity: 0.35 })}
      ${text(w / 2, 805, studio, { size: 31, weight: 750, fill: ink, anchor: 'middle' })}
      ${text(w / 2, 860, email, { size: 25, weight: 600, fill: ink, anchor: 'middle', opacity: 0.78 })}
      ${text(w / 2, h - 160, 'TOKYO  /  BRAND  /  MOTION', { size: 24, weight: 900, fill: ink, anchor: 'middle', letter: 4, opacity: 0.65 })}
      ${rect(0, h - 84, w, 84, { fill: accent, opacity: 0.95 })}`;
    return svgRoot(w, h, body, name.length + 2);
  }
  const body = `
    ${paper(w, h, bg)}
    ${rect(42, 42, w - 84, h - 84, { fill: '#fffdf8', opacity: 0.36, rx: 24 })}
    <g transform="translate(${w - 470} ${h - 290})">${markSvg}</g>
    ${text(105, 210, name, { size: 74, family: serif, weight: 500, fill: ink })}
    ${text(110, 288, role, { size: 28, weight: 900, fill: accent, letter: 4 })}
    ${line(108, 368, 410, 368, { stroke: accent, strokeWidth: 6 })}
    ${text(110, 455, studio, { size: 31, weight: 760, fill: ink })}
    ${text(110, 512, email, { size: 26, weight: 600, fill: ink, opacity: 0.76 })}
    ${text(110, h - 105, 'PORTFOLIO  /  IDENTITY  /  EDITORIAL', { size: 24, weight: 900, fill: ink, letter: 4, opacity: 0.6 })}
    ${rect(w - 82, 0, 82, h, { fill: accent, opacity: 0.94 })}`;
  return svgRoot(w, h, body, name.length + 5);
}

function tableBlock(x, y, w, h, rows, cols, opts = {}) {
  const stroke = opts.stroke ?? '#5d534c';
  const fill = opts.fill ?? '#fffdf8';
  const header = opts.header ?? '#efe3d4';
  const title = opts.title ?? '';
  const cells = opts.cells ?? [];
  let out = '';
  if (title) out += text(x, y - 22, title, { size: opts.titleSize ?? 24, weight: 850, fill: opts.titleColor ?? '#3e342d', letter: 1.4 });
  out += rect(x, y, w, h, { fill, stroke, strokeWidth: 2, opacity: opts.opacity ?? 1 });
  out += rect(x, y, w, h / rows, { fill: header, opacity: 0.75 });
  for (let r = 1; r < rows; r += 1) out += line(x, y + (h / rows) * r, x + w, y + (h / rows) * r, { stroke, strokeWidth: 1.5, opacity: 0.8, cap: 'butt' });
  for (let c = 1; c < cols; c += 1) out += line(x + (w / cols) * c, y, x + (w / cols) * c, y + h, { stroke, strokeWidth: 1.5, opacity: 0.8, cap: 'butt' });
  cells.slice(0, rows * cols).forEach((cell, index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    out += text(x + (w / cols) * c + 18, y + (h / rows) * r + (h / rows) * 0.62, cell, {
      size: opts.cellSize ?? 20,
      weight: r === 0 ? 850 : 560,
      fill: opts.textColor ?? '#302822',
      family: opts.family ?? sans,
    });
  });
  return out;
}

function businessDocument(spec, overlay = false) {
  const { id, w, h, title, subtitle, landscape = false, palette } = spec;
  const [paperColor, ink, accent, pale] = palette;
  const margin = landscape ? 82 : 92;
  const contentW = w - margin * 2;
  const titleY = landscape ? 122 : 150;
  const t1 = landscape ? [margin, 390, contentW * 0.45, 340] : [margin, 540, contentW, 300];
  const t2 = landscape ? [margin + contentW * 0.52, 390, contentW * 0.48, 340] : [margin, 910, contentW, 350];
  const body = `
    ${paper(w, h, paperColor)}
    ${rect(margin - 34, margin - 34, contentW + 68, h - margin * 1.45, { fill: '#fffdf9', stroke: '#d9cdc0', strokeWidth: 3, opacity: 0.78 })}
    ${text(margin, titleY, 'JUNO BUSINESS PAPER', { size: 22, weight: 900, fill: accent, letter: 5 })}
    ${text(margin, titleY + 74, title, { size: landscape ? 58 : 60, family: serif, weight: 500, fill: ink })}
    ${text(w - margin, titleY + 74, '2026.05', { size: 24, weight: 800, fill: ink, anchor: 'end', opacity: 0.72 })}
    ${line(margin, titleY + 116, w - margin, titleY + 116, { stroke: accent, strokeWidth: 5, opacity: 0.75 })}
    ${multiline(margin, titleY + 180, subtitle, { size: landscape ? 23 : 25, weight: 560, fill: ink, opacity: 0.78, lineHeight: landscape ? 36 : 39 })}
    ${tableBlock(...t1, 5, 4, {
      title: 'Table 1 / Segment Summary',
      header: pale,
      stroke: ink,
      titleColor: accent,
      cellSize: landscape ? 19 : 22,
      cells: ['項目', '計画', '実績', 'メモ', 'LP更新', '12', '10', '配色改善', '撮影', '8', '9', '一覧用素材', '審査', '4', '3', '文言整理', '公開', '1', '1', 'Netlify'],
    })}
    ${tableBlock(...t2, 6, 4, {
      title: 'Table 2 / Cost And Timing',
      header: '#eaf0ed',
      stroke: ink,
      titleColor: accent,
      cellSize: landscape ? 18 : 21,
      cells: ['日付', '担当', '費用', '状態', '5/09', 'Design', '42,000', '進行中', '5/10', 'Photo', '18,000', '確認', '5/12', 'Review', '9,800', '予定', '5/14', 'Store', '0', '申請前', 'Total', '-', '69,800', 'OK'],
    })}
    ${landscape ? text(margin, h - 145, 'Notes: Small tables remain legible after PopScan enhancement. The two table regions are intentionally separated for crop detection.', { size: 22, weight: 560, fill: ink, opacity: 0.68 }) : multiline(margin, h - 300, ['備考：本文と2つの表領域が分かれて見えるよう、罫線と余白を強めにしています。', 'PopScan の自動認識説明用に、書類全体・表1・表2の境界が取りやすい構成です。'], { size: 24, weight: 560, fill: ink, opacity: 0.68, lineHeight: 40 })}
    ${overlay ? cropOverlay(margin - 34, margin - 34, contentW + 68, h - margin * 1.45, t1, t2) : ''}`;
  return svgRoot(w, h, body, id.length + (overlay ? 20 : 0));
}

function cropOverlay(docX, docY, docW, docH, t1, t2) {
  return `
    ${outlineBox(docX, docY, docW, docH, '#4ea0b4', 10)}
    ${outlineBox(t1[0] - 10, t1[1] - 10, t1[2] + 20, t1[3] + 20, '#f4ca3d', 10)}
    ${outlineBox(t2[0] - 10, t2[1] - 10, t2[2] + 20, t2[3] + 20, '#4f965b', 10)}
    <circle cx="${t1[0] + t1[2] / 2}" cy="${t1[1] - 42}" r="45" fill="#f4ca3d" opacity=".98"/>
    ${text(t1[0] + t1[2] / 2, t1[1] - 25, '1', { size: 42, weight: 900, fill: '#fff', anchor: 'middle' })}
    <circle cx="${docX + docW / 2}" cy="${t1[1] - 120}" r="42" fill="#4ea0b4" opacity=".8"/>
    ${text(docX + docW / 2, t1[1] - 104, '2', { size: 38, weight: 900, fill: '#fff', anchor: 'middle' })}
    <circle cx="${t2[0] + t2[2] / 2}" cy="${t2[1] - 42}" r="42" fill="#4f965b" opacity=".82"/>
    ${text(t2[0] + t2[2] / 2, t2[1] - 26, '3', { size: 38, weight: 900, fill: '#fff', anchor: 'middle' })}`;
}

function outlineBox(x, y, w, h, stroke, strokeWidth) {
  return `
    ${line(x, y, x + w, y, { stroke, strokeWidth, cap: 'butt' })}
    ${line(x + w, y, x + w, y + h, { stroke, strokeWidth, cap: 'butt' })}
    ${line(x + w, y + h, x, y + h, { stroke, strokeWidth, cap: 'butt' })}
    ${line(x, y + h, x, y, { stroke, strokeWidth, cap: 'butt' })}`;
}

function memo(spec) {
  const { id, w, h, title, ink, accent } = spec;
  const lines = Array.from({ length: 13 }, (_, i) => line(90, 185 + i * 64, w - 90, 185 + i * 64, { stroke: '#d7cdbc', strokeWidth: 2, opacity: 0.72 }));
  const body = `
    ${paper(w, h, '#fff8e9')}
    ${rect(60, 58, w - 120, h - 116, { fill: '#fffdf5', stroke: '#e2d4bf', strokeWidth: 3, opacity: 0.74, rx: 24 })}
    ${lines.join('\n')}
    ${text(105, 130, title, { size: 50, family: hand, weight: 600, fill: ink })}
    ${line(105, 155, 420, 144, { stroke: accent, strokeWidth: 4, opacity: 0.8 })}
    ${scribbleBlock(120, 250, 430, 260, ink, accent)}
    ${scribbleBlock(640, 230, 380, 220, ink, '#a65f44')}
    ${line(515, 380, 645, 335, { stroke: ink, strokeWidth: 4, opacity: 0.85 })}
    <path d="M640 335 l-28 -8 l18 24" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    ${multiline(120, 600, ['・余白を広めに取る', '・撮影後の確認を軽く', '・一覧で見た時に形が分かる'], { size: 33, family: hand, weight: 500, fill: ink, lineHeight: 58 })}
    <path d="M690 610 C760 560, 870 570, 930 640 S1045 710, 1115 625" fill="none" stroke="${accent}" stroke-width="6" opacity=".82" stroke-linecap="round"/>
    ${text(720, 745, 'crop / filter / save', { size: 32, family: hand, weight: 500, fill: ink, rotate: -2 })}
    ${line(720, 765, 1010, 742, { stroke: ink, strokeWidth: 3, opacity: 0.6 })}
    ${leafBranch(w - 185, h - 145, 0.78, accent, -35)}`;
  return svgRoot(w, h, body, id.length + 8);
}

function scribbleBlock(x, y, w, h, ink, accent) {
  return `
    ${rect(x, y, w, h, { fill: 'none', stroke: ink, strokeWidth: 4, opacity: 0.78, rx: 18, dash: '10 11' })}
    <path d="M${x + 45} ${y + h - 55} C${x + 100} ${y + 45}, ${x + 210} ${y + 65}, ${x + 260} ${y + h - 80} S${x + w - 70} ${y + 120}, ${x + w - 45} ${y + h - 45}" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" opacity=".8"/>
    ${line(x + 60, y + 82, x + w - 70, y + 78, { stroke: ink, strokeWidth: 4, opacity: 0.7 })}
    ${line(x + 60, y + 132, x + w - 130, y + 126, { stroke: ink, strokeWidth: 4, opacity: 0.62 })}
    ${line(x + 60, y + 182, x + w - 95, y + 176, { stroke: ink, strokeWidth: 4, opacity: 0.62 })}`;
}

function airmailBorder(w, h) {
  const segs = [];
  for (let x = -80; x < w + 80; x += 92) {
    segs.push(`<path d="M${x} 0 l70 0 l-110 74 l-70 0z" fill="#b94745" opacity=".9"/>`);
    segs.push(`<path d="M${x + 46} ${h} l70 0 l-110 -74 l-70 0z" fill="#3e6d93" opacity=".9"/>`);
  }
  for (let y = 0; y < h; y += 92) {
    segs.push(`<path d="M0 ${y} l0 70 l74 -110 l0 -70z" fill="#3e6d93" opacity=".9"/>`);
    segs.push(`<path d="M${w} ${y + 46} l0 70 l-74 -110 l0 -70z" fill="#b94745" opacity=".9"/>`);
  }
  return segs.join('\n');
}

function airmail(spec) {
  const { id, w, h, city, stamp, palette } = spec;
  const [paperColor, ink, red, blue] = palette;
  const body = `
    ${paper(w, h, paperColor)}
    ${airmailBorder(w, h)}
    ${rect(70, 70, w - 140, h - 140, { fill: '#fffaf0', stroke: '#ddcdbb', strokeWidth: 3, opacity: 0.92 })}
    ${text(125, 160, 'AIR MAIL', { size: 36, weight: 900, fill: blue, letter: 5 })}
    ${text(125, 214, 'PAR AVION', { size: 28, weight: 800, fill: red, letter: 4 })}
    ${line(120, 258, 520, 258, { stroke: blue, strokeWidth: 4, opacity: 0.65 })}
    ${rect(w - 315, 118, 170, 220, { fill: '#f7e4d2', stroke: red, strokeWidth: 4, dash: '12 9' })}
    ${text(w - 230, 205, stamp, { size: 27, family: serif, weight: 700, fill: ink, anchor: 'middle' })}
    <circle cx="${w - 430}" cy="260" r="84" fill="none" stroke="${blue}" stroke-width="5" opacity=".62"/>
    <circle cx="${w - 397}" cy="282" r="84" fill="none" stroke="${red}" stroke-width="4" opacity=".42"/>
    ${text(w - 416, 268, city, { size: 25, weight: 900, fill: ink, anchor: 'middle', opacity: 0.64, rotate: -12 })}
    ${multiline(145, 430, ['JUNO TOKYO', '2-14-8 Sendagaya', 'Shibuya, Tokyo', 'Japan 151-0051'], { size: 40, family: serif, weight: 500, fill: ink, lineHeight: 62 })}
    ${line(610, 474, w - 180, 474, { stroke: ink, strokeWidth: 3, opacity: 0.48 })}
    ${line(610, 548, w - 180, 548, { stroke: ink, strokeWidth: 3, opacity: 0.48 })}
    ${line(610, 622, w - 180, 622, { stroke: ink, strokeWidth: 3, opacity: 0.48 })}
    ${text(620, 438, 'From overseas with small paper texture.', { size: 27, family: hand, weight: 500, fill: ink, opacity: 0.72, rotate: -2 })}
    ${text(w - 230, h - 145, 'POP SCAN SAMPLE', { size: 24, weight: 900, fill: blue, anchor: 'middle', letter: 4 })}`;
  return svgRoot(w, h, body, id.length + 13);
}

const assets = [
  {
    id: 'flyer-01-botanic-cafe',
    category: 'flyer',
    w: 1240,
    h: 1754,
    build: () => eventFlyer({
      id: 'flyer-01',
      w: 1240,
      h: 1754,
      palette: ['#fff7ed', '#bd6c42', '#b98a62', '#516045'],
      title: ['BOTANIC', 'CAFE'],
      subtitle: '心ほどける、やわらかな午後を。',
      eyebrow: 'A NEW COFFEE EXPERIENCE',
      date: 'OPEN 5.25 SAT',
    }),
  },
  {
    id: 'flyer-02-ceramic-market',
    category: 'flyer',
    w: 1754,
    h: 1240,
    build: () => eventFlyer({
      id: 'flyer-02',
      w: 1754,
      h: 1240,
      landscape: true,
      palette: ['#f7efe4', '#9f684a', '#d7b7a0', '#5e6e74'],
      title: ['CERAMIC', 'MARKET'],
      subtitle: '手ざわりのある器と静かな週末。',
      eyebrow: 'CRAFT WEEKEND',
      date: '6.08 SUN',
    }),
  },
  {
    id: 'flyer-03-moon-jazz',
    category: 'flyer',
    w: 1240,
    h: 1754,
    build: () => eventFlyer({
      id: 'flyer-03',
      w: 1240,
      h: 1754,
      palette: ['#fbf3e7', '#435247', '#39483e', '#a76548'],
      title: ['MOON', 'JAZZ'],
      subtitle: '夜にひらく、しずかな音の時間。',
      eyebrow: 'EVENING SESSION',
      date: '6.21 FRI 19:00',
      accent: 'moon',
    }),
  },
  {
    id: 'flyer-04-tea-letters',
    category: 'flyer',
    w: 1754,
    h: 1240,
    build: () => eventFlyer({
      id: 'flyer-04',
      w: 1754,
      h: 1240,
      landscape: true,
      palette: ['#fff9ed', '#c47b68', '#d8e8d2', '#596d54'],
      title: ['TEA &', 'LETTERS'],
      subtitle: '香りと手紙を楽しむ小さな集い。',
      eyebrow: 'AFTERNOON SALON',
      date: '7.06 SAT',
    }),
  },
  {
    id: 'flyer-05-art-book-fair',
    category: 'flyer',
    w: 1240,
    h: 1754,
    build: () => eventFlyer({
      id: 'flyer-05',
      w: 1240,
      h: 1754,
      palette: ['#f6efe5', '#6e86a0', '#b7c5cf', '#9d633f'],
      title: ['ART BOOK', 'FAIR'],
      subtitle: '紙と写真と、余白のある展示。',
      eyebrow: 'SMALL PRESS DAYS',
      date: '7.20-21',
    }),
  },
  {
    id: 'card-01-mika-aoyama-horizontal',
    category: 'business-card',
    w: 1500,
    h: 900,
    build: () => businessCard({
      w: 1500,
      h: 900,
      name: 'Mika Aoyama',
      role: 'VISUAL DESIGNER',
      studio: 'Quiet Color Studio',
      email: 'hello@mikaaoyama.design',
      palette: ['#fff8ed', '#2d2520', '#b66c47', '#f1dfc8'],
      mark: 'circle',
    }),
  },
  {
    id: 'card-02-yuto-hara-vertical',
    category: 'business-card',
    w: 900,
    h: 1500,
    build: () => businessCard({
      w: 900,
      h: 1500,
      name: 'Yuto Hara',
      role: 'MOTION & TYPE',
      studio: 'Hara Design Office',
      email: 'yuto@hara-type.jp',
      palette: ['#f4efe4', '#283128', '#5a6f59', '#e4c4a2'],
      vertical: true,
      mark: 'wave',
    }),
  },
  {
    id: 'card-03-nana-kuroki-horizontal',
    category: 'business-card',
    w: 1500,
    h: 900,
    build: () => businessCard({
      w: 1500,
      h: 900,
      name: 'Nana Kuroki',
      role: 'BRAND DESIGNER',
      studio: 'Northline Projects',
      email: 'nana@northline.studio',
      palette: ['#f7f1e7', '#20262b', '#6d8da4', '#e9d4b7'],
      mark: 'grid',
    }),
  },
  {
    id: 'card-04-ren-ito-vertical',
    category: 'business-card',
    w: 900,
    h: 1500,
    build: () => businessCard({
      w: 900,
      h: 1500,
      name: 'Ren Ito',
      role: 'ART DIRECTOR',
      studio: 'Ito Creative Room',
      email: 'ren@ito-room.com',
      palette: ['#fffaf1', '#221b18', '#cf7b3d', '#f2dfc4'],
      vertical: true,
      mark: 'circle',
    }),
  },
  {
    id: 'business-01-project-status',
    category: 'business-document',
    w: 1240,
    h: 1754,
    build: () => businessDocument({
      id: 'business-01',
      w: 1240,
      h: 1754,
      title: 'Project Status Brief',
      subtitle: ['新規サービス準備に関する進捗共有メモ。本文、要点、2種類の表を明確に分けて配置しています。', '各項目はサンプル値で、スキャン後にも罫線と情報の塊が残る想定です。'],
      palette: ['#fbf7ee', '#2f2a25', '#9a6742', '#efe1cf'],
    }),
  },
  {
    id: 'business-02-market-note',
    category: 'business-document',
    w: 1240,
    h: 1754,
    build: () => businessDocument({
      id: 'business-02',
      w: 1240,
      h: 1754,
      title: 'Market Research Note',
      subtitle: ['市場調査の抜粋と仮説をまとめた資料。縦型でも2つの表をしっかり見せます。', '淡い青緑の罫線と落ち着いた本文色でビジネス文書らしくしています。'],
      palette: ['#f7f6f0', '#273032', '#627b78', '#dde8e4'],
    }),
  },
  {
    id: 'business-03-campaign-review-landscape',
    category: 'business-document',
    w: 1754,
    h: 1240,
    build: () => businessDocument({
      id: 'business-03',
      w: 1754,
      h: 1240,
      landscape: true,
      title: 'Campaign Review Sheet',
      subtitle: ['横型の会議資料として、左に本文、中央から右に2つの表を配置しました。', '表1と表2の間隔を広くし、個別トリミングの説明素材に使いやすくしています。'],
      palette: ['#fff8ed', '#2f2824', '#b56748', '#f1dec9'],
    }),
  },
  {
    id: 'business-04-operations-landscape',
    category: 'business-document',
    w: 1754,
    h: 1240,
    build: () => businessDocument({
      id: 'business-04',
      w: 1754,
      h: 1240,
      landscape: true,
      title: 'Operations Report',
      subtitle: ['週次オペレーションの状況を一覧化した横型資料。', '本文領域、表領域、注記を紙面上で分かりやすく分離しています。'],
      palette: ['#f6f4ec', '#2a302b', '#60705b', '#e6eadc'],
    }),
  },
  {
    id: 'memo-01-scan-flow',
    category: 'handwritten-memo',
    w: 1600,
    h: 1100,
    build: () => memo({ id: 'memo-01', w: 1600, h: 1100, title: 'Scan flow brainstorm', ink: '#283041', accent: '#a65f44' }),
  },
  {
    id: 'memo-02-gallery-ideas',
    category: 'handwritten-memo',
    w: 1600,
    h: 1100,
    build: () => memo({ id: 'memo-02', w: 1600, h: 1100, title: 'Gallery ideas / 写真一覧', ink: '#26342f', accent: '#607a68' }),
  },
  {
    id: 'memo-03-cafe-menu',
    category: 'handwritten-memo',
    w: 1600,
    h: 1100,
    build: () => memo({ id: 'memo-03', w: 1600, h: 1100, title: 'Menu sketch notes', ink: '#30283a', accent: '#6f86a6' }),
  },
  {
    id: 'memo-04-launch-plan',
    category: 'handwritten-memo',
    w: 1600,
    h: 1100,
    build: () => memo({ id: 'memo-04', w: 1600, h: 1100, title: 'Launch plan doodle', ink: '#3a2c23', accent: '#c67b43' }),
  },
  {
    id: 'airmail-01-lisbon',
    category: 'airmail',
    w: 1600,
    h: 1100,
    build: () => airmail({ id: 'airmail-01', w: 1600, h: 1100, city: 'LISBON', stamp: 'PORTUGAL', palette: ['#fff3dc', '#342c26', '#be4f4c', '#426f97'] }),
  },
  {
    id: 'airmail-02-copenhagen',
    category: 'airmail',
    w: 1600,
    h: 1100,
    build: () => airmail({ id: 'airmail-02', w: 1600, h: 1100, city: 'COPENHAGEN', stamp: 'DANMARK', palette: ['#f9f0de', '#2f2b28', '#a94749', '#516f8d'] }),
  },
  {
    id: 'airmail-03-taipei',
    category: 'airmail',
    w: 1600,
    h: 1100,
    build: () => airmail({ id: 'airmail-03', w: 1600, h: 1100, city: 'TAIPEI', stamp: 'FORMOSA', palette: ['#fff7e8', '#312924', '#c25d4f', '#4b7892'] }),
  },
];

const generated = [];
for (const asset of assets) {
  const svg = asset.build();
  const svgPath = path.join(svgDir, `${asset.id}.svg`);
  const pngPath = path.join(outDir, `${asset.id}.png`);
  writeFileSync(svgPath, svg);
  const aiMemoPath = path.join(aiMemoDir, `${asset.id}.png`);
  const aiAirmailPath = path.join(aiAirmailDir, `${asset.id}.png`);
  const aiBusinessPath = path.join(aiBusinessDir, `${asset.id}.png`);
  if (asset.category === 'handwritten-memo' && existsSync(aiMemoPath)) {
    run([aiMemoPath, '-resize', `${asset.w}x${asset.h}^`, '-gravity', 'center', '-extent', `${asset.w}x${asset.h}`, '-strip', pngPath], `apply AI memo ${asset.id}`);
  } else if (asset.category === 'airmail' && existsSync(aiAirmailPath)) {
    run([aiAirmailPath, '-resize', `${asset.w}x${asset.h}^`, '-gravity', 'center', '-extent', `${asset.w}x${asset.h}`, '-strip', pngPath], `apply AI airmail ${asset.id}`);
  } else if (asset.category === 'business-document' && existsSync(aiBusinessPath)) {
    run([aiBusinessPath, '-resize', `${asset.w}x${asset.h}^`, '-gravity', 'center', '-extent', `${asset.w}x${asset.h}`, '-strip', pngPath], `apply AI business document ${asset.id}`);
  } else {
    run(['-font', defaultSvgFont, svgPath, '-strip', '-define', 'png:compression-level=9', pngPath], `render ${asset.id}`);
  }
  const thumbPath = path.join(thumbDir, `${asset.id}.png`);
  run([pngPath, '-resize', '398x398^', '-gravity', 'center', '-extent', '398x398', '-strip', thumbPath], `thumbnail ${asset.id}`);
  generated.push({ ...asset, svg: path.relative(repoRoot, svgPath), png: path.relative(repoRoot, pngPath), thumbnail: path.relative(repoRoot, thumbPath) });
}

const overlaySvg = businessDocument({
  id: 'business-01-overlay',
  w: 1240,
  h: 1754,
  title: 'Project Status Brief',
  subtitle: ['自動トリミング説明用のオーバーレイ例です。', '書類全体、表1、表2の3領域が認識される見え方にしています。'],
  palette: ['#fbf7ee', '#2f2a25', '#9a6742', '#efe1cf'],
}, true);
const overlaySvgPath = path.join(svgDir, 'business-01-auto-crop-overlay.svg');
const overlayPngPath = path.join(outDir, 'business-01-auto-crop-overlay.png');
writeFileSync(overlaySvgPath, overlaySvg);
run(['-font', defaultSvgFont, overlaySvgPath, '-strip', '-define', 'png:compression-level=9', overlayPngPath], 'render auto-crop overlay');

function composeThumbGrid(outputPath, rows, includeHeader = false) {
  const screenW = 1206;
  const headerH = includeHeader ? 397 : 0;
  const gap = 6;
  const cell = 398;
  const screenH = headerH + rows * cell + Math.max(0, rows - 1) * gap;
  const args = ['-size', `${screenW}x${screenH}`, 'xc:#000000'];
  let headerPath = '';
  if (includeHeader && existsSync(templatePhotoList)) {
    headerPath = path.join(outDir, '_photo-list-header.png');
    run([templatePhotoList, '-crop', `${screenW}x${headerH}+0+0`, '+repage', headerPath], 'crop photo list header');
    args.push(headerPath, '-geometry', '+0+0', '-composite');
  }
  assets.forEach((asset, index) => {
    const row = Math.floor(index / 3);
    if (row >= rows) return;
    const col = index % 3;
    const x = col * (cell + gap);
    const y = headerH + row * (cell + gap);
    args.push(path.join(thumbDir, `${asset.id}.png`), '-geometry', `+${x}+${y}`, '-composite');
  });
  args.push('-strip', outputPath);
  run(args, `compose ${path.basename(outputPath)}`);
  if (headerPath && existsSync(headerPath)) unlinkSync(headerPath);
}

composeThumbGrid(path.join(outDir, 'photo-grid-20-square.png'), 7, false);

if (existsSync(templatePhotoList)) {
  const screenPath = path.join(outDir, 'photo-list-screen-filled.png');
  composeThumbGrid(screenPath, 6, true);
  run([screenPath, '-gravity', 'north', '-crop', '1206x2622+0+0', '+repage', '-strip', screenPath], 'crop photo list screen');
}

writeFileSync(
  path.join(outDir, 'manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), count: assets.length, assets: generated }, null, 2)}\n`,
);

console.log(`Generated ${assets.length} document images in ${path.relative(repoRoot, outDir)}`);
