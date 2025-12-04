const zl = require("zip-lib");
const fs = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const nesting = require("postcss-nesting");

const FOLDERS = ["layouts", "sections", "locales", "snippets", "assets", "config", "templates"];
const ROOT = path.resolve(__dirname, "..");
const THEMES = path.join(ROOT, "themes");
const DIST = path.join(ROOT, "dist");

async function processCSS(tempPath, originalPath) {
  const css = await fs.readFile(originalPath, "utf8");
  const result = await postcss([nesting]).process(css, { from: originalPath });
  await fs.writeFile(tempPath, result.css);
}

function hasPostCSSConfig(themePath) {
  return fs.readdirSync(themePath).some((file) => file.startsWith("postcss.config."));
}

async function zipTheme(theme) {
  const themePath = path.join(THEMES, theme);
  const output = path.join(DIST, `${theme}_${getCurrentDate()}.zip`);
  const zip = new zl.Zip();

  for (const folder of FOLDERS) {
    const folderPath = path.join(themePath, folder);

    if (folder === "assets") {
      if (!fs.existsSync(folderPath)) continue;

      for (const file of fs.readdirSync(folderPath)) {
        const src = path.join(folderPath, file);
        const zipPath = `assets/${file}`;

        if (file.endsWith(".css")) {
          if (hasPostCSSConfig(themePath)) {
            zip.addFile(src, zipPath);
          } else {
            const temp = path.join(__dirname, `.tmp_${file}`);
            await processCSS(temp, src);
            zip.addFile(temp, zipPath);
          }
        } else {
          zip.addFile(src, zipPath);
        }
      }
    } else {
      zip.addFolder(folderPath, folder);
    }
  }

  await fs.ensureDir(DIST);
  await zip.archive(output);

  fs.readdirSync(__dirname)
    .filter((f) => f.startsWith(".tmp_"))
    .forEach((f) => fs.removeSync(path.join(__dirname, f)));

  console.log(`Successfully zipped: ${theme}`);
}

function getCurrentDate() {
  const date = new Date();
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

fs.readdirSync(THEMES)
  .filter((name) => fs.statSync(path.join(THEMES, name)).isDirectory())
  .forEach((theme) => zipTheme(theme));
