/**
 * Generates all Android launcher icons and splash screen PNGs from SVG.
 * Design: minimal clock face (10:10 pose) + "DR" monogram, white on #0a0a0a.
 * Run: node scripts/generate-assets.mjs
 */

import { Resvg } from "@resvg/resvg-js"
import { writeFileSync, mkdirSync } from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")
const ANDROID_RES = path.join(ROOT, "android/app/src/main/res")
const RESOURCES = path.join(ROOT, "resources")

const f = (n) => parseFloat(n.toFixed(1))

// ─── SVG clock-face builder ───────────────────────────────────────────────
// cx, cy  : center of clock
// r       : radius of outer ring
// bgColor : fill rect colour ("none"/null = transparent)
// showText: include "DR" monogram
function clockFace(cx, cy, r, bgColor = null, showText = true) {
  const sw = r * 0.067           // ring stroke width
  const rInner = r - sw * 0.5   // inner edge of ring
  const majorLen = r * 0.115
  const minorLen = r * 0.07

  // 12 tick marks
  let ticks = ""
  for (let h = 0; h < 12; h++) {
    const a = (h * 30 * Math.PI) / 180
    const isMajor = h % 3 === 0
    const len = isMajor ? majorLen : minorLen
    const tsw = isMajor ? sw * 0.68 : sw * 0.43
    const x1 = f(cx + rInner * Math.sin(a))
    const y1 = f(cy - rInner * Math.cos(a))
    const x2 = f(cx + (rInner - len) * Math.sin(a))
    const y2 = f(cy - (rInner - len) * Math.cos(a))
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="white" stroke-width="${f(tsw)}" stroke-linecap="round"/>`
  }

  // 10:10 hands (classic watch-face pose)
  const ha = (300 * Math.PI) / 180  // hour  → 10 o'clock
  const ma = (60 * Math.PI) / 180   // minute→  2 o'clock
  const hLen = r * 0.60
  const mLen = r * 0.82

  const bg = bgColor ? `<rect width="100%" height="100%" fill="${bgColor}"/>` : ""
  const text = showText
    ? `<text x="${cx}" y="${f(cy + r * 0.44)}" text-anchor="middle"
         font-family="Arial, Helvetica, sans-serif" font-weight="900"
         font-size="${f(r * 0.32)}" letter-spacing="${f(r * 0.062)}"
         fill="white">DR</text>`
    : ""

  return `${bg}
  <circle cx="${cx}" cy="${cy}" r="${r}" stroke="white" stroke-width="${f(sw)}" fill="none"/>
  ${ticks}
  <line x1="${cx}" y1="${cy}" x2="${f(cx + hLen * Math.sin(ha))}" y2="${f(cy - hLen * Math.cos(ha))}" stroke="white" stroke-width="${f(sw * 1.08)}" stroke-linecap="round"/>
  <line x1="${cx}" y1="${cy}" x2="${f(cx + mLen * Math.sin(ma))}" y2="${f(cy - mLen * Math.cos(ma))}" stroke="white" stroke-width="${f(sw * 0.75)}" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="${f(sw * 0.84)}" fill="white"/>
  ${text}`
}

// ─── Full icon SVG (dark background) ─────────────────────────────────────
function iconSVG(size, withBg) {
  const r = size * 0.352
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${clockFace(size / 2, size / 2, r, withBg ? "#0a0a0a" : null, true)}
</svg>`
}

// ─── Splash screen SVG ────────────────────────────────────────────────────
function splashSVG(w, h) {
  const r = Math.min(w, h) * 0.22
  const cy = h * 0.44
  const cx = w / 2
  const titleY = f(cy + r * 1.60)
  const titleSize = f(r * 0.40)
  const letterSpacing = f(r * 0.08)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="${w}" height="${h}" fill="#0a0a0a"/>
  ${clockFace(cx, cy, r, null, true)}
  <text x="${cx}" y="${titleY}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="300"
        font-size="${titleSize}" letter-spacing="${letterSpacing}"
        fill="white" opacity="0.55">DAILY ROUTINE</text>
</svg>`
}

// ─── PNG render helper ────────────────────────────────────────────────────
function toPng(svg, targetWidth) {
  return new Resvg(svg, { fitTo: { mode: "width", value: targetWidth } })
    .render()
    .asPng()
}

function toPngOriginal(svg) {
  return new Resvg(svg, { fitTo: { mode: "original" } })
    .render()
    .asPng()
}

function save(dir, file, data) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, file), data)
}

// ─── Launcher icons ───────────────────────────────────────────────────────
console.log("Generating launcher icons…")

const ICON_DENSITIES = {
  "mipmap-mdpi":    48,
  "mipmap-hdpi":    72,
  "mipmap-xhdpi":   96,
  "mipmap-xxhdpi":  144,
  "mipmap-xxxhdpi": 192,
}

for (const [density, size] of Object.entries(ICON_DENSITIES)) {
  const dir = path.join(ANDROID_RES, density)
  const full = toPng(iconSVG(512, true), size)   // with dark bg
  const fg   = toPng(iconSVG(512, false), size)  // transparent bg for adaptive
  save(dir, "ic_launcher.png", full)
  save(dir, "ic_launcher_round.png", full)
  save(dir, "ic_launcher_foreground.png", fg)
  console.log(`  ✓ ${density}: ${size}px`)
}

// ─── Splash screens ───────────────────────────────────────────────────────
console.log("Generating splash screens…")

const SPLASH_DENSITIES = {
  "drawable-port-mdpi":    [320,  480],
  "drawable-port-hdpi":    [480,  800],
  "drawable-port-xhdpi":   [720,  1280],
  "drawable-port-xxhdpi":  [1080, 1920],
  "drawable-port-xxxhdpi": [1440, 2560],
  "drawable-land-mdpi":    [480,  320],
  "drawable-land-hdpi":    [800,  480],
  "drawable-land-xhdpi":   [1280, 720],
  "drawable-land-xxhdpi":  [1920, 1080],
  "drawable-land-xxxhdpi": [2560, 1440],
  "drawable":              [1080, 1920],
}

for (const [density, [w, h]] of Object.entries(SPLASH_DENSITIES)) {
  const dir = path.join(ANDROID_RES, density)
  const png = toPngOriginal(splashSVG(w, h))
  save(dir, "splash.png", png)
  console.log(`  ✓ ${density}: ${w}×${h}`)
}

// ─── resources/ for future tooling ───────────────────────────────────────
console.log("Saving resources/…")
mkdirSync(RESOURCES, { recursive: true })
writeFileSync(path.join(RESOURCES, "icon.png"), toPng(iconSVG(1024, true), 1024))
writeFileSync(path.join(RESOURCES, "splash.png"), toPngOriginal(splashSVG(2732, 2732)))
console.log("  ✓ resources/icon.png (1024px)")
console.log("  ✓ resources/splash.png (2732×2732px)")

console.log("\n✓ All assets generated.")
