/**
 * docs/10-implementation-plan.md task 6.7, docs/07 §4 "PWA" — makes the
 * static export an installable, offline-capable web app. Runs last in
 * `npm run export:web`, because the service worker lists the files the
 * export produced:
 *
 *  - icons: `/icons/icon-{192,512}.png` (the dial on transparent),
 *    `icon-maskable-512.png` (full-bleed canvas, the dial inside the 80 %
 *    safe circle) and `apple-touch-icon.png` (iOS ignores the manifest's);
 *  - `/manifest.webmanifest`: standalone, start at the list, colours from
 *    the light theme (the manifest takes one; the page's `theme-color`
 *    meta tags follow the scheme);
 *  - `/sw.js`: precaches the app shell (the three app routes, every JS
 *    chunk — the city dataset and search names are chunks — the fonts and
 *    the map raster) under a cache named by a hash of the whole list, so a
 *    new deploy is a new cache and the old one is dropped on activation.
 *
 *   npx tsx scripts/build-pwa.ts dist
 */
import { Resvg } from "@resvg/resvg-js"
import { createHash } from "node:crypto"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { dialSvg } from "./lib/dial"
import en from "../src/i18n/en"
import { colors } from "../src/theme/colors"

const dist = path.resolve(process.argv[2] ?? "dist")

/** Where the maskable icon's dial sits: inside the 80 % safe circle. */
const MASKABLE_SCALE = 0.72
/** iOS rounds the corners itself and shows no transparency. */
const APPLE_SCALE = 0.84

const ICONS = [
  { file: "icon-192.png", size: 192, purpose: "any" },
  { file: "icon-512.png", size: 512, purpose: "any" },
  { file: "icon-maskable-512.png", size: 512, purpose: "maskable" },
] as const

/** App routes: rendered empty and filled in by JS, so one copy serves any visitor. */
const SHELL_PAGES = ["/", "/clock", "/map"]
/** Dev-only or unused by the web app: not worth a byte of the install. */
const SKIP = [/\/stories-[^/]*\.js$/, /\/react-navigation\//, /\.routes\.json$/]

function renderPng(svg: string): Buffer {
  return new Resvg(svg).render().asPng()
}

function writeIcons() {
  mkdirSync(path.join(dist, "icons"), { recursive: true })
  const write = (file: string, svg: string) =>
    writeFileSync(path.join(dist, "icons", file), renderPng(svg))
  write("icon-192.png", dialSvg(192))
  write("icon-512.png", dialSvg(512))
  write(
    "icon-maskable-512.png",
    dialSvg(512, { background: colors.background, scale: MASKABLE_SCALE }),
  )
  write("apple-touch-icon.png", dialSvg(180, { background: colors.background, scale: APPLE_SCALE }))
}

function writeManifest() {
  const manifest = {
    id: "/",
    name: en.common.appTitle,
    short_name: en.common.appName,
    description: en.common.appDescription,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: colors.background,
    theme_color: colors.background,
    icons: ICONS.map((icon) => ({
      src: `/icons/${icon.file}`,
      sizes: `${icon.size}x${icon.size}`,
      type: "image/png",
      purpose: icon.purpose,
    })),
  }
  writeFileSync(path.join(dist, "manifest.webmanifest"), JSON.stringify(manifest, null, 2) + "\n")
}

function listFiles(dir: string): string[] {
  return readdirSync(path.join(dist, dir), { recursive: true, encoding: "utf8" })
    .map((entry) => `/${dir}/${entry.split(path.sep).join("/")}`)
    .filter((url) => path.extname(url) !== "" && !SKIP.some((re) => re.test(url)))
}

function writeServiceWorker() {
  const assets = [
    ...listFiles("_expo"),
    ...listFiles("assets"),
    ...listFiles("icons"),
    "/manifest.webmanifest",
    "/favicon.ico",
  ].sort()
  const hash = createHash("sha256")
  for (const page of SHELL_PAGES) {
    hash.update(readFileSync(path.join(dist, page === "/" ? "index.html" : `${page}.html`)))
  }
  for (const url of assets) hash.update(url)
  const version = hash.digest("hex").slice(0, 12)

  const source = readFileSync(path.join(__dirname, "lib", "sw.template.js"), "utf8")
    .replace(/^\/\* global .*\n/, "")
    .replace("__VERSION__", JSON.stringify(version))
    .replace("__SHELL_PAGES__", JSON.stringify(SHELL_PAGES))
    .replace("__ASSETS__", JSON.stringify(assets))
  writeFileSync(path.join(dist, "sw.js"), source)

  const bytes = [...SHELL_PAGES.map((p) => (p === "/" ? "/index.html" : `${p}.html`)), ...assets]
    .map((url) => readFileSync(path.join(dist, url)).length)
    .reduce((a, b) => a + b, 0)
  console.log(
    `✓ PWA: manifest, ${ICONS.length + 1} icons, sw.js v${version} precaching ` +
      `${SHELL_PAGES.length + assets.length} files (${(bytes / 1024 / 1024).toFixed(1)} MB before compression)`,
  )
}

writeIcons()
writeManifest()
writeServiceWorker()
