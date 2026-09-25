import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const CSS_URL = "https://cdn.hugeicons.com/font/hgi-stroke-rounded.css";
const FONT_URL = "https://cdn.hugeicons.com/font/hgi-stroke-rounded.woff2?t=1721855138058";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES = path.join(ROOT, "themes");
const SCAN_FOLDERS = ["sections", "snippets", "config", "templates", "layouts"];
const NOT_ICONS = new Set(["hgi-stroke", "hgi-stroke-rounded", "hgi-rounded", "hgi-subset"]);
const ICON_NAME = /hgi-[a-z0-9-]+/g;
const GLYPH_RULE = /\.hgi-stroke\.(hgi-[a-z0-9-]+):before\{content:"(.)"\}/gu;

async function download(url) {
  const response = await fetch(url);

  if (!response.ok) throw new Error(`${url} responded ${response.status}`);

  return response;
}

async function listFiles(folder, extensions, recursive) {
  const entries = await readdir(folder, { recursive, withFileTypes: true }).catch(() => []);

  return entries
    .filter((entry) => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

async function collectIconNames(themePath) {
  const files = [];

  for (const folder of SCAN_FOLDERS) {
    files.push(...(await listFiles(path.join(themePath, folder), [".liquid", ".json"], true)));
  }
  files.push(...(await listFiles(path.join(themePath, "assets"), [".js"], false)));

  const names = new Set();

  for (const file of files) {
    for (const [name] of (await readFile(file, "utf8")).matchAll(ICON_NAME)) {
      if (!NOT_ICONS.has(name)) names.add(name);
    }
  }

  return names;
}

function buildStylesheet(font, glyphs) {
  const rules = glyphs.map(([name, char]) => `.hgi-stroke.${name}:before{content:"${char}"}`).join("");

  return (
    '@charset "UTF-8";' +
    "@font-face{" +
    'font-family:"hgi-stroke-rounded";' +
    `src:url(data:font/woff2;base64,${font.toString("base64")}) format('woff2');` +
    "font-display:block" +
    "}" +
    ".hgi-stroke{" +
    'font-family:"hgi-stroke-rounded" !important;' +
    "font-style:normal;" +
    "-webkit-font-smoothing:antialiased;" +
    "-moz-osx-font-smoothing:grayscale;" +
    "position:relative" +
    "}" +
    ".hgi-stroke:after{opacity:.4;position:absolute;left:0}" +
    `${rules}\n`
  );
}

async function subsetTheme(theme, glyphMap, fullFont) {
  const themePath = path.join(THEMES, theme);

  if (!(await stat(themePath).catch(() => null))?.isDirectory()) throw new Error(`no theme at themes/${theme}`);

  const used = [...(await collectIconNames(themePath))].sort();
  const glyphs = used.filter((name) => glyphMap.has(name)).map((name) => [name, glyphMap.get(name)]);
  const missing = used.filter((name) => !glyphMap.has(name));

  const font = await subsetFont(fullFont, glyphs.map(([, char]) => char).join(""), { targetFormat: "woff2" });
  const output = path.join(themePath, "assets", "icons.css");

  await writeFile(output, buildStylesheet(font, glyphs), "utf8");

  console.log(`${theme}: ${glyphs.length} of ${glyphMap.size} icons kept`);
  if (missing.length) console.log(`  no glyph upstream (renders blank): ${missing.join(", ")}`);
  console.log(`  subset font: ${font.length.toLocaleString("en")} bytes, embedded as a data URI`);
  console.log(`  assets/icons.css: ${(await stat(output)).size.toLocaleString("en")} bytes`);
}

const themes = process.argv.slice(2);

if (!themes.length) {
  console.error("Usage: pnpm icons <theme> [theme...]");
  process.exit(1);
}

const css = (await (await download(CSS_URL)).text()).replace(/^\uFEFF/, "");
const glyphMap = new Map([...css.matchAll(GLYPH_RULE)].map(([, name, char]) => [name, char]));
const fullFont = Buffer.from(await (await download(FONT_URL)).arrayBuffer());

for (const theme of themes) {
  await subsetTheme(theme, glyphMap, fullFont);
}
