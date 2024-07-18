const zl = require('zip-lib');
const fs = require('fs-extra');
const path = require('path');

const theme_folders = ['layouts', 'sections', 'locales', 'snippets', 'assets', 'config', 'templates'];
const themes_path = path.resolve(__dirname, '..', 'themes');
const themes_dist = path.resolve(__dirname, '..', 'dist');
const themes = fs.readdirSync(themes_path);

themes.forEach(theme => {
  const currentDate = new Date();
  const day = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const theme_path = path.resolve(themes_path, theme);
  const theme_dist_path = path.resolve(themes_dist, `${theme}_${day}-${month}-${year}.zip`)
  const zip = new zl.Zip();

  theme_folders.forEach(folder => {
    zip.addFolder(path.resolve(theme_path, folder), folder);
  });

  fs.ensureDirSync(themes_dist);

  zip.archive(theme_dist_path).then(() => {
    console.log(`Successfully zipped ${theme}`);
  });
});
