const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const del = require('del');
const copy = require('recursive-copy');


// if (process.argv.length < 3) {
//   console.error('Output directory is required. Normally it should point to jobdone-frontend-build repository clone');
//   return process.exit(1);
// }

// const outputDir = path.resolve(process.argv[2]);
const outputDir = path.resolve('./jobdone-frontend-build');
const inputDir = path.resolve('.');

try {
  fs.mkdirSync(path.join(outputDir, 'assets'));
} catch (e) {}

del.sync([path.join(outputDir, 'assets/**'), `!${path.join(outputDir, 'assets')}`]);
del.sync([path.join(outputDir, 'templates/**'), `!${path.join(outputDir, 'templates')}`]);

copy(path.join(inputDir, 'build'), path.join(outputDir, 'assets')).then((results) => {
  console.log(`Copied ${results.length} asset files`);
  return copy(path.join(inputDir, 'templates'), path.join(outputDir, 'templates'));
}).then((results) => {
  console.log(`Copied ${results.length} template files`);
  console.log('Done');
}).catch((err) => {
  console.error(err);
  return process.exit(1);
});