const sass = require('node-sass');


let result = sass.renderSync({
  file: './src/user-widget/widget-1.css',
  outputStyle: 'compressed'
});

console.log('Below is the 1st widget');
console.log('=======================');
console.log(result.css.toString().replace(/"/g, '\\"'));
console.log('=======================\n');
