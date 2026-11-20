// Generates flat SVG product illustrations into public/products/{type}-{color}.svg
// Run: node scripts/gen-product-images.mjs
import { mkdirSync, writeFileSync } from "node:fs";

const COLORS = {
  blue: ["#2563eb", "#dbeafe"], black: ["#1f2937", "#e5e7eb"], red: ["#dc2626", "#fee2e2"],
  green: ["#16a34a", "#dcfce7"], yellow: ["#eab308", "#fef9c3"], pink: ["#ec4899", "#fce7f3"],
  orange: ["#f97316", "#ffedd5"], white: ["#9ca3af", "#f3f4f6"], brown: ["#a16207", "#fef3c7"],
  multi: ["#8b5cf6", "#ede9fe"],
};
const wrap = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" rx="24" fill="#f8fafc"/>${body}</svg>`;
const sh = (x, y, w, h, r = 4, f = "#fff") =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" stroke="#0002" stroke-width="1.5"/>`;
const rot = (a, b) => `<g transform="rotate(${a} 100 100)">${b}</g>`;
const stripes = (x, w, y0, n, gap, c) =>
  Array.from({ length: n }, (_, i) => `<rect x="${x}" y="${y0 + i * gap}" width="${w}" height="2" fill="${c}"/>`).join("");
const rainbow = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

const T = {
  sheets: (c) => sh(60, 50, 80, 105, 3) + sh(55, 45, 80, 105, 3) + sh(50, 40, 80, 105, 3) + `<rect x="62" y="58" width="56" height="5" fill="${c}"/>` + stripes(62, 56, 72, 5, 10, "#cbd5e1"),
  ruled: (c) => sh(50, 38, 100, 124, 3) + stripes(58, 84, 58, 9, 12, "#93c5fd") + `<rect x="68" y="38" width="2" height="124" fill="${c}"/>`,
  graph: (c) => sh(50, 38, 100, 124, 3) + Array.from({ length: 9 }, (_, i) => `<path d="M${58 + i * 10} 46V154M58 ${46 + i * 12}H142" stroke="${c}" stroke-opacity=".5"/>`).join(""),
  sticky: (c, l) => `<rect x="58" y="58" width="90" height="90" fill="${l}" stroke="#0002"/><rect x="48" y="48" width="90" height="90" fill="${c}"/><rect x="48" y="48" width="90" height="14" fill="#0001"/>` + stripes(58, 60, 78, 3, 12, "#0003"),
  card: (c) => sh(40, 70, 120, 70, 6) + `<rect x="40" y="70" width="120" height="14" rx="6" fill="${c}"/>` + stripes(52, 96, 98, 3, 12, "#cbd5e1"),
  booklet: (c) => sh(52, 36, 96, 128, 4, c) + `<rect x="68" y="60" width="64" height="40" rx="3" fill="#fff"/>` + stripes(72, 56, 70, 3, 10, "#94a3b8") + `<rect x="52" y="36" width="10" height="128" fill="#0002"/>`,
  notebook: (c) => sh(52, 32, 96, 136, 6, c) + `<rect x="52" y="32" width="12" height="136" rx="4" fill="#0003"/><rect x="76" y="58" width="58" height="34" rx="3" fill="#fff"/>` + stripes(82, 46, 68, 3, 8, "#94a3b8"),
  spiral: (c) => sh(52, 32, 96, 136, 6, c) + Array.from({ length: 10 }, (_, i) => `<circle cx="52" cy="${46 + i * 12}" r="5" fill="#fff" stroke="#475569" stroke-width="2.5"/>`).join("") + `<rect x="74" y="58" width="58" height="34" rx="3" fill="#fff"/>` + stripes(80, 46, 68, 3, 8, "#94a3b8"),
  file: (c) => `<path d="M40 70h46l10 12h64v70a6 6 0 0 1-6 6H46a6 6 0 0 1-6-6z" fill="${c}"/><rect x="40" y="92" width="120" height="60" rx="6" fill="#fff" fill-opacity=".25"/>`,
  folder: (c) => sh(50, 38, 100, 126, 5, "#fff") + `<rect x="50" y="38" width="100" height="126" rx="5" fill="${c}" fill-opacity=".25"/><rect x="50" y="38" width="14" height="126" fill="${c}"/>`,
  binder: (c) => sh(46, 32, 108, 136, 6, c) + `<rect x="66" y="52" width="68" height="96" rx="3" fill="#fff"/>` + Array.from({ length: 3 }, (_, i) => `<circle cx="60" cy="${62 + i * 38}" r="6" fill="#cbd5e1" stroke="#475569" stroke-width="3"/>`).join(""),
  envelope: (c, l) => sh(36, 60, 128, 88, 6, l) + `<path d="M36 66l64 46 64-46" fill="none" stroke="${c}" stroke-width="4"/>`,
  bag: (c) => sh(40, 62, 120, 96, 10, c) + `<rect x="40" y="62" width="120" height="14" rx="6" fill="#0003"/><rect x="92" y="62" width="16" height="30" rx="4" fill="#fff" fill-opacity=".8"/>`,
  display: (c) => sh(48, 34, 104, 132, 6, c) + Array.from({ length: 4 }, (_, i) => `<rect x="60" y="${48 + i * 28}" width="80" height="22" rx="3" fill="#fff" fill-opacity=".85"/>`).join(""),
  tabs: () => ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"].map((k, i) => `<rect x="${50 + i * 22}" y="${60 + (i % 2) * 14}" width="24" height="80" rx="4" fill="${k}" stroke="#0002"/>`).join(""),
  cover: (c) => sh(50, 38, 100, 124, 3, "#e0f2fe") + `<rect x="50" y="38" width="100" height="124" fill="#fff" fill-opacity=".5"/><rect x="50" y="38" width="12" height="124" fill="${c}"/>`,
  strip: (c) => Array.from({ length: 3 }, (_, i) => `<rect x="50" y="${60 + i * 28}" width="100" height="12" rx="6" fill="${c}"/>`).join(""),
  pen: (c) => rot(-45, `<rect x="92" y="28" width="16" height="104" rx="6" fill="${c}"/><rect x="92" y="28" width="16" height="22" rx="6" fill="#0003"/><path d="M92 132h16l-8 26z" fill="#475569"/><rect x="108" y="40" width="3" height="44" rx="1.5" fill="#94a3b8"/>`),
  pencil: (c) => rot(-45, `<rect x="91" y="30" width="18" height="96" fill="${c}"/><rect x="91" y="20" width="18" height="14" rx="3" fill="#f9a8d4"/><rect x="91" y="34" width="18" height="6" fill="#cbd5e1"/><path d="M91 126h18l-9 26z" fill="#fcd9a8"/><path d="M96 142h8l-4 10z" fill="#1f2937"/>`),
  marker: (c) => rot(-45, `<rect x="88" y="44" width="24" height="86" rx="6" fill="${c}"/><rect x="88" y="44" width="24" height="26" rx="6" fill="#fff"/><path d="M92 130h16l-3 22H95z" fill="#1f2937"/>`),
  highlighter: (c) => rot(-45, `<rect x="86" y="34" width="28" height="84" rx="6" fill="${c}"/><rect x="86" y="34" width="28" height="22" rx="6" fill="#fff" fill-opacity=".6"/><path d="M90 118h20l8 20H82z" fill="${c}" fill-opacity=".6"/><path d="M82 138h36l-6 14H88z" fill="#475569"/>`),
  eraser: (c) => rot(-20, `<rect x="52" y="76" width="96" height="52" rx="8" fill="#fff" stroke="#0002" stroke-width="1.5"/><rect x="52" y="76" width="44" height="52" rx="8" fill="${c}"/>`),
  sharpener: (c) => `<rect x="56" y="74" width="88" height="52" rx="10" fill="${c}"/><circle cx="84" cy="100" r="11" fill="#fff"/><rect x="108" y="92" width="26" height="16" rx="3" fill="#fff" fill-opacity=".7"/>`,
  pencilset: () => rainbow.map((k, i) => rot(-12 + i * 4, `<rect x="${64 + i * 10}" y="44" width="8" height="90" fill="${k}"/><path d="M${64 + i * 10} 134h8l-4 14z" fill="#fcd9a8"/>`)).join(""),
  boxset: () => sh(36, 70, 128, 76, 8, "#fff") + rainbow.map((k, i) => `<rect x="${46 + i * 16}" y="${56 - (i % 2) * 6}" width="10" height="40" rx="3" fill="${k}"/>`).join("") + `<rect x="36" y="96" width="128" height="50" rx="8" fill="#334155"/>`,
  crayon: () => rainbow.slice(0, 6).map((k, i) => `<rect x="${48 + i * 18}" y="60" width="14" height="80" rx="3" fill="${k}"/><path d="M${48 + i * 18} 60l7-14 7 14z" fill="${k}"/>`).join(""),
  bottle: (c) => `<rect x="76" y="40" width="48" height="16" rx="3" fill="#334155"/><path d="M70 62h60l8 90a8 8 0 0 1-8 8H70a8 8 0 0 1-8-8z" fill="${c}"/><rect x="76" y="96" width="48" height="36" rx="3" fill="#fff" fill-opacity=".85"/>`,
  tape: (c) => `<circle cx="100" cy="100" r="52" fill="${c}" fill-opacity=".35" stroke="${c}" stroke-width="6"/><circle cx="100" cy="100" r="22" fill="#fff" stroke="#0002" stroke-width="2"/><rect x="132" y="128" width="40" height="22" fill="${c}" fill-opacity=".5" transform="rotate(20 132 128)"/>`,
  glue: (c) => `<rect x="76" y="50" width="48" height="100" rx="8" fill="${c}"/><rect x="76" y="50" width="48" height="26" rx="8" fill="#fff"/><rect x="84" y="94" width="32" height="30" rx="3" fill="#fff" fill-opacity=".85"/>`,
  tube: (c) => `<path d="M80 150V84l10-34h20l10 34v66z" fill="${c}"/><rect x="92" y="34" width="16" height="16" rx="3" fill="#fff" stroke="#0002"/>`,
  stapler: (c) => `<rect x="44" y="108" width="112" height="24" rx="6" fill="#334155"/><path d="M48 108l16-30h84a8 8 0 0 1 8 8v22z" fill="${c}"/><rect x="60" y="130" width="80" height="6" fill="#0003"/>`,
  pins: (c) => `<rect x="60" y="100" width="80" height="50" rx="6" fill="${c}"/><rect x="60" y="100" width="80" height="14" fill="#fff" fill-opacity=".5"/><path d="M76 100V70M100 100V62M124 100V70" stroke="#64748b" stroke-width="5" stroke-linecap="round"/>`,
  clip: (c) => `<path d="M80 130V70a20 20 0 0 1 40 0v70a12 12 0 0 1-24 0V80" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
  bclip: () => `<path d="M60 60h80l-10 50H70z" fill="#1f2937"/><path d="M80 110l-14 34M120 110l14 34" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>`,
  rubber: () => `<ellipse cx="100" cy="100" rx="52" ry="34" fill="none" stroke="#eab308" stroke-width="10"/><ellipse cx="100" cy="100" rx="34" ry="52" fill="none" stroke="#f97316" stroke-width="10" transform="rotate(30 100 100)"/>`,
  scissors: (c) => `<path d="M80 40l40 70M120 40l-40 70" stroke="#94a3b8" stroke-width="8" stroke-linecap="round"/><circle cx="76" cy="136" r="18" fill="none" stroke="${c}" stroke-width="9"/><circle cx="124" cy="136" r="18" fill="none" stroke="${c}" stroke-width="9"/>`,
  ruler: (c) => rot(-30, `<rect x="30" y="82" width="140" height="36" rx="4" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="2"/>` + Array.from({ length: 15 }, (_, i) => `<rect x="${40 + i * 8.5}" y="82" width="1.5" height="${i % 5 === 0 ? 16 : 9}" fill="#334155"/>`).join("")),
  setsquare: (c) => `<path d="M48 156V52l100 104z" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><path d="M70 136V102l34 34z" fill="#fff" fill-opacity=".7"/>`,
  protractor: (c) => `<path d="M36 140a64 64 0 0 1 128 0z" fill="${c}" fill-opacity=".25" stroke="${c}" stroke-width="3"/>` + Array.from({ length: 13 }, (_, i) => { const a = Math.PI - (i * Math.PI) / 12; return `<path d="M${100 + 64 * Math.cos(a)} ${140 - 64 * Math.sin(a)}L${100 + 52 * Math.cos(a)} ${140 - 52 * Math.sin(a)}" stroke="#334155" stroke-width="2"/>`; }).join(""),
  compass: (c) => `<path d="M100 40v24M100 64L66 156M100 64l34 92" stroke="#64748b" stroke-width="7" stroke-linecap="round"/><circle cx="100" cy="40" r="9" fill="${c}"/><path d="M134 156l4 10" stroke="#1f2937" stroke-width="6" stroke-linecap="round"/>`,
  geobox: (c) => sh(36, 66, 128, 80, 8, c) + `<rect x="36" y="66" width="128" height="22" rx="8" fill="#0003"/><rect x="56" y="100" width="50" height="8" fill="#fff"/><path d="M116 98l30 36h-30z" fill="#fff" fill-opacity=".8"/>`,
  calc: (c) => sh(56, 30, 88, 140, 10, c) + `<rect x="66" y="42" width="68" height="28" rx="4" fill="#bbf7d0"/>` + Array.from({ length: 12 }, (_, i) => `<rect x="${68 + (i % 4) * 17}" y="${82 + Math.floor(i / 4) * 24}" width="13" height="17" rx="3" fill="#fff" fill-opacity=".9"/>`).join(""),
  punch: (c) => `<rect x="46" y="116" width="108" height="30" rx="6" fill="#334155"/><path d="M50 116l16-34h72a8 8 0 0 1 8 8v26z" fill="${c}"/><circle cx="80" cy="132" r="5" fill="#fff"/><circle cx="120" cy="132" r="5" fill="#fff"/>`,
  tack: (c) => `<circle cx="100" cy="82" r="30" fill="${c}"/><circle cx="92" cy="74" r="8" fill="#fff" fill-opacity=".6"/><path d="M100 112v44" stroke="#94a3b8" stroke-width="5" stroke-linecap="round"/>`,
  penstand: (c) => `<path d="M64 100h72l-6 56H70z" fill="${c}"/>` + ["#ef4444", "#3b82f6", "#22c55e"].map((k, i) => `<rect x="${72 + i * 20}" y="${48 + i * 6}" width="9" height="62" rx="3" fill="${k}" transform="rotate(${-10 + i * 10} ${76 + i * 20} 100)"/>`).join(""),
  label: (c) => sh(46, 74, 108, 56, 8, "#fff") + `<rect x="46" y="74" width="108" height="16" rx="8" fill="${c}"/>` + stripes(60, 80, 104, 2, 12, "#94a3b8"),
  lanyard: (c) => `<path d="M70 30l30 54 30-54" fill="none" stroke="${c}" stroke-width="9"/>` + sh(70, 84, 60, 80, 8, "#fff") + `<circle cx="100" cy="112" r="12" fill="${c}" fill-opacity=".5"/>` + stripes(80, 40, 138, 2, 9, "#94a3b8"),
  board: () => sh(52, 36, 96, 128, 6, "#a16207") + `<rect x="62" y="54" width="76" height="98" rx="3" fill="#fff"/><rect x="82" y="30" width="36" height="16" rx="4" fill="#94a3b8"/>` + stripes(68, 64, 70, 6, 14, "#cbd5e1"),
  box: (c) => `<path d="M44 80l56-24 56 24v62l-56 24-56-24z" fill="${c}" fill-opacity=".5" stroke="${c}" stroke-width="3" stroke-linejoin="round"/><path d="M44 80l56 24 56-24M100 104v62" stroke="${c}" stroke-width="3" fill="none"/>`,
};

// Keep the (type, color) combinations in sync with src/lib/productImage.ts
const jobs = [];
const add = (type, colors) => colors.forEach((c) => jobs.push([type, c]));
add("sheets", ["white", "brown"]); add("ruled", ["blue"]); add("graph", ["green"]); add("sticky", ["yellow", "multi"]);
add("card", ["blue"]); add("booklet", ["blue"]); add("notebook", ["blue", "red", "green", "orange", "black"]); add("spiral", ["blue", "red"]);
add("file", ["blue", "red", "green"]); add("folder", ["blue", "green"]); add("binder", ["blue", "black"]); add("envelope", ["brown", "white"]);
add("bag", ["blue", "green"]); add("display", ["blue", "black"]); add("tabs", ["multi"]); add("cover", ["blue"]); add("strip", ["blue"]);
for (const t of ["pen", "marker"]) add(t, ["blue", "black", "red", "green"]);
add("pencil", ["yellow", "black"]); add("highlighter", ["yellow", "pink", "green", "orange", "blue", "multi"]);
add("eraser", ["white", "blue"]); add("sharpener", ["blue", "red"]); add("pencilset", ["multi"]); add("boxset", ["multi"]); add("crayon", ["multi"]);
add("bottle", ["blue"]); add("tape", ["white", "brown"]); add("glue", ["blue", "red"]); add("tube", ["white", "red"]);
for (const t of ["stapler", "pins", "clip", "bclip", "rubber", "scissors", "ruler", "setsquare", "protractor", "compass", "geobox", "calc", "punch", "tack", "penstand", "label", "lanyard", "board", "box"]) add(t, ["blue", "red"]);

mkdirSync("public/products", { recursive: true });
for (const [type, color] of jobs) {
  const [c, l] = COLORS[color];
  writeFileSync(`public/products/${type}-${color}.svg`, wrap(T[type](c, l)));
}
console.log(`wrote ${jobs.length} images`);
