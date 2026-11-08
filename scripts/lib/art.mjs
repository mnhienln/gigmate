// Shared picture drawing for the seed scripts: SVG art that a headless browser turns into JPEGs.
// Poster palette, nothing realistic, no photos of anyone.

// ---------------------------------------------------------------------------------------------
// Picture drawing (SVG rendered by a headless browser). Poster palette, no photos of anyone.
// ---------------------------------------------------------------------------------------------
export function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const hash = (s) => Math.abs([...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7)); // always positive, so it is safe as a list index
export const PALETTES = [
  ["#f6e5bc", "#e4a52a", "#b8461a", "#8f2d1c", "#3b2314"], ["#3b2314", "#e4a52a", "#f6e5bc", "#b8461a", "#8f2d1c"],
  ["#12263a", "#f2c14e", "#e4572e", "#17bebb", "#f6e5bc"], ["#2b1a10", "#d4a373", "#faedcd", "#e63946", "#a8dadc"],
  ["#1d3557", "#a8dadc", "#f1faee", "#e63946", "#457b9d"], ["#22223b", "#c9ada7", "#f2e9e4", "#9a8c98", "#e4a52a"],
];
export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];

export function svgWrap(size, body, bg) {
  return `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${bg}"/>${body}</svg></body></html>`;
}
export function artSunburst(r, p, S) {
  const cx = S * (0.35 + r() * 0.3), cy = S * (0.4 + r() * 0.25), rays = 14 + Math.floor(r() * 10);
  let b = "";
  for (let i = 0; i < rays; i++) {
    const a1 = (i / rays) * Math.PI * 2, a2 = ((i + 0.5) / rays) * Math.PI * 2, L = S * 1.6;
    b += `<polygon points="${cx},${cy} ${cx + Math.cos(a1) * L},${cy + Math.sin(a1) * L} ${cx + Math.cos(a2) * L},${cy + Math.sin(a2) * L}" fill="${p[1 + (i % 2)]}" opacity="0.85"/>`;
  }
  b += `<circle cx="${cx}" cy="${cy}" r="${S * 0.17}" fill="${p[3]}"/><circle cx="${cx}" cy="${cy}" r="${S * 0.09}" fill="${p[0]}"/>`;
  return svgWrap(S, b, p[4]);
}
export function artStage(r, p, S) {
  let b = `<rect y="${S * 0.72}" width="${S}" height="${S * 0.28}" fill="${p[3]}"/>`;
  for (let i = 0; i < 3; i++) {
    const x = S * (0.2 + i * 0.3 + (r() - 0.5) * 0.08);
    b += `<polygon points="${x - 14},0 ${x + 14},0 ${x + S * 0.2},${S * 0.78} ${x - S * 0.2},${S * 0.78}" fill="${p[1]}" opacity="${0.28 + r() * 0.2}"/>`;
  }
  for (let i = 0; i < 4; i++) {
    const x = S * (0.18 + i * 0.2 + (r() - 0.5) * 0.05), h = S * (0.16 + r() * 0.1);
    b += `<circle cx="${x}" cy="${S * 0.72 - h - 22}" r="22" fill="${p[0]}"/><rect x="${x - 26}" y="${S * 0.72 - h}" width="52" height="${h}" rx="18" fill="${p[0]}"/>`;
  }
  b += `<ellipse cx="${S / 2}" cy="${S * 0.8}" rx="${S * 0.4}" ry="${S * 0.05}" fill="${p[2]}" opacity="0.6"/>`;
  return svgWrap(S, b, p[4]);
}
export function artVinyl(r, p, S) {
  const cx = S * (0.4 + r() * 0.2), cy = S * (0.4 + r() * 0.2), R = S * 0.42;
  let b = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${p[4]}" stroke="${p[0]}" stroke-width="6"/>`;
  for (let i = 1; i <= 9; i++) b += `<circle cx="${cx}" cy="${cy}" r="${R - i * 18}" fill="none" stroke="${p[0]}" stroke-width="2" opacity="0.35"/>`;
  b += `<circle cx="${cx}" cy="${cy}" r="${R * 0.3}" fill="${p[2]}"/><circle cx="${cx}" cy="${cy}" r="10" fill="${p[0]}"/>`;
  b += `<rect x="${S * 0.62}" y="${S * 0.7}" width="${S * 0.3}" height="${S * 0.18}" fill="${p[1]}" transform="rotate(-8 ${S * 0.77} ${S * 0.79})"/>`;
  return svgWrap(S, b, p[0]);
}
export function artWaves(r, p, S) {
  let b = "";
  for (let i = 0; i < 9; i++) {
    const y = S * (0.1 + i * 0.1), amp = 20 + r() * 50, ph = r() * 6;
    let d = `M0 ${y}`;
    for (let x = 0; x <= S; x += 20) d += ` L${x} ${y + Math.sin(x / 90 + ph) * amp}`;
    d += ` L${S} ${S} L0 ${S} Z`;
    b += `<path d="${d}" fill="${p[(i + 1) % 5]}" opacity="${0.55 + (i % 3) * 0.15}"/>`;
  }
  return svgWrap(S, b, p[4]);
}
export function artGrid(r, p, S) {
  const n = 5, c = S / n;
  let b = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const col = pick(r, p), t = r();
    b += t < 0.5 ? `<rect x="${x * c + 6}" y="${y * c + 6}" width="${c - 12}" height="${c - 12}" rx="${r() * 30}" fill="${col}"/>` : `<circle cx="${x * c + c / 2}" cy="${y * c + c / 2}" r="${c / 2 - 8}" fill="${col}"/>`;
  }
  return svgWrap(S, b, p[4]);
}
export const POST_STYLES = [artSunburst, artStage, artVinyl, artWaves, artGrid];

export function artAvatar(r, p, S, name) {
  const initials = name.replace(/[^A-Za-z& ]/g, "").split(/\s+/).filter((w) => w && w !== "&" && w.toLowerCase() !== "the").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const b = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient></defs>
    <rect width="${S}" height="${S}" fill="url(#g)"/><circle cx="${S * 0.8}" cy="${S * 0.2}" r="${S * 0.22}" fill="${p[0]}" opacity="0.3"/><circle cx="${S * 0.15}" cy="${S * 0.9}" r="${S * 0.3}" fill="${p[4]}" opacity="0.25"/>
    <text x="50%" y="56%" text-anchor="middle" dominant-baseline="middle" font-family="Georgia, serif" font-style="italic" font-weight="900" font-size="${S * 0.4}" fill="${p[4]}">${initials}</text>`;
  return svgWrap(S, b, p[0]);
}
export function artProduct(r, p, S, kind) {
  let b = "";
  const accent = pick(r, [p[1], p[2], p[3]]);
  if (kind === "tee") {
    b = `<path d="M${S * 0.3} ${S * 0.18} L${S * 0.1} ${S * 0.34} L${S * 0.22} ${S * 0.48} L${S * 0.3} ${S * 0.42} L${S * 0.3} ${S * 0.86} L${S * 0.7} ${S * 0.86} L${S * 0.7} ${S * 0.42} L${S * 0.78} ${S * 0.48} L${S * 0.9} ${S * 0.34} L${S * 0.7} ${S * 0.18} Q${S / 2} ${S * 0.3} ${S * 0.3} ${S * 0.18} Z" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S / 2}" cy="${S * 0.55}" r="${S * 0.1}" fill="${p[0]}"/><circle cx="${S / 2}" cy="${S * 0.55}" r="${S * 0.05}" fill="${p[4]}"/>`;
  } else if (kind === "vinyl") {
    b = `<rect x="${S * 0.18}" y="${S * 0.18}" width="${S * 0.64}" height="${S * 0.64}" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S * 0.5}" cy="${S * 0.5}" r="${S * 0.24}" fill="${p[4]}"/><circle cx="${S * 0.5}" cy="${S * 0.5}" r="${S * 0.08}" fill="${p[0]}"/>`;
  } else if (kind === "glass") {
    b = `<path d="M${S * 0.28} ${S * 0.16} L${S * 0.72} ${S * 0.16} L${S * 0.66} ${S * 0.84} Q${S / 2} ${S * 0.9} ${S * 0.34} ${S * 0.84} Z" fill="${p[0]}" stroke="${p[4]}" stroke-width="5"/><path d="M${S * 0.3} ${S * 0.3} L${S * 0.7} ${S * 0.3} L${S * 0.65} ${S * 0.82} Q${S / 2} ${S * 0.87} ${S * 0.35} ${S * 0.82} Z" fill="${accent}"/><circle cx="${S / 2}" cy="${S * 0.58}" r="${S * 0.07}" fill="${p[0]}"/>`;
  } else if (kind === "cap") {
    b = `<path d="M${S * 0.18} ${S * 0.6} Q${S * 0.18} ${S * 0.22} ${S / 2} ${S * 0.22} Q${S * 0.82} ${S * 0.22} ${S * 0.82} ${S * 0.6} Z" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><path d="M${S * 0.14} ${S * 0.6} L${S * 0.9} ${S * 0.6} Q${S * 0.94} ${S * 0.7} ${S * 0.7} ${S * 0.7} L${S * 0.14} ${S * 0.7} Z" fill="${p[4]}"/><circle cx="${S / 2}" cy="${S * 0.42}" r="${S * 0.07}" fill="${p[0]}"/>`;
  } else if (kind === "giftcard") {
    b = `<rect x="${S * 0.12}" y="${S * 0.26}" width="${S * 0.76}" height="${S * 0.48}" rx="22" fill="${accent}" stroke="${p[4]}" stroke-width="5" transform="rotate(-6 ${S / 2} ${S / 2})"/><rect x="${S * 0.12}" y="${S * 0.38}" width="${S * 0.76}" height="${S * 0.08}" fill="${p[4]}" transform="rotate(-6 ${S / 2} ${S / 2})"/><circle cx="${S * 0.7}" cy="${S * 0.6}" r="${S * 0.07}" fill="${p[0]}" transform="rotate(-6 ${S / 2} ${S / 2})"/>`;
  } else if (kind === "tote") {
    b = `<path d="M${S * 0.36} ${S * 0.3} Q${S * 0.36} ${S * 0.1} ${S / 2} ${S * 0.1} Q${S * 0.64} ${S * 0.1} ${S * 0.64} ${S * 0.3}" fill="none" stroke="${p[4]}" stroke-width="12"/><rect x="${S * 0.22}" y="${S * 0.3}" width="${S * 0.56}" height="${S * 0.56}" rx="8" fill="${accent}" stroke="${p[4]}" stroke-width="5"/><circle cx="${S / 2}" cy="${S * 0.58}" r="${S * 0.1}" fill="${p[0]}"/>`;
  } else {
    b = `<circle cx="${S / 2}" cy="${S / 2}" r="${S * 0.32}" fill="${accent}" stroke="${p[0]}" stroke-width="14"/><polygon points="${S / 2},${S * 0.3} ${S * 0.56},${S * 0.46} ${S * 0.72},${S * 0.46} ${S * 0.59},${S * 0.56} ${S * 0.64},${S * 0.72} ${S / 2},${S * 0.62} ${S * 0.36},${S * 0.72} ${S * 0.41},${S * 0.56} ${S * 0.28},${S * 0.46} ${S * 0.44},${S * 0.46}" fill="${p[0]}"/>`;
  }
  return svgWrap(S, b, p[0] === accent ? p[3] : p[0]);
}

