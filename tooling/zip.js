const zl = require("zip-lib");
const fs = require("fs-extra");
const path = require("path");
const postcss = require("postcss");
const nesting = require("postcss-nesting");

const FOLDERS = ["layouts", "sections", "locales", "snippets", "assets", "config", "templates"];
const ROOT = path.resolve(__dirname, "..");
const THEMES = path.join(ROOT, "themes");
const DIST = path.join(ROOT, "dist");

async function processCss(tempPath, originalPath) {
  const css = await fs.readFile(originalPath, "utf8");
  const result = await postcss([nesting]).process(css, { from: originalPath });
  await fs.writeFile(tempPath, result.css);
}

function hasPostCssConfig(themePath) {
  return fs.readdirSync(themePath).some((file) => file.startsWith("postcss.config."));
}

async function zipTheme(theme) {
  const themePath = path.join(THEMES, theme);

  // Read version from theme's package.json
  const packageJson = JSON.parse(fs.readFileSync(path.join(themePath, "package.json"), "utf8"));
  const version = packageJson.version;

  const output = path.join(DIST, `${theme}-v${version}.zip`);
  const zip = new zl.Zip();

  for (const folder of FOLDERS) {
    const folderPath = path.join(themePath, folder);

    if (folder === "assets") {
      if (!fs.existsSync(folderPath)) continue;

      for (const file of fs.readdirSync(folderPath)) {
        const src = path.join(folderPath, file);
        const zipPath = `assets/${file}`;

        if (file.endsWith(".css")) {
          if (hasPostCssConfig(themePath)) {
            zip.addFile(src, zipPath);
          } else {
            const temp = path.join(__dirname, `.tmp_${file}`);
            await processCss(temp, src);
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

// Support filtering themes via CLI args (e.g., pnpm run zip chameleon aura)
const themesToBuild =
  process.argv.slice(2).length > 0
    ? process.argv.slice(2)
    : fs.readdirSync(THEMES).filter((name) => fs.statSync(path.join(THEMES, name)).isDirectory());

(async () => {
  for (const theme of themesToBuild) {
    await zipTheme(theme);
  }
})();
